"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"

export async function createDocument(data: {
  title: string
  content: string
  projectId: string
  taskId?: string
}) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: "Unauthorized" }

  try {
    const document = await prisma.document.create({
      data: {
        title: data.title,
        content: data.content,
        projectId: data.projectId,
        authorId: session.user.id,
        ...(data.taskId ? {
          taskLinks: {
            create: {
              taskId: data.taskId
            }
          }
        } : {})
      }
    })

    revalidatePath(`/projects/${data.projectId}`)
    if (data.taskId) revalidatePath(`/tasks/${data.taskId}`)
    revalidatePath("/documentation")
    
    return { success: true, document }
  } catch (error) {
    console.error("createDocument error:", error)
    return { success: false, error: "Failed to create document" }
  }
}

export async function getProjectDocuments(projectId: string) {
  try {
    const documents = await prisma.document.findMany({
      where: { projectId },
      include: {
        author: { select: { id: true, name: true, image: true } },
        taskLinks: {
          include: {
            task: { select: { id: true, title: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    })
    return { success: true, documents }
  } catch (error) {
    console.error("getProjectDocuments error:", error)
    return { success: false, error: "Failed to fetch documents", documents: [] }
  }
}

export async function getAllDocuments() {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: "Unauthorized" }

  try {
    const documents = await prisma.document.findMany({
      include: {
        author: { select: { id: true, name: true, image: true } },
        taskLinks: {
          include: {
            task: { select: { id: true, title: true, projectId: true } }
          }
        },
        project: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: "desc" }
    })
    return { success: true, documents }
  } catch (error) {
    console.error("getAllDocuments error:", error)
    return { success: false, error: "Failed to fetch documents", documents: [] }
  }
}

export async function getDocumentById(id: string) {
  try {
    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, image: true } },
        project: { select: { id: true, name: true } },
        taskLinks: {
          include: {
            task: {
              include: {
                assignments: { select: { userId: true, role: true } }
              }
            }
          }
        }
      }
    })
    return { success: true, document }
  } catch (error) {
    console.error("getDocumentById error:", error)
    return { success: false, error: "Failed to fetch document" }
  }
}

export async function updateDocument(id: string, data: { title: string; content: string }) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: "Unauthorized" }

  try {
    const document = await prisma.document.update({
      where: { id },
      data: {
        title: data.title,
        content: data.content
      }
    })
    revalidatePath(`/documentation/${id}`)
    return { success: true, document }
  } catch (error) {
    console.error("updateDocument error:", error)
    return { success: false, error: "Failed to update document" }
  }
}
