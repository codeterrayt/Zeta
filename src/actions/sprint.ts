"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

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

export async function getSprintById(sprintId: string) {
  try {
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
        }
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
