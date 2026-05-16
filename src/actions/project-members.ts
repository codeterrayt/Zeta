"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function getProjectMembers(projectId: string) {
  try {
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
    const members = await prisma.projectMember.findMany({
      where: { projectId },
      include: { user: { select: { id: true, name: true, email: true } } }
    })
    return members.map(m => m.user)
  } catch {
    return []
  }
}

export async function addProjectMember(projectId: string, email: string) {
  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return { success: false, error: "No user found with that email address" }
    }

    const existing = await prisma.projectMember.findFirst({
      where: { projectId, userId: user.id }
    })
    if (existing) {
      return { success: false, error: "User is already a member of this project" }
    }

    await prisma.projectMember.create({
      data: { projectId, userId: user.id, role: "CONTRIBUTOR" }
    })

    revalidatePath(`/projects/${projectId}`)
    return { success: true }
  } catch {
    return { success: false, error: "Failed to add member" }
  }
}

export async function removeProjectMember(projectId: string, userId: string) {
  try {
    await prisma.projectMember.deleteMany({
      where: { projectId, userId }
    })
    revalidatePath(`/projects/${projectId}`)
    return { success: true }
  } catch {
    return { success: false, error: "Failed to remove member" }
  }
}
