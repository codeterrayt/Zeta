"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function createTask(data: {
  title: string
  description?: string
  projectId: string
  creatorId?: string
  parentId?: string
  status?: string
  points?: number
  assigneeId?: string
}) {
  try {
    // Ensure we have a valid creator — find or create a system placeholder
    let creatorId = data.creatorId
    if (!creatorId || creatorId === "system") {
      let systemUser = await prisma.user.findFirst({ where: { email: "system@openjira.local" } })
      if (!systemUser) {
        systemUser = await prisma.user.create({
          data: { name: "System", email: "system@openjira.local" }
        })
      }
      creatorId = systemUser.id
    }

    // We use a transaction because we need to insert the task and update the closure table
    const result = await prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          title: data.title,
          description: data.description,
          projectId: data.projectId,
          creatorId,
          status: data.status || "BACKLOG",
          points: data.points,
          assigneeId: data.assigneeId || null,
        },
      })

      // Insert self-reference (depth 0)
      await tx.taskClosure.create({
        data: {
          ancestorId: task.id,
          descendantId: task.id,
          depth: 0,
        },
      })

      // If there is a parent, copy all ancestors of the parent and link to the new task
      if (data.parentId) {
        const parentAncestors = await tx.taskClosure.findMany({
          where: { descendantId: data.parentId },
        })

        const newClosures = parentAncestors.map((ancestor) => ({
          ancestorId: ancestor.ancestorId,
          descendantId: task.id,
          depth: ancestor.depth + 1,
        }))

        if (newClosures.length > 0) {
          await tx.taskClosure.createMany({
            data: newClosures,
          })
        }
      }

      return task
    })

    revalidatePath("/tasks")
    revalidatePath(`/projects/${data.projectId}`)
    return { success: true, task: result }
  } catch (error) {
    console.error(error)
    return { success: false, error: "Failed to create task" }
  }
}

export async function getTasksByProject(projectId: string) {
  try {
    const tasks = await prisma.task.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    })
    return { success: true, tasks }
  } catch (error) {
    return { success: false, error: "Failed to fetch tasks" }
  }
}

export async function getTaskSubtree(taskId: string) {
  try {
    // Get all descendants using the closure table
    const descendants = await prisma.taskClosure.findMany({
      where: { ancestorId: taskId },
      include: {
        descendant: true,
      },
      orderBy: { depth: "asc" },
    })
    
    return { success: true, tasks: descendants.map((d) => ({ ...d.descendant, depth: d.depth })) }
  } catch (error) {
    return { success: false, error: "Failed to fetch task subtree" }
  }
}
