"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

async function getCurrentUserId(): Promise<string | null> {
  const session = await auth()
  console.log("[getCurrentUserId] Session:", JSON.stringify(session))

  // Primary: use the id stored in the JWT
  if (session?.user?.id) {
    console.log("[getCurrentUserId] Found ID in session:", session.user.id)
    return session.user.id
  }

  // Fallback: look up user by email if ID didn't come through
  if (session?.user?.email) {
    console.log("[getCurrentUserId] Looking up ID by email:", session.user.email)
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    })
    console.log("[getCurrentUserId] Fallback lookup result:", user?.id)
    return user?.id ?? null
  }

  console.error("[getCurrentUserId] No session or email found")
  return null
}

export async function createProject(name: string, description: string) {
  try {
    const userId = await getCurrentUserId()
    console.log("[createProject] Creating project with name:", name, "userId:", userId)

    const project = await prisma.$transaction(async (tx) => {
      const newProject = await tx.project.create({
        data: { name, description },
      })

      // Auto-add creator as ADMIN member
      if (userId) {
        console.log("[createProject] Adding member:", userId, "to project:", newProject.id)
        await tx.projectMember.create({
          data: { projectId: newProject.id, userId, role: "ADMIN" },
        })
      } else {
        console.warn("[createProject] Skipping member addition - no userId found")
      }

      // Initialize default Kanban sections
      const defaultSections = ["BACKLOG", "IN_PROGRESS", "REVIEW", "DONE"]
      console.log("[createProject] Initializing default sections for project:", newProject.id)
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

