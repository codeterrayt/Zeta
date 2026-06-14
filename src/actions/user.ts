"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function searchUsers(query: string, excludeProjectId?: string, limit: number = 10) {
  const session = await auth()
  if (!session?.user?.id) return []

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
