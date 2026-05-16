"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { TaskAssignmentRole } from "@prisma/client"

export async function createTask(data: {
  title: string
  description?: string
  projectId: string
  creatorId?: string
  parentId?: string
  status?: string
  points?: number
  assignments?: Array<{ userId: string; role: TaskAssignmentRole }>
  sprintId?: string
  dueDate?: Date
}) {
  try {
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

    const result = await prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          title: data.title,
          description: data.description,
          projectId: data.projectId,
          creatorId,
          status: data.status || "BACKLOG",
          points: data.points,
          sprintId: data.sprintId || null,
          dueDate: data.dueDate,
          assignments: {
            create: data.assignments?.map(a => ({
              userId: a.userId,
              role: a.role
            }))
          }
        },
      })

      await tx.taskClosure.create({
        data: { ancestorId: task.id, descendantId: task.id, depth: 0 },
      })

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
          await tx.taskClosure.createMany({ data: newClosures })
        }
      }

      return task
    })

    revalidatePath(`/projects/${data.projectId}`)
    revalidatePath("/", "layout")
    return { success: true, task: result }
  } catch (error) {
    console.error(error)
    return { success: false, error: "Failed to create task" }
  }
}

export async function updateTask(taskId: string, data: {
  title?: string
  description?: string
  status?: string
  points?: number | null
  sprintId?: string | null
  dueDate?: Date | null
  creatorId?: string
  projectId: string
}) {
  try {
    await prisma.task.update({
      where: { id: taskId },
      data: {
        title: data.title,
        description: data.description,
        status: data.status,
        points: data.points,
        sprintId: data.sprintId,
        dueDate: data.dueDate,
        creatorId: data.creatorId
      }
    })
    revalidatePath(`/projects/${data.projectId}`)
    revalidatePath(`/tasks/${taskId}`)
    revalidatePath("/", "layout")
    return { success: true }
  } catch (error) {
    console.error("updateTask error:", error)
    return { success: false, error: "Failed to update task" }
  }
}

export async function updateTaskAssignments(taskId: string, assignments: Array<{ userId: string; role: TaskAssignmentRole }>, projectId: string) {
  try {
    await prisma.$transaction(async (tx) => {
      // Remove all current assignments
      await tx.taskAssignment.deleteMany({
        where: { taskId }
      })

      // Add new ones
      if (assignments.length > 0) {
        await tx.taskAssignment.createMany({
          data: assignments.map(a => ({
            taskId,
            userId: a.userId,
            role: a.role
          }))
        })
      }
    })

    revalidatePath(`/projects/${projectId}`)
    revalidatePath(`/tasks/${taskId}`)
    revalidatePath("/", "layout")
    return { success: true }
  } catch (error) {
    console.error("updateTaskAssignments error:", error)
    return { success: false, error: "Failed to update assignments" }
  }
}

export async function getTasksByProject(projectId: string) {
  try {
    const tasks = await prisma.task.findMany({
      where: { projectId },
      include: {
        assignments: {
          include: { user: { select: { id: true, name: true, email: true, image: true } } }
        }
      },
      orderBy: { createdAt: "desc" },
    })
    return { success: true, tasks }
  } catch (error) {
    return { success: false, error: "Failed to fetch tasks" }
  }
}

export async function updateTaskStatus(taskId: string, status: string, projectId: string) {
  try {
    await prisma.task.update({
      where: { id: taskId },
      data: { status },
    })
    revalidatePath(`/projects/${projectId}`)
    revalidatePath(`/tasks/${taskId}`)
    revalidatePath("/", "layout")
    return { success: true }
  } catch (error) {
    console.error("updateTaskStatus error:", error)
    return { success: false, error: "Failed to update task status" }
  }
}

export async function getProjectBacklog(projectId: string) {
  try {
    const tasks = await prisma.task.findMany({
      where: { 
        projectId,
        OR: [
          { status: "BACKLOG" },
          {
            AND: [
              { status: { not: "DONE" } },
              { dueDate: { lt: new Date() } }
            ]
          }
        ]
      },
      include: {
        assignments: {
          include: { user: { select: { id: true, name: true, email: true, image: true } } }
        },
        reporter: { select: { id: true, name: true, email: true, image: true } },
        sprint: { select: { id: true, name: true } },
        documents: { include: { document: true } }
      },
      orderBy: { createdAt: "desc" },
    })
    return { success: true, tasks }
  } catch (error) {
    console.error("getProjectBacklog error:", error)
    return { success: false, error: "Failed to fetch backlog", tasks: [] }
  }
}

export async function getTaskById(taskId: string) {
  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignments: {
          include: { user: { select: { id: true, name: true, email: true, image: true } } }
        },
        reporter: { select: { id: true, name: true, email: true, image: true } },
        project: {
          select: {
            id: true,
            name: true,
            boardSections: true,
            members: {
              select: {
                user: { select: { id: true, name: true, email: true } }
              }
            }
          }
        },
        sprint: { select: { id: true, name: true } },
        comments: {
          include: {
            user: { select: { id: true, name: true, image: true } }
          },
          orderBy: { createdAt: "desc" }
        },
        documents: { include: { document: true } }
      }
    })
    return { success: true, task }
  } catch (error) {
    console.error("getTaskById error:", error)
    return { success: false, error: "Failed to fetch task" }
  }
}
