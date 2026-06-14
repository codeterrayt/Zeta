import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    const taskId = formData.get("taskId") as string | null
    const sprintId = formData.get("sprintId") as string | null
    const commentId = formData.get("commentId") as string | null
    const chatGroupId = formData.get("chatGroupId") as string | null

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uniqueId = Math.random().toString(36).substring(2, 15)
    const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin"
    const fileName = `${uniqueId}-${Date.now()}.${ext}`
    
    const uploadsDir = join(process.cwd(), "uploads")
    await mkdir(uploadsDir, { recursive: true })
    const path = join(uploadsDir, fileName)
    
    await writeFile(path, buffer)

    const url = `/uploads/${fileName}`

    const attachment = await prisma.attachment.create({
      data: {
        name: file.name,
        url,
        size: file.size,
        type: file.type,
        userId: session.user.id,
        taskId: taskId || null,
        sprintId: sprintId || null,
        commentId: commentId || null,
        chatGroupId: chatGroupId || null,
      },
    })

    if (taskId) {
      await prisma.auditLog.create({
        data: {
          action: "UPLOAD_ATTACHMENT",
          details: `Uploaded file: ${file.name}`,
          userId: session.user.id,
          taskId: taskId
        }
      })
    }

    return NextResponse.json({ success: true, attachment })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
