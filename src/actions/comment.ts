"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { getCurrentUserId } from "./project"

export async function addComment(data: {
  content: string,
  taskId?: string,
  sprintId?: string,
  projectId?: string,
  parentId?: string
}) {
  const userId = await getCurrentUserId()
  if (!userId) return { success: false, error: "Unauthorized" }

  try {
    const comment = await prisma.comment.create({
      data: {
        content: data.content,
        taskId: data.taskId || null,
        sprintId: data.sprintId || null,
        userId,
        parentId: data.parentId || null
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
      }
    })

    if (data.taskId) revalidatePath(`/tasks/${data.taskId}`)
    if (data.sprintId && data.projectId) {
      revalidatePath(`/projects/${data.projectId}/sprints/${data.sprintId}`)
    }
    revalidatePath("/", "layout")
    return { success: true, comment }
  } catch (error) {
    console.error("addComment error:", error)
    return { success: false, error: "Failed to add comment" }
  }
}

export async function deleteComment(commentId: string, taskId: string) {
  const userId = await getCurrentUserId()
  if (!userId) return { success: false, error: "Unauthorized" }

  try {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    })

    if (!comment || comment.userId !== userId) {
      return { success: false, error: "Not allowed" }
    }

    await prisma.comment.delete({
      where: { id: commentId }
    })

    revalidatePath(`/tasks/${taskId}`)
    return { success: true }
  } catch (error) {
    console.error("deleteComment error:", error)
    return { success: false, error: "Failed to delete comment" }
  }
}
