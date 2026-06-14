import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { randomBytes } from "crypto"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

const MAX_FILE_SIZE = 52_428_800 // 50 MB

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'text/plain': 'txt',
  'text/csv': 'csv',
  'application/zip': 'zip',
  'application/x-zip-compressed': 'zip',
}

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

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `File too large. Maximum size is 50 MB.` }, { status: 413 })
    }

    // Validate MIME type against allowlist
    const mimeType = file.type
    if (!mimeType || !ALLOWED_MIME_TYPES[mimeType]) {
      return NextResponse.json({ error: `File type "${mimeType}" is not allowed.` }, { status: 415 })
    }

    const ext = ALLOWED_MIME_TYPES[mimeType]
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Use cryptographically secure random ID
    const uniqueId = randomBytes(16).toString("hex")
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
