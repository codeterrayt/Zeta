"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { unlink } from "fs/promises"
import { join } from "path"
import { revalidatePath } from "next/cache"

export async function deleteAttachment(attachmentId: string) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: "Unauthorized" }

  try {
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId }
    })

    if (!attachment) return { success: false, error: "Attachment not found" }
    if (attachment.userId !== session.user.id) {
      return { success: false, error: "Only the uploader can delete this attachment" }
    }

    // Delete file from disk
    try {
      const filePath = join(process.cwd(), "public", attachment.url)
      await unlink(filePath)
    } catch (e) {
      console.error("File deletion error (disk):", e)
    }

    // Delete record from DB
    await prisma.attachment.delete({
      where: { id: attachmentId }
    })

    if (attachment.taskId) {
      await prisma.auditLog.create({
        data: {
          action: "DELETE_ATTACHMENT",
          details: `Deleted file: ${attachment.name}`,
          userId: session.user.id,
          taskId: attachment.taskId
        }
      })
    }

    if (attachment.taskId) revalidatePath(`/tasks/${attachment.taskId}`)
    if (attachment.sprintId) revalidatePath(`/projects/any/sprints/${attachment.sprintId}`)
    revalidatePath("/", "layout")

    return { success: true }
  } catch (error) {
    console.error("deleteAttachment error:", error)
    return { success: false, error: "Failed to delete attachment" }
  }
}

export async function getProjectAttachments(projectId: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Unauthorized", attachments: [] }

    const attachments = await prisma.attachment.findMany({
      where: {
        OR: [
          { task: { projectId } },
          { sprint: { projectId } },
          { comment: { task: { projectId } } },
          { comment: { sprint: { projectId } } }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    return { success: true, attachments }
  } catch (error) {
    console.error("getProjectAttachments error:", error)
    return { success: false, error: "Failed to fetch attachments", attachments: [] }
  }
}
