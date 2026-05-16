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

    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        title: body.title !== undefined ? body.title : undefined,
        description: body.description !== undefined ? body.description : undefined,
        status: body.status,
        points: body.points !== undefined ? body.points : undefined,
        assigneeId: body.assigneeId !== undefined ? body.assigneeId : undefined,
        creatorId: body.creatorId !== undefined ? body.creatorId : undefined,
        githubUrl: body.githubUrl !== undefined ? body.githubUrl : undefined,
        commitIds: body.commitIds !== undefined ? body.commitIds : undefined,
        branchName: body.branchName !== undefined ? body.branchName : undefined,
        repoName: body.repoName !== undefined ? body.repoName : undefined,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        reporter: { select: { id: true, name: true, email: true } }
      }
    })

    revalidatePath("/", "layout")
    return NextResponse.json({ success: true, task })
  } catch (error) {
    console.error("PATCH /api/tasks/[taskId]:", error)
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Failed to update task" }, { status: 500 })
  }
}
