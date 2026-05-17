"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { TaskAssignmentRole } from "@prisma/client"
import { auth } from "@/auth"
import { notifyMentions, notifyTaskAssignment, notifyTaskUnassignment } from "./notifications"
import { unstable_noStore as noStore } from "next/cache"

export async function createTask(data: {
  title: string
  description?: string
  projectId: string
  creatorId?: string
  parentId?: string
  status?: string
  points?: number
  assignments?: Array<{ userId: string; role: TaskAssignmentRole }>
  sprintId?: string
  dueDate?: Date
}) {
  try {
    const session = await auth()
    const currentUserId = session?.user?.id

    let creatorId = data.creatorId
    if (!creatorId || creatorId === "system") {
      let systemUser = await prisma.user.findFirst({ where: { email: "system@Zeta.local" } })
      if (!systemUser) {
        systemUser = await prisma.user.create({
          data: { name: "System", email: "system@Zeta.local" }
        })
      }
      creatorId = systemUser.id
    }

    const result = await prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          title: data.title,
          description: data.description,
          projectId: data.projectId,
          creatorId,
          status: data.status || "BACKLOG",
          points: data.points,
          sprintId: data.sprintId || null,
          dueDate: data.dueDate,
          assignments: {
            create: data.assignments?.map(a => ({
              userId: a.userId,
              role: a.role
            }))
          }
        },
      })

      await tx.taskClosure.create({
        data: { ancestorId: task.id, descendantId: task.id, depth: 0 },
      })

      if (data.parentId) {
        const parentAncestors = await tx.taskClosure.findMany({
          where: { descendantId: data.parentId },
        })

        const newClosures = parentAncestors.map((ancestor) => ({
          ancestorId: ancestor.ancestorId,
          descendantId: task.id,
          depth: ancestor.depth + 1,
        }))

        if (newClosures.length > 0) {
          await tx.taskClosure.createMany({ data: newClosures })
        }
      }

      // Log creation
      if (currentUserId) {
        await tx.auditLog.create({
          data: {
            action: "CREATE_TASK",
            details: `Task created with status ${data.status || "BACKLOG"}`,
            userId: currentUserId,
            taskId: task.id
          }
        })
      }

      return task
    })

    // Trigger task creation notifications
    if (result) {
      const actorId = currentUserId || "system"

      // 1. Task Assignments
      if (data.assignments && data.assignments.length > 0) {
        const addedUserIds = data.assignments.map(a => a.userId)
        await notifyTaskAssignment({
          taskId: result.id,
          addedUserIds,
          actorId,
          taskTitle: result.title
        })
      }

      // 2. Description Mentions
      if (data.description) {
        await notifyMentions({
          html: data.description,
          actorId,
          taskId: result.id,
          contextType: "TASK_DESCRIPTION"
        })
      }
    }

    revalidatePath(`/projects/${data.projectId}`)
    revalidatePath("/", "layout")
    return { success: true, task: result }
  } catch (error) {
    console.error(error)
    return { success: false, error: "Failed to create task" }
  }
}

