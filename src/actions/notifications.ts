"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

/**
 * Extracts mentioned user IDs from Tiptap HTML output.
 * Tiptap mentions are formatted as:
 * <span class="mention" data-type="mention" data-id="[userId]">@name</span>
 */
function extractUserMentions(html: string): string[] {
  if (!html) return []
  const ids: string[] = []

  const regex = /<span\s+([^>]+)>/g
  let match
  while ((match = regex.exec(html)) !== null) {
    const attrs = match[1]
    const isMention = attrs.includes('class="mention"') || attrs.includes("class='mention'") || attrs.includes('data-type="mention"') || attrs.includes("data-type='mention'")
    if (isMention) {
      const idMatch = attrs.match(/data-id=["']([^"']+)["']/)
      if (idMatch && idMatch[1]) {
        const userId = idMatch[1]
        if (!ids.includes(userId)) {
          ids.push(userId)
        }
      }
    }
  }
  return ids
}

/**
 * Automatically dynamically generates DUE_SOON notifications.
 * Runs in real-time when the active user queries their notifications.
 */
async function checkDueSoonNotifications(userId: string) {
  try {
    // Find all incomplete tasks assigned to the user that have a due date
    const activeAssignments = await prisma.taskAssignment.findMany({
      where: {
        userId,
        task: {
          status: { notIn: ["DONE", "COMPLETED"] },
          dueDate: { not: null }
        }
      },
      include: {
        task: true
      }
    })

    const now = new Date()
    const threeDaysFromNow = new Date()
    threeDaysFromNow.setDate(now.getDate() + 3)

    for (const assignment of activeAssignments) {
      const task = assignment.task
      if (!task.dueDate) continue

      const dueDate = new Date(task.dueDate)

      // If task is due in 3 days (or overdue)
      if (dueDate <= threeDaysFromNow) {
        const link = `/projects/${task.projectId}/sprints/${task.sprintId || 'backlog'}?taskId=${task.id}`

        // Check if a DUE_SOON notification already exists for this task and user
        const existing = await prisma.notification.findFirst({
          where: {
            userId,
            type: "DUE_SOON",
            link
          }
        })

        if (!existing) {
          const diffTime = dueDate.getTime() - now.getTime()
          const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          const isOverdue = daysLeft < 0

          let title = "Task Due Soon"
          let content = `Your assigned task "${task.title}" is due in ${daysLeft} days.`

          if (isOverdue) {
            title = "Task Overdue!"
            content = `Your assigned task "${task.title}" is overdue by ${Math.abs(daysLeft)} days!`
          } else if (daysLeft === 0) {
            title = "Task Due Today!"
            content = `Your assigned task "${task.title}" is due today!`
          }

          await prisma.notification.create({
            data: {
              userId,
              type: "DUE_SOON",
              title,
              content,
              link
            }
          })
        }
      }
    }
  } catch (error) {
    console.error("checkDueSoonNotifications error:", error)
  }
}

/**
 * Fetch paginated notifications for the current authenticated user.
 */
export async function getNotifications(
  page = 1,
  limit = 10,
  unreadOnly = false,
  typeFilter?: string,
  searchQuery?: string
) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) {
      return { success: false, error: "Unauthorized", notifications: [], total: 0, unreadCount: 0, totalPages: 0 }
    }

    // Dynmically create/update due-soon notifications
    await checkDueSoonNotifications(userId)

    const skip = (page - 1) * limit

    // Construct robust search and filter clause
    const whereClause: any = { userId }
    if (unreadOnly) {
      whereClause.isViewed = false
    }
    if (typeFilter && typeFilter !== "all" && typeFilter !== "unread") {
      whereClause.type = typeFilter
    }
    if (searchQuery && searchQuery.trim()) {
      whereClause.OR = [
        { title: { contains: searchQuery, mode: 'insensitive' } },
        { content: { contains: searchQuery, mode: 'insensitive' } }
      ]
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit
      }),
      prisma.notification.count({ where: whereClause })
    ])

    const unreadCount = await prisma.notification.count({
      where: { userId, isViewed: false }
    })

    return {
      success: true,
      notifications,
      total,
      unreadCount,
      totalPages: Math.ceil(total / limit)
    }
  } catch (error) {
    console.error("getNotifications error:", error)
    return { success: false, error: "Failed to fetch notifications", notifications: [], total: 0, unreadCount: 0, totalPages: 0 }
  }
}

