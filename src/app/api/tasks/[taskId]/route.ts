import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params
    const body = await req.json()

    const { assignments, ...rest } = body

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
