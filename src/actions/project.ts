"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth()

  // Primary: use the id stored in the JWT
  if (session?.user?.id) {
    return session.user.id
  }

  // Fallback: look up user by email if ID didn't come through
  if (session?.user?.email) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    })
    return user?.id ?? null
  }

  return null
}

export async function createProject(name: string, description: string) {
  try {
    const userId = await getCurrentUserId()

    const project = await prisma.$transaction(async (tx) => {
      const newProject = await tx.project.create({
        data: { name, description },
      })

      // Auto-add creator as ADMIN member
      if (userId) {
        await tx.projectMember.create({
          data: { projectId: newProject.id, userId, role: "ADMIN" },
        })
      }

      // Initialize default Kanban sections
      const defaultSections = ["BACKLOG", "IN_PROGRESS", "REVIEW", "DONE"]
      await tx.boardSection.createMany({
        data: defaultSections.map((name, index) => ({
          projectId: newProject.id,
          name,
          order: index,
        })),
      })

      return newProject
    })

    revalidatePath("/projects")
    return { success: true, project }
  } catch (error) {
    console.error("[createProject] Error:", error)
    return { success: false, error: "Failed to create project" }
  }
}

/** Returns only projects the current user is a member of */
export async function getProjects() {
  try {
    const userId = await getCurrentUserId()

    if (!userId) {
      return { success: true, projects: [] }
    }

    const projects = await prisma.project.findMany({
      where: {
        members: { some: { userId } },
      },
      include: {
        _count: { select: { tasks: true, members: true } },
        boardSections: { orderBy: { order: "asc" } },
        members: { where: { userId }, select: { role: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return { success: true, projects }
  } catch (error) {
    console.error("getProjects error:", error)
    return { success: false, error: "Failed to fetch projects", projects: [] }
  }
}

export async function deleteProject(projectId: string) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return { success: false, error: "Unauthorized" }

    // Check if user is ADMIN in this project
    const membership = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId }
      }
    })

    if (!membership || membership.role !== "ADMIN") {
      return { success: false, error: "Only project admins can delete the project" }
    }

    await prisma.project.delete({
      where: { id: projectId }
    })

    revalidatePath("/projects")
    return { success: true }
  } catch (error) {
    console.error("[deleteProject] Error:", error)
    return { success: false, error: "Failed to delete project" }
  }
}
export async function updateProject(projectId: string, name: string, description: string) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return { success: false, error: "Unauthorized" }

    // Check if user is ADMIN in this project
    const membership = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId }
      }
    })

    if (!membership || membership.role !== "ADMIN") {
      return { success: false, error: "Only project admins can edit the project" }
    }

    const project = await prisma.project.update({
      where: { id: projectId },
      data: { name, description }
    })

    revalidatePath("/projects")
    revalidatePath(`/projects/${projectId}`)
    return { success: true, project }
  } catch (error) {
    console.error("[updateProject] Error:", error)
    return { success: false, error: "Failed to update project" }
  }
}
