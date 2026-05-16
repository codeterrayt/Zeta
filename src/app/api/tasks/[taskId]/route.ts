import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

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
        status: body.status,
        assigneeId: body.assigneeId ?? null,
        points: body.points ?? null,
        commitIds: body.commitIds ?? null,
        branchName: body.branchName ?? null,
        repoName: body.repoName ?? null,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } }
      }
    })

    return NextResponse.json({ success: true, task })
  } catch (error) {
    console.error("PATCH /api/tasks/[taskId]:", error)
    return NextResponse.json({ success: false, error: "Failed to update task" }, { status: 500 })
  }
}
