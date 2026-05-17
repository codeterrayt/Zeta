"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { notifyMentions } from "./notifications"

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

    if (data.taskId) {
      await prisma.auditLog.create({
        data: {
          action: "CREATE_DOCUMENT",
          details: `Created and linked documentation: ${data.title}`,
          userId: session.user.id,
          taskId: data.taskId
        }
      })
    }

    await notifyMentions({
      html: data.content,
      actorId: session.user.id,
      documentId: document.id,
      projectId: data.projectId,
      contextType: "DOCUMENTATION"
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
            task: { 
              select: { 
                id: true, 
                title: true, 
                projectId: true,
                sprintId: true,
                sprint: { select: { id: true, name: true } },
                assignments: { select: { userId: true } }
              } 
            }
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
      where: { id: id },
      data: {
        title: data.title,
        content: data.content
      },
      include: {
        taskLinks: { select: { taskId: true } }
      }
    })

    // Log for all linked tasks
    for (const link of document.taskLinks) {
      await prisma.auditLog.create({
        data: {
          action: "UPDATE_DOCUMENT",
          details: `Updated documentation: ${data.title}`,
          userId: session.user.id,
          taskId: link.taskId
        }
      })
    }

    await notifyMentions({
      html: data.content,
      actorId: session.user.id,
      documentId: document.id,
      projectId: document.projectId,
      contextType: "DOCUMENTATION"
    })

    revalidatePath(`/documentation/${id}`)
    return { success: true, document }
  } catch (error) {
    console.error("updateDocument error:", error)
    return { success: false, error: "Failed to update document" }
  }
}

export async function deleteDocument(id: string) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, error: "Unauthorized" }

  try {
    const document = await prisma.document.findUnique({
      where: { id },
      include: { taskLinks: true }
    })

    if (!document) return { success: false, error: "Document not found" }

    // Log for all linked tasks before deletion
    for (const link of document.taskLinks) {
      await prisma.auditLog.create({
        data: {
          action: "DELETE_DOCUMENT",
          details: `Deleted documentation: ${document.title}`,
          userId: session.user.id,
          taskId: link.taskId
        }
      })
    }

    await prisma.document.delete({ where: { id } })
    revalidatePath("/documentation")
    return { success: true }
  } catch (error) {
    console.error("deleteDocument error:", error)
    return { success: false, error: "Failed to delete document" }
  }
}
