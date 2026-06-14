"use server"

import { prisma } from "@/lib/prisma"

export async function getAttachmentsForContext({
  projectId,
  taskId,
  sprintId,
  chatGroupId,
}: {
  projectId?: string
  taskId?: string
  sprintId?: string
  chatGroupId?: string
}) {
  try {
    const where: any = { OR: [] }

    if (taskId) where.OR.push({ taskId })
    if (sprintId) where.OR.push({ sprintId })
    if (chatGroupId) where.OR.push({ chatGroupId })

    // If we have a projectId, fetch all attachments in all tasks/sprints in that project
    if (projectId) {
      const tasks = await prisma.task.findMany({ where: { projectId }, select: { id: true } })
      const sprints = await prisma.sprint.findMany({ where: { projectId }, select: { id: true } })
      tasks.forEach(t => where.OR.push({ taskId: t.id }))
      sprints.forEach(s => where.OR.push({ sprintId: s.id }))
    }

    if (where.OR.length === 0) return []

    const attachments = await prisma.attachment.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    return attachments
  } catch (error) {
    console.error("getAttachmentsForContext error:", error)
    return []
  }
}