export async function updateTask(taskId: string, data: {
  title?: string
  description?: string
  status?: string
  points?: number | null
  sprintId?: string | null
  dueDate?: Date | null
  creatorId?: string
  projectId: string
}) {
  try {
    const session = await auth()
    const userId = session?.user?.id

    // Fetch old task for logging
    const oldTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        sprint: true,
        reporter: { select: { name: true } }
      }
    })

    if (!oldTask) return { success: false, error: "Task not found" }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        title: data.title,
        description: data.description,
        status: data.status,
        points: data.points,
        sprintId: data.sprintId,
        dueDate: data.dueDate,
        creatorId: data.creatorId
      },
      include: {
        sprint: true,
        reporter: { select: { name: true } }
      }
    })

    // Log changes
    if (userId) {
      const changes: string[] = []
      if (data.title && data.title !== oldTask.title)
        changes.push(`Title changed from "${oldTask.title}" to "${data.title}"`)
      if (data.status && data.status !== oldTask.status)
        changes.push(`Status changed from ${oldTask.status} to ${data.status}`)
      if (data.points !== undefined && data.points !== oldTask.points)
        changes.push(`Complexity changed from ${oldTask.points ?? "None"} to ${data.points ?? "None"}`)
      if (data.sprintId !== undefined && data.sprintId !== oldTask.sprintId)
        changes.push(`Sprint changed from ${oldTask.sprint?.name ?? "Backlog"} to ${updatedTask.sprint?.name ?? "Backlog"}`)
      if (data.dueDate !== undefined && data.dueDate?.toString() !== oldTask.dueDate?.toString())
        changes.push(`Due date changed from ${oldTask.dueDate ? new Date(oldTask.dueDate).toLocaleDateString() : "None"} to ${data.dueDate ? new Date(data.dueDate).toLocaleDateString() : "None"}`)
      if (data.creatorId && data.creatorId !== oldTask.creatorId) {
        changes.push(`Reporter changed from ${oldTask.reporter?.name || "Unknown"} to ${updatedTask.reporter?.name || "Unknown"}`)
      }

      if (changes.length > 0) {
        await prisma.auditLog.create({
          data: {
            action: "UPDATE_TASK",
            details: changes.join("\n"),
            userId,
            taskId
          }
        })
      }
    }

    revalidatePath(`/projects/${data.projectId}`)
    revalidatePath(`/tasks/${taskId}`)
    revalidatePath("/", "layout")
    return { success: true }
  } catch (error) {
    console.error("updateTask error:", error)
    return { success: false, error: "Failed to update task" }
  }
}

export async function updateTaskAssignments(taskId: string, assignments: Array<{ userId: string; role: TaskAssignmentRole }>, projectId: string) {
  try {
    const session = await auth()
    const currentUserId = session?.user?.id

    const oldAssignments = await prisma.taskAssignment.findMany({
      where: { taskId },
      include: { user: { select: { name: true } } }
    })

    await prisma.$transaction(async (tx) => {
      // Remove all current assignments
      await tx.taskAssignment.deleteMany({
        where: { taskId }
      })

      // Add new ones
      if (assignments.length > 0) {
        await tx.taskAssignment.createMany({
          data: assignments.map(a => ({
            taskId,
            userId: a.userId,
            role: a.role
          }))
        })
      }
    })

    // Log changes
    if (currentUserId) {
      const newAssignments = await prisma.taskAssignment.findMany({
        where: { taskId },
        include: { user: { select: { name: true } } }
      })

      const removed = oldAssignments.filter(oa => !newAssignments.some(na => na.userId === oa.userId))
      const added = newAssignments.filter(na => !oldAssignments.some(oa => oa.userId === na.userId))
      const roleChanges = newAssignments.filter(na => {
        const old = oldAssignments.find(oa => oa.userId === na.userId)
        return old && old.role !== na.role
      })

      const logs: string[] = []
      removed.forEach(r => logs.push(`Removed ${r.user.name || "Unknown"} from task`))
      added.forEach(a => logs.push(`Added ${a.user.name || "Unknown"} as ${a.role}`))
      roleChanges.forEach(rc => {
        const old = oldAssignments.find(oa => oa.userId === rc.userId)
        logs.push(`Changed ${rc.user.name}'s role from ${old?.role} to ${rc.role}`)
      })

      if (logs.length > 0) {
        await prisma.auditLog.create({
          data: {
            action: "UPDATE_ASSIGNMENTS",
            details: logs.join("\n"),
            userId: currentUserId,
            taskId
          }
        })
      }

      if (added.length > 0) {
        await notifyTaskAssignment({
          taskId,
          addedUserIds: added.map(a => a.userId),
          actorId: currentUserId
        })
      }

      if (removed.length > 0) {
        await notifyTaskUnassignment({
          taskId,
          removedUserIds: removed.map(r => r.userId),
          actorId: currentUserId
        })
      }
    }

    revalidatePath(`/projects/${projectId}`)
    revalidatePath(`/tasks/${taskId}`)
    revalidatePath("/", "layout")
    return { success: true }
  } catch (error) {
    console.error("updateTaskAssignments error:", error)
    return { success: false, error: "Failed to update assignments" }
  }
}

