import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { content, parentId } = await req.json()
    const userId = (session.user as any).id

    const comment = await prisma.comment.create({
      data: {
        content,
        taskId,
        userId,
        parentId: parentId || null
      },
      include: {
        user: { select: { id: true, name: true, image: true } }
      }
    })

    return NextResponse.json({ success: true, comment })
  } catch (error) {
    console.error("POST /api/tasks/[taskId]/comments:", error)
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 })
  }
}
