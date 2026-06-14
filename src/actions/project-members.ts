"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"

export async function getProjectMembers(projectId: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Unauthorized", members: [] }

    const members = await prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } }
      },
      orderBy: { createdAt: "asc" }
    })
    return { success: true, members }
  } catch {
    return { success: false, error: "Failed to fetch members", members: [] }
  }
}

export async function getProjectMembersForAssign(projectId: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) return []

    const members = await prisma.projectMember.findMany({
      where: { projectId },
      include: { user: { select: { id: true, name: true, email: true } } }
    })
    return members.map(m => m.user)
  } catch {
    return []
  }
}

export async function addProjectMemberById(projectId: string, userId: string) {
  try {
    const session = await auth()
    const callerId = session?.user?.id
    if (!callerId) return { success: false, error: "Unauthorized" }

    const callerMembership = await prisma.projectMember.findFirst({
      where: { projectId, userId: callerId, role: "ADMIN" }
    })
    if (!callerMembership) return { success: false, error: "Only project admins can add members" }

    const existing = await prisma.projectMember.findFirst({
      where: { projectId, userId }
    })
    if (existing) {
      return { success: false, error: "User is already a member of this project" }
    }

    await prisma.projectMember.create({
      data: { projectId, userId, role: "CONTRIBUTOR" }
    })

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true }
    })

    await prisma.notification.create({
      data: {
        userId,
        type: "PROJECT_ADDED",
        title: "Added to Project",
        content: `You have been added as a member to the project "${project?.name || 'Unknown'}"`,
        link: `/projects/${projectId}`
      }
    })

    revalidatePath(`/projects/${projectId}`)
    revalidatePath("/", "layout")
    return { success: true }
  } catch (error) {
    console.error("addProjectMemberById error:", error)
    return { success: false, error: "Failed to add member" }
  }
}

export async function addProjectMember(projectId: string, email: string) {
  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return { success: false, error: "No user found with that email address" }
    }
    return addProjectMemberById(projectId, user.id)
  } catch {
    return { success: false, error: "Failed to add member" }
  }
}

export async function removeProjectMember(projectId: string, userId: string) {
  try {
    const session = await auth()
    const callerId = session?.user?.id
    if (!callerId) return { success: false, error: "Unauthorized" }

    const callerMembership = await prisma.projectMember.findFirst({
      where: { projectId, userId: callerId, role: "ADMIN" }
    })
    if (!callerMembership) return { success: false, error: "Only project admins can remove members" }

    await prisma.projectMember.deleteMany({
      where: { projectId, userId }
    })
    revalidatePath(`/projects/${projectId}`)
    return { success: true }
  } catch {
    return { success: false, error: "Failed to remove member" }
  }
}