/**
 * Mark a single notification as viewed/read.
 */
export async function markNotificationAsViewed(id: string) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return { success: false, error: "Unauthorized" }

    await prisma.notification.update({
      where: { id, userId },
      data: { isViewed: true }
    })

    revalidatePath("/", "layout")
    return { success: true }
  } catch (error) {
    console.error("markNotificationAsViewed error:", error)
    return { success: false, error: "Failed to update notification" }
  }
}

/**
 * Mark all unread notifications as viewed/read.
 */
export async function markAllNotificationsAsViewed() {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return { success: false, error: "Unauthorized" }

    await prisma.notification.updateMany({
      where: { userId, isViewed: false },
      data: { isViewed: true }
    })

    revalidatePath("/", "layout")
    return { success: true }
  } catch (error) {
    console.error("markAllNotificationsAsViewed error:", error)
    return { success: false, error: "Failed to update notifications" }
  }
}

/**
 * Create MENTION notifications for users tagged in HTML text editor content.
 */
export async function notifyMentions({
  html,
  actorId,
  taskId,
  documentId,
  sprintId,
  projectId,
  contextType,
  commentId
}: {
  html: string
  actorId: string
  taskId?: string
  documentId?: string
  sprintId?: string
  projectId?: string
  contextType: "TASK_DESCRIPTION" | "TASK_COMMENT" | "TIMELINE_COMMENT" | "DOCUMENTATION" | "SPRINT_ACTIVITY"
  commentId?: string
}) {
  try {
    const mentionedUserIds = extractUserMentions(html)
    if (mentionedUserIds.length === 0) return

    const actor = await prisma.user.findUnique({
      where: { id: actorId },
      select: { name: true }
    })
    const actorName = actor?.name || "Someone"

    let link = ""
    let contextTitle = ""

    if (taskId) {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        select: { title: true, projectId: true, sprintId: true }
      })
      if (task) {
        contextTitle = task.title
        const projId = projectId || task.projectId
        const sprId = sprintId || task.sprintId || "backlog"
        link = `/projects/${projId}/sprints/${sprId}?taskId=${taskId}`
        if (contextType === "TASK_DESCRIPTION") {
          link += "&highlight=description"
        } else if (contextType === "TASK_COMMENT" && commentId) {
          link += `&highlight=comment-${commentId}`
        } else if (contextType === "TIMELINE_COMMENT" && commentId) {
          link += `&highlight=log-comment-${commentId}`
        }
      }
    } else if (documentId) {
      const doc = await prisma.document.findUnique({
        where: { id: documentId },
        select: { title: true, projectId: true }
      })
      if (doc) {
        contextTitle = doc.title
        link = `/documentation/${documentId}?highlight=document`
      }
    } else if (contextType === "SPRINT_ACTIVITY" && commentId && projectId && sprintId) {
      link = `/projects/${projectId}/sprints/${sprintId}?tab=activity&highlight=comment-${commentId}`
    }

    let title = "Mentioned You"
    let content = `${actorName} mentioned you.`

    switch (contextType) {
      case "TASK_DESCRIPTION":
        title = "Mentioned in Task"
        content = `${actorName} mentioned you in the description of "${contextTitle || 'Task'}"`
        break
      case "TASK_COMMENT":
        title = "Mentioned in Comment"
        content = `${actorName} mentioned you in a comment on "${contextTitle || 'Task'}"`
        break
      case "TIMELINE_COMMENT":
        title = "Mentioned in Timeline"
        content = `${actorName} mentioned you in a timeline log comment on "${contextTitle || 'Task'}"`
        break
      case "DOCUMENTATION":
        title = "Mentioned in Document"
        content = `${actorName} mentioned you in the Doc "${contextTitle || 'Document'}"`
        break
      case "SPRINT_ACTIVITY":
        title = "Mentioned in Sprint"
        content = `${actorName} mentioned you in a sprint activity comment`
        break
    }

    for (const userId of mentionedUserIds) {
      if (userId === actorId) continue // Don't notify yourself

      await prisma.notification.create({
        data: {
          userId,
          type: "MENTION",
          title,
          content,
          link
        }
      })
    }
  } catch (error) {
    console.error("notifyMentions error:", error)
  }
}

