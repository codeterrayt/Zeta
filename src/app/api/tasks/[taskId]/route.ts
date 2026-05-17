import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const session = await auth()
    const currentUserId = session?.user?.id
    if (!currentUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { taskId } = await params
    const body = await req.json()

    const { assignments, timelineComments, ...rest } = body

    // Fetch old task for logging
    const oldTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: { 
        sprint: true,
        assignments: { include: { user: { select: { name: true } } } },
        reporter: { select: { name: true } }
      }
    })

    if (!oldTask) return NextResponse.json({ error: "Task not found" }, { status: 404 })

    const task = await prisma.$transaction(async (tx) => {
      const updatedTask = await tx.task.update({
        where: { id: taskId },
        data: {
          title: rest.title,
          description: rest.description,
          status: rest.status,
          points: rest.points,
          creatorId: rest.creatorId,
          githubUrl: rest.githubUrl,
          commitIds: rest.commitIds,
          branchName: rest.branchName,
          repoName: rest.repoName,
          dueDate: rest.dueDate ? new Date(rest.dueDate) : null,
          sprintId: rest.sprintId,
        },
        include: { 
          sprint: true, 
          reporter: { select: { name: true } } 
        }
      })

      if (assignments !== undefined) {
        await tx.taskAssignment.deleteMany({ where: { taskId } })
        if (assignments.length > 0) {
          await tx.taskAssignment.createMany({
            data: assignments.map((a: any) => ({
              taskId,
              userId: a.userId,
              role: a.role
            }))
          })
        }
      }

      const comments = timelineComments || {}

      const createLogWithComment = async (tx: any, data: { action: string, details: string, commentKey: string }) => {
        const log = await tx.auditLog.create({
          data: {
            action: data.action,
            details: data.details,
            comment: comments[data.commentKey] || null,
            userId: currentUserId,
            taskId
          }
        })
        if (comments[data.commentKey]) {
          await tx.auditLogComment.create({
            data: {
              content: comments[data.commentKey],
              auditLogId: log.id,
              userId: currentUserId
            }
          })
        }
      }

      if (rest.title !== undefined && rest.title !== oldTask.title) {
        await createLogWithComment(tx, {
          action: "UPDATE_TASK",
          details: `Title: "${oldTask.title}" → "${rest.title}"`,
          commentKey: "title"
        })
      }
      if (rest.status !== undefined && rest.status !== oldTask.status) {
        await createLogWithComment(tx, {
          action: "UPDATE_STATUS",
          details: `Status: ${oldTask.status} → ${rest.status}`,
          commentKey: "status"
        })
      }
      if (rest.points !== undefined && rest.points !== oldTask.points) {
        await createLogWithComment(tx, {
          action: "UPDATE_TASK",
          details: `Complexity: ${oldTask.points ?? "None"} → ${rest.points ?? "None"}`,
          commentKey: "points"
        })
      }
      if (rest.sprintId !== undefined && rest.sprintId !== oldTask.sprintId) {
        await createLogWithComment(tx, {
          action: "UPDATE_TASK",
          details: `Sprint: ${oldTask.sprint?.name ?? "Backlog"} → ${updatedTask.sprint?.name ?? "Backlog"}`,
          commentKey: "sprintId"
        })
      }
      if (rest.dueDate !== undefined) {
        const oldD = oldTask.dueDate ? new Date(oldTask.dueDate).toLocaleDateString() : "None"
        const newD = rest.dueDate ? new Date(rest.dueDate).toLocaleDateString() : "None"
        if (oldD !== newD) {
          await createLogWithComment(tx, {
            action: "UPDATE_TASK",
            details: `Due Date: ${oldD} → ${newD}`,
            commentKey: "dueDate"
          })
        }
      }
      if (rest.creatorId !== undefined && rest.creatorId !== oldTask.creatorId) {
        await createLogWithComment(tx, {
          action: "UPDATE_TASK",
          details: `Reporter: ${oldTask.reporter?.name || "Unknown"} → ${updatedTask.reporter?.name || "Unknown"}`,
          commentKey: "creatorId"
        })
      }
      if (rest.githubUrl !== undefined && rest.githubUrl !== oldTask.githubUrl) {
        await createLogWithComment(tx, {
          action: "UPDATE_TASK",
          details: `GitHub Link updated`,
          commentKey: "githubUrl"
        })
      }
      if (rest.repoName !== undefined && rest.repoName !== oldTask.repoName) {
        await createLogWithComment(tx, {
          action: "UPDATE_TASK",
          details: `Repository: ${oldTask.repoName || "None"} → ${rest.repoName || "None"}`,
          commentKey: "repoName"
        })
      }
      if (rest.branchName !== undefined && rest.branchName !== oldTask.branchName) {
        await createLogWithComment(tx, {
          action: "UPDATE_TASK",
          details: `Branch: ${oldTask.branchName || "None"} → ${rest.branchName || "None"}`,
          commentKey: "branchName"
        })
      }

      if (assignments !== undefined) {
        const newAssignments = await tx.taskAssignment.findMany({
          where: { taskId },
          include: { user: { select: { name: true } } }
        })
        const removed = oldTask.assignments.filter(oa => !newAssignments.some(na => na.userId === oa.userId))
        const added = newAssignments.filter(na => !oldTask.assignments.some(oa => oa.userId === na.userId))
        
        if (removed.length > 0 || added.length > 0) {
          const attendeeDetails: string[] = []
          removed.forEach(r => attendeeDetails.push(`Removed attendee: ${r.user.name || "Unknown"}`))
          added.forEach(a => attendeeDetails.push(`Added attendee: ${a.user.name || "Unknown"} (${a.role})`))
          
          await createLogWithComment(tx, {
            action: "UPDATE_ASSIGNMENTS",
            details: attendeeDetails.join("\n"),
            commentKey: "assignments"
          })
        }
      }

      return tx.task.findUnique({
        where: { id: taskId },
        include: {
          assignments: {
            include: { user: { select: { id: true, name: true, email: true, image: true } } }
          },
          reporter: { select: { id: true, name: true, email: true } }
        }
      })
    })


    revalidatePath("/", "layout")
    return NextResponse.json({ success: true, task })
  } catch (error) {
    console.error("PATCH /api/tasks/[taskId]:", error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Failed to update task" }, { status: 500 })
  }
}
