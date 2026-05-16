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
