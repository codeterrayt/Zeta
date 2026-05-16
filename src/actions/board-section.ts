"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function getBoardSections(projectId: string) {
  try {
    const sections = await prisma.boardSection.findMany({
      where: { projectId },
      orderBy: { order: "asc" },
    })
    return { success: true, sections }
  } catch (error) {
    console.error("getBoardSections error:", error)
    return { success: false, error: "Failed to fetch sections", sections: [] }
  }
}

export async function createBoardSection(projectId: string, name: string) {
  try {
    // Get max order
    const maxSection = await prisma.boardSection.findFirst({
      where: { projectId },
      orderBy: { order: "desc" },
    })
    const order = maxSection ? maxSection.order + 1 : 0

    const section = await prisma.boardSection.create({
      data: { projectId, name, order },
    })

    revalidatePath(`/projects/${projectId}`)
    return { success: true, section }
  } catch (error) {
    console.error("createBoardSection error:", error)
    return { success: false, error: "Failed to create section. Section names must be unique." }
  }
}

export async function deleteBoardSection(sectionId: string, projectId: string) {
  try {
    await prisma.boardSection.delete({
      where: { id: sectionId },
    })
    revalidatePath(`/projects/${projectId}`)
    return { success: true }
  } catch (error) {
    console.error("deleteBoardSection error:", error)
    return { success: false, error: "Failed to delete section" }
  }
}

export async function updateBoardSectionOrder(projectId: string, sectionIds: string[]) {
  try {
    await prisma.$transaction(
      sectionIds.map((id, index) =>
        prisma.boardSection.update({
          where: { id },
          data: { order: index },
        })
      )
    )
    revalidatePath(`/projects/${projectId}`)
    return { success: true }
  } catch (error) {
    console.error("updateBoardSectionOrder error:", error)
    return { success: false, error: "Failed to update order" }
  }
}

export async function renameBoardSection(sectionId: string, newName: string, projectId: string) {
  try {
    const oldSection = await prisma.boardSection.findUnique({ where: { id: sectionId } })
    if (!oldSection) return { success: false, error: "Section not found" }

    await prisma.$transaction(async (tx) => {
      // Update section name
      await tx.boardSection.update({
        where: { id: sectionId },
        data: { name: newName },
      })

      // Update all tasks with this status
      await tx.task.updateMany({
        where: { projectId, status: oldSection.name },
        data: { status: newName },
      })
    })

    revalidatePath(`/projects/${projectId}`)
    return { success: true }
  } catch (error) {
    console.error("renameBoardSection error:", error)
    return { success: false, error: "Failed to rename section" }
  }
}
