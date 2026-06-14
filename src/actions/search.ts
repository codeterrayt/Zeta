"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function globalSearch(
  query: string,
  filter: "all" | "projects" | "tasks" | "sprints" | "docs" | "people" | "chats" | "storage" | "notifications" = "all"
) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return { success: false, error: "Unauthorized" }

  const trimmedQuery = query.trim()
  if (!trimmedQuery) {
    return {
      success: true,
      results: {
        projects: [],
        tasks: [],
        sprints: [],
        documents: [],
        users: [],
        chatGroups: [],
        chatMessages: [],
        storage: [],
        notifications: []
      }
    }
  }

  try {
    const results: any = {
      projects: [],
      tasks: [],
      sprints: [],
      documents: [],
      users: [],
      chatGroups: [],
      chatMessages: [],
      storage: [],
      notifications: []
    }

    // 1. Projects
    if (filter === "all" || filter === "projects") {
      results.projects = await prisma.project.findMany({
        where: {
          OR: [
            { name: { contains: trimmedQuery, mode: "insensitive" } },
            { description: { contains: trimmedQuery, mode: "insensitive" } }
          ]
        },
        take: 5,
        select: { id: true, name: true }
      })
    }

    // 2. Tasks
    if (filter === "all" || filter === "tasks") {
      results.tasks = await prisma.task.findMany({
        where: {
          OR: [
            { title: { contains: trimmedQuery, mode: "insensitive" } },
            { description: { contains: trimmedQuery, mode: "insensitive" } }
          ]
        },
        take: 10,
        select: { id: true, title: true, projectId: true }
      })
    }

    // 3. Sprints
    if (filter === "all" || filter === "sprints") {
      results.sprints = await prisma.sprint.findMany({
        where: {
          name: { contains: trimmedQuery, mode: "insensitive" }
        },
        take: 5,
        select: { id: true, name: true, projectId: true }
      })
    }

    // 4. Documents (Documentation)
    if (filter === "all" || filter === "docs") {
      results.documents = await prisma.document.findMany({
        where: {
          OR: [
            { title: { contains: trimmedQuery, mode: "insensitive" } },
            { content: { contains: trimmedQuery, mode: "insensitive" } }
          ]
        },
        take: 5,
        select: { id: true, title: true }
      })
    }

    // 5. People (Users)
    if (filter === "all" || filter === "people") {
      results.users = await prisma.user.findMany({
        where: {
          id: { not: userId },
          OR: [
            { name: { contains: trimmedQuery, mode: "insensitive" } },
            { email: { contains: trimmedQuery, mode: "insensitive" } }
          ]
        },
        take: 5,
        select: { id: true, name: true, email: true, image: true }
      })
    }

    // 6. Chats (Chat Groups & Message contents)
    if (filter === "all" || filter === "chats") {
      results.chatGroups = await prisma.chatGroup.findMany({
        where: {
          isGroup: true,
          name: { contains: trimmedQuery, mode: "insensitive" },
          members: { some: { userId } }
        },
        take: 5,
        select: { id: true, name: true }
      })

      results.chatMessages = await prisma.chatMessage.findMany({
        where: {
          isDeleted: false,
          content: { contains: trimmedQuery, mode: "insensitive" },
          NOT: {
            content: { startsWith: "[system]" }
          },
          chatGroup: { members: { some: { userId } } }
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          content: true,
          chatGroupId: true,
          createdAt: true,
          sender: { select: { name: true } },
          chatGroup: {
            select: {
              name: true,
              isGroup: true,
              members: {
                where: { userId: { not: userId } },
                select: { user: { select: { name: true } } },
                take: 1
              }
            }
          }
        }
      })
    }

    // 7. Storage
    if (filter === "all" || filter === "storage") {
      results.storage = await prisma.attachment.findMany({
        where: {
          name: { contains: trimmedQuery, mode: "insensitive" },
          OR: [
            // User uploaded it
            { userId },
            // In a chat group user is in
            { chatGroup: { members: { some: { userId } } } },
            // In a project task where user is a member
            { task: { project: { members: { some: { userId } } } } }
          ]
        },
        take: 5,
        select: {
          id: true,
          name: true,
          url: true,
          type: true,
          size: true
        }
      })
    }

    // 8. Notifications
    if (filter === "all" || filter === "notifications") {
      results.notifications = await prisma.notification.findMany({
        where: {
          userId,
          OR: [
            { title: { contains: trimmedQuery, mode: "insensitive" } },
            { content: { contains: trimmedQuery, mode: "insensitive" } }
          ]
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          type: true,
          title: true,
          content: true,
          link: true,
          isViewed: true
        }
      })
    }

    return {
      success: true,
      results
    }
  } catch (error) {
    console.error("globalSearch error:", error)
    return { success: false, error: "Search failed" }
  }
}
