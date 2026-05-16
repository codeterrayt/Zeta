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

    const { assignments, ...rest } = body

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

    // Prepare Logs
    const logs: string[] = []
    
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

      // Build log details
      if (rest.title !== undefined && rest.title !== oldTask.title) logs.push(`Title: "${oldTask.title}" → "${rest.title}"`)
      if (rest.status !== undefined && rest.status !== oldTask.status) logs.push(`Status: ${oldTask.status} → ${rest.status}`)
      if (rest.points !== undefined && rest.points !== oldTask.points) logs.push(`Complexity: ${oldTask.points ?? "None"} → ${rest.points ?? "None"}`)
      if (rest.sprintId !== undefined && rest.sprintId !== oldTask.sprintId) logs.push(`Sprint: ${oldTask.sprint?.name ?? "Backlog"} → ${updatedTask.sprint?.name ?? "Backlog"}`)
      if (rest.dueDate !== undefined) {
        const oldD = oldTask.dueDate ? new Date(oldTask.dueDate).toLocaleDateString() : "None"
        const newD = rest.dueDate ? new Date(rest.dueDate).toLocaleDateString() : "None"
        if (oldD !== newD) logs.push(`Due Date: ${oldD} → ${newD}`)
      }
      if (rest.creatorId !== undefined && rest.creatorId !== oldTask.creatorId) {
        logs.push(`Reporter: ${oldTask.reporter?.name || "Unknown"} → ${updatedTask.reporter?.name || "Unknown"}`)
      }
      if (rest.githubUrl !== undefined && rest.githubUrl !== oldTask.githubUrl) logs.push(`GitHub Link updated`)
      if (rest.repoName !== undefined && rest.repoName !== oldTask.repoName) logs.push(`Repository: ${oldTask.repoName || "None"} → ${rest.repoName || "None"}`)
      if (rest.branchName !== undefined && rest.branchName !== oldTask.branchName) logs.push(`Branch: ${oldTask.branchName || "None"} → ${rest.branchName || "None"}`)

      if (assignments !== undefined) {
        const newAssignments = await tx.taskAssignment.findMany({
          where: { taskId },
          include: { user: { select: { name: true } } }
        })
        const removed = oldTask.assignments.filter(oa => !newAssignments.some(na => na.userId === oa.userId))
        const added = newAssignments.filter(na => !oldTask.assignments.some(oa => oa.userId === na.userId))
        removed.forEach(r => logs.push(`Removed attendee: ${r.user.name || "Unknown"}`))
        added.forEach(a => logs.push(`Added attendee: ${a.user.name || "Unknown"} (${a.role})`))
      }

      if (logs.length > 0) {
        console.log(`[AuditLog] Logging ${logs.length} changes for task ${taskId}`)
        await tx.auditLog.create({
          data: {
            action: "UPDATE_TASK",
            details: logs.join("\n"),
            userId: currentUserId,
            taskId
          }
        })
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
