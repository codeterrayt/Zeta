"use server"

import { prisma } from "@/lib/prisma"

export async function searchUsers(query: string, excludeProjectId?: string, limit: number = 10) {
  if (!query || query.trim().length < 2) return []

  try {
    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
            ]
          },
          excludeProjectId ? {
            projects: {
              none: { projectId: excludeProjectId }
            }
          } : {}
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
      take: limit,
    })

    return users
  } catch (error) {
    console.error("searchUsers error:", error)
    return []
  }
}
