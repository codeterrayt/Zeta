"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function createAuditLog(data: {
  action: string
  details: string
  taskId?: string
}) {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Unauthorized" }

    await prisma.auditLog.create({
      data: {
        action: data.action,
        details: data.details,
        userId: session.user.id,
        taskId: data.taskId
      }
    })

    return { success: true }
  } catch (error) {
    console.error("createAuditLog error:", error)
    return { success: false, error: "Failed to create audit log" }
  }
}

export async function getTaskAuditLogs(taskId: string) {
  try {
    const logs = await prisma.auditLog.findMany({
      where: { taskId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            email: true
          }
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
                email: true
              }
            }
          },
          orderBy: {
            createdAt: "asc"
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    return { success: true, logs }
  } catch (error) {
    console.error("getTaskAuditLogs error:", error)
    return { success: false, error: "Failed to fetch audit logs", logs: [] }
  }
}

export async function updateAuditLogComment(logId: string, comment: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Unauthorized" }

    await prisma.auditLog.update({
      where: { id: logId },
      data: { comment: comment || null }
    })

    return { success: true }
  } catch (error) {
    console.error("updateAuditLogComment error:", error)
    return { success: false, error: "Failed to update timeline comment" }
  }
}

export async function addAuditLogComment(auditLogId: string, content: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Unauthorized" }

    const newComment = await prisma.auditLogComment.create({
      data: {
        auditLogId,
        content,
        userId: session.user.id
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            email: true
          }
        }
      }
    })

    return { success: true, comment: newComment }
  } catch (error) {
    console.error("addAuditLogComment error:", error)
    return { success: false, error: "Failed to add comment" }
  }
}

export async function deleteAuditLogComment(commentId: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Unauthorized" }

    const existing = await prisma.auditLogComment.findUnique({
      where: { id: commentId }
    })
    if (!existing) return { success: false, error: "Comment not found" }
    if (existing.userId !== session.user.id) return { success: false, error: "Forbidden" }

    await prisma.auditLogComment.delete({
      where: { id: commentId }
    })

    return { success: true }
  } catch (error) {
    console.error("deleteAuditLogComment error:", error)
    return { success: false, error: "Failed to delete comment" }
  }
}
