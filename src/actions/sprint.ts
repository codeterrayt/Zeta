"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"

export async function createSprint(data: {
  projectId: string
  title: string
  startDate?: string | Date
  endDate?: string | Date
}) {
  try {
    console.log("[createSprint] ATTEMPTING CREATE WITH:", {
      projectId: data.projectId,
      title: data.title,
      startDate: data.startDate,
      endDate: data.endDate
    })

    if (!data.projectId || data.projectId === "undefined") {
      throw new Error("Invalid Project ID. Please refresh the page and try again.")
    }
    if (!data.title || data.title.trim() === "") {
      throw new Error("Sprint title cannot be empty.")
    }

    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return { success: false, error: "Unauthorized" }

    const membership = await prisma.projectMember.findFirst({
      where: { projectId: data.projectId, userId }
    })
    if (!membership) return { success: false, error: "Access denied: not a member of this project" }

    const sprint = await prisma.sprint.create({
      data: {
        name: data.title.trim(),
        projectId: data.projectId,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
      },
    })

    console.log("[createSprint] SUCCESS! Created Sprint ID:", sprint.id)
    revalidatePath(`/projects/${data.projectId}`)
    revalidatePath("/", "layout")
    return { success: true, sprint }
  } catch (error: any) {
    console.error("[createSprint] CRITICAL ERROR:", error)

    // Detailed error parsing for Prisma
    if (error.code === 'P2002') return { success: false, error: "A sprint with this name already exists." }
    if (error.code === 'P2003') return { success: false, error: "Project not found. The project might have been deleted." }

    return { success: false, error: error.message || "An unexpected error occurred while creating the sprint." }
  }
}

export async function getProjectSprints(projectId: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Unauthorized", sprints: [] }

    const sprints = await prisma.sprint.findMany({
      where: { projectId },
      include: {
        _count: {
          select: { tasks: true }
        },
        tasks: {
          select: {
            status: true,
            points: true,
            dueDate: true,
          }
        }
      },
      orderBy: { id: "desc" },
    })
    return { success: true, sprints }
  } catch (error) {
    console.error("getProjectSprints error:", error)
    return { success: false, error: "Failed to fetch sprints", sprints: [] }
  }
}

import { unstable_noStore as noStore } from "next/cache"

export async function getSprintById(sprintId: string) {
  noStore()
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Unauthorized", sprint: null }

    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
      include: {
        tasks: {
          include: {
            assignments: {
              include: { user: { select: { id: true, name: true, email: true, image: true } } }
            },
            reporter: { select: { id: true, name: true, email: true, image: true } },
            documents: { include: { document: true } }
          }
        },
        project: {
          include: { boardSections: { orderBy: { order: "asc" } } }
        },
        comments: {
          include: {
            user: { select: { id: true, name: true, image: true } },
            attachments: true
          },
          orderBy: { createdAt: "asc" }
        },
        attachments: true
      },
    })
    return { success: true, sprint }
  } catch (error) {
    console.error("getSprintById error:", error)
    return { success: false, error: "Failed to fetch sprint", sprint: null }
  }
}

export async function deleteSprint(sprintId: string, projectId: string) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return { success: false, error: "Unauthorized" }

    const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } })
    if (sprint) {
      const membership = await prisma.projectMember.findFirst({
        where: { projectId: sprint.projectId, userId, role: "ADMIN" }
      })
      if (!membership) return { success: false, error: "Only project admins can delete sprints" }
    }

    await prisma.sprint.delete({
      where: { id: sprintId },
    })
    revalidatePath(`/projects/${projectId}`)
    revalidatePath("/", "layout")
    return { success: true }
  } catch (error) {
    console.error("deleteSprint error:", error)
    return { success: false, error: "Failed to delete sprint" }
  }
}

export async function updateSprint(sprintId: string, data: any, projectId: string) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return { success: false, error: "Unauthorized" }

    const existingSprint = await prisma.sprint.findUnique({ where: { id: sprintId } })
    if (existingSprint) {
      const membership = await prisma.projectMember.findFirst({
        where: { projectId: existingSprint.projectId, userId }
      })
      if (!membership) return { success: false, error: "Access denied: not a member of this project" }
    }

    await prisma.sprint.update({
      where: { id: sprintId },
      data,
    })
    revalidatePath(`/projects/${projectId}`)
    revalidatePath(`/projects/${projectId}/sprints/${sprintId}`)
    revalidatePath("/", "layout")
    return { success: true }
  } catch (error) {
    console.error("updateSprint error:", error)
    return { success: false, error: "Failed to update sprint" }
  }
}
export async function getSprintTasks(sprintId: string) {
  try {
    const tasks = await prisma.task.findMany({
      where: { sprintId },
      include: {
        assignments: {
          include: { user: { select: { id: true, name: true, email: true, image: true } } }
        },
        reporter: { select: { id: true, name: true, email: true, image: true } },
        documents: { include: { document: true } }
      },
      orderBy: { createdAt: "desc" }
    })
    return { success: true, tasks }
  } catch (error) {
    console.error("getSprintTasks error:", error)
    return { success: false, error: "Failed to fetch tasks", tasks: [] }
  }
}