/**
 * Create ASSIGNED notifications for users newly assigned to tasks.
 */
export async function notifyTaskAssignment({
  taskId,
  addedUserIds,
  actorId,
  taskTitle
}: {
  taskId: string
  addedUserIds: string[]
  actorId?: string
  taskTitle?: string
}) {
  try {
    if (addedUserIds.length === 0) return

    let resolvedTitle = taskTitle
    let resolvedProjectId = ""
    let resolvedSprintId = ""

    if (!resolvedTitle || !resolvedProjectId) {
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        select: { title: true, projectId: true, sprintId: true }
      })
      if (task) {
        resolvedTitle = task.title
        resolvedProjectId = task.projectId
        resolvedSprintId = task.sprintId || ""
      }
    }

    const actor = actorId
      ? await prisma.user.findUnique({ where: { id: actorId }, select: { name: true } })
      : null
    const actorName = actor?.name || "Someone"

    const link = `/projects/${resolvedProjectId}/sprints/${resolvedSprintId || 'backlog'}?taskId=${taskId}`

    for (const userId of addedUserIds) {
      if (userId === actorId) continue // Don't notify yourself

      await prisma.notification.create({
        data: {
          userId,
          type: "ASSIGNED",
          title: "Assigned to Task",
          content: `${actorName} assigned you to the task "${resolvedTitle || 'Untitled Task'}"`,
          link
        }
      })
    }
  } catch (error) {
    console.error("notifyTaskAssignment error:", error)
  }
}

/**
 * Creates TASK_CHANGED notifications for all participating/present users on a task.
 * Participating users are: assignees, reporter, and anyone who commented.
 */
export async function notifyTaskChanges({
  taskId,
  actorId,
  changeDetails
}: {
  taskId: string
  actorId: string
  changeDetails: string
}) {
  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { title: true, projectId: true, sprintId: true, creatorId: true }
    })
    if (!task) return

    const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { name: true } })
    const actorName = actor?.name || "Someone"

    const participatingUserIds = new Set<string>()

    // 1. Assignees
    const assignments = await prisma.taskAssignment.findMany({
      where: { taskId },
      select: { userId: true }
    })
    assignments.forEach(a => participatingUserIds.add(a.userId))

    // 2. Reporter
    if (task.creatorId) {
      participatingUserIds.add(task.creatorId)
    }

    // 3. Commenters
    const comments = await prisma.comment.findMany({
      where: { taskId },
      select: { userId: true }
    })
    comments.forEach(c => participatingUserIds.add(c.userId))

    // 4. Audit Log Commenters
    const auditLogs = await prisma.auditLog.findMany({
      where: { taskId },
      select: { comments: { select: { userId: true } } }
    })
    auditLogs.forEach(log => {
      log.comments.forEach(c => participatingUserIds.add(c.userId))
    })

    // Don't notify the actor who made the changes
    participatingUserIds.delete(actorId)

    if (participatingUserIds.size === 0) return

    const link = `/projects/${task.projectId}/sprints/${task.sprintId || 'backlog'}?taskId=${taskId}`

    for (const userId of participatingUserIds) {
      await prisma.notification.create({
        data: {
          userId,
          type: "TASK_CHANGED",
          title: "Task Updated",
          content: `${actorName} updated "${task.title}": ${changeDetails}`,
          link
        }
      })
    }
  } catch (error) {
    console.error("notifyTaskChanges error:", error)
  }
}