export async function getTasksByProject(projectId: string) {
  try {
    const tasks = await prisma.task.findMany({
      where: { projectId },
      include: {
        assignments: {
          include: { user: { select: { id: true, name: true, email: true, image: true } } }
        }
      },
      orderBy: { createdAt: "desc" },
    })
    return { success: true, tasks }
  } catch (error) {
    return { success: false, error: "Failed to fetch tasks" }
  }
}

export async function updateTaskStatus(taskId: string, status: string, projectId: string) {
  try {
    const session = await auth()
    const currentUserId = session?.user?.id

    const oldTask = await prisma.task.findUnique({
      where: { id: taskId },
      select: { status: true }
    })

    await prisma.task.update({
      where: { id: taskId },
      data: { status },
    })

    if (currentUserId && oldTask && oldTask.status !== status) {
      await prisma.auditLog.create({
        data: {
          action: "UPDATE_STATUS",
          details: `Status moved from ${oldTask.status} to ${status}`,
          userId: currentUserId,
          taskId
        }
      })
    }

    revalidatePath(`/projects/${projectId}`)
    revalidatePath(`/tasks/${taskId}`)
    revalidatePath("/", "layout")
    return { success: true }
  } catch (error) {
    console.error("updateTaskStatus error:", error)
    return { success: false, error: "Failed to update task status" }
  }
}

export async function getProjectBacklog(projectId: string) {
  try {
    const tasks = await prisma.task.findMany({
      where: {
        projectId,
        OR: [
          { status: "BACKLOG" },
          {
            AND: [
              { status: { not: "DONE" } },
              { dueDate: { lt: new Date() } }
            ]
          }
        ]
      },
      include: {
        assignments: {
          include: { user: { select: { id: true, name: true, email: true, image: true } } }
        },
        reporter: { select: { id: true, name: true, email: true, image: true } },
        sprint: { select: { id: true, name: true } },
        documents: { include: { document: true } }
      },
      orderBy: { createdAt: "desc" },
    })
    return { success: true, tasks }
  } catch (error) {
    console.error("getProjectBacklog error:", error)
    return { success: false, error: "Failed to fetch backlog", tasks: [] }
  }
}

export async function getTaskById(taskId: string) {
  noStore()
  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignments: {
          include: { user: { select: { id: true, name: true, email: true, image: true } } }
        },
        reporter: { select: { id: true, name: true, email: true, image: true } },
        project: {
          select: {
            id: true,
            name: true,
            boardSections: true,
            members: {
              select: {
                user: { select: { id: true, name: true, email: true } }
              }
            }
          }
        },
        sprint: { select: { id: true, name: true } },
        comments: {
          include: {
            user: { select: { id: true, name: true, image: true } },
            attachments: true
          },
          orderBy: { createdAt: "asc" }
        },
        documents: { include: { document: true } },
        attachments: true
      }
    })
    return { success: true, task }
  } catch (error) {
    console.error("getTaskById error:", error)
    return { success: false, error: "Failed to fetch task" }
  }
}

export async function getMyTasks() {
  const session = await auth()
  const userId = (session?.user as any)?.id
  if (!userId) return { success: false, error: "Unauthorized" }

  try {
    const tasks = await prisma.task.findMany({
      where: {
        assignments: {
          some: { userId }
        }
      },
      include: {
        project: { select: { id: true, name: true } },
        assignments: {
          include: {
            user: { select: { id: true, name: true, image: true } }
          }
        },
        sprint: { select: { id: true, name: true } },
        documents: { include: { document: true } }
      },
      orderBy: { updatedAt: "desc" }
    })
    return { success: true, tasks }
  } catch (error) {
    console.error("getMyTasks error:", error)
    return { success: false, error: "Failed to fetch tasks" }
  }
}
