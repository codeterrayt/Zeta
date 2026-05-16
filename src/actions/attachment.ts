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

    if (attachment.taskId) revalidatePath(`/tasks/${attachment.taskId}`)
    if (attachment.sprintId) revalidatePath(`/projects/any/sprints/${attachment.sprintId}`)
    revalidatePath("/", "layout")

    return { success: true }
  } catch (error) {
    console.error("deleteAttachment error:", error)
    return { success: false, error: "Failed to delete attachment" }
  }
}
