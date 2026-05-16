"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { startOfMonth, endOfMonth, subMonths, format, eachDayOfInterval, subDays } from "date-fns"

export async function getDashboardStats() {
  const session = await auth()
  const userId = (session?.user as any)?.id
  if (!userId) return { success: false, error: "Unauthorized" }

  try {
    const [
      totalTasks,
      completedTasks,
      inProgressTasks,
      blockedTasks,
      recentActivity,
      projects,
      documentsCount
    ] = await Promise.all([
      prisma.task.count({ where: { assignments: { some: { userId } } } }),
      prisma.task.count({ where: { assignments: { some: { userId } }, status: "DONE" } }),
      prisma.task.count({ where: { assignments: { some: { userId } }, status: "IN_PROGRESS" } }),
      prisma.task.count({ where: { assignments: { some: { userId } }, status: "BACKLOG" } }), // Using BACKLOG as placeholder for blocked if not explicit
      prisma.task.findMany({
        where: { assignments: { some: { userId } } },
        orderBy: { updatedAt: "desc" },
        take: 5,
        include: { project: { select: { name: true } } }
      }),
      prisma.project.findMany({
        where: { members: { some: { userId } } },
        include: {
          _count: {
            select: { tasks: true }
          }
        }
      }),
      prisma.document.count({ where: { authorId: userId } })
    ])

    // Task Completion Trend (last 7 days)
    const last7Days = eachDayOfInterval({
      start: subDays(new Date(), 6),
      end: new Date()
    })

    const completionTrend = await Promise.all(last7Days.map(async (day) => {
      const count = await prisma.task.count({
        where: {
          assignments: { some: { userId } },
          status: "DONE",
          updatedAt: {
            gte: day,
            lt: new Date(day.getTime() + 24 * 60 * 60 * 1000)
          }
        }
      })
      return {
        date: format(day, "MMM d"),
        completed: count
      }
    }))

    // Project Distribution
    const projectStats = projects.map(p => ({
      name: p.name,
      tasks: p._count.tasks
    }))

    return {
      success: true,
      stats: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        blockedTasks,
        documentsCount,
        recentActivity,
        completionTrend,
        projectStats
      }
    }
  } catch (error) {
    console.error("getDashboardStats error:", error)
    return { success: false, error: "Failed to fetch dashboard data" }
  }
}
