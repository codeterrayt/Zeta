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
      documentsCount,
      settings
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
      prisma.document.count({ where: { authorId: userId } }),
      prisma.settings.findUnique({ where: { userId } })
    ])

    // Ensure settings exist
    let userSettings = settings
    if (!userSettings) {
      userSettings = await prisma.settings.create({
        data: { userId }
      })
    }

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

    // Avg Points (of completed tasks)
    const completedTasksWithPoints = await prisma.task.findMany({
      where: { assignments: { some: { userId } }, status: "DONE" },
      select: { points: true }
    })
    const avgPoints = completedTasksWithPoints.length > 0
      ? (completedTasksWithPoints.reduce((acc, curr) => acc + (curr.points || 0), 0) / completedTasksWithPoints.length).toFixed(1)
      : "0"

    // Velocity Change (Last 7 days vs 7 days before that)
    const prev7DaysCount = await prisma.task.count({
      where: {
        assignments: { some: { userId } },
        status: "DONE",
        updatedAt: {
          gte: subDays(new Date(), 13),
          lt: subDays(new Date(), 6)
        }
      }
    })
    const current7DaysCount = completedTasks

    const velocityChange = prev7DaysCount === 0 
      ? (current7DaysCount > 0 ? 100 : 0)
      : Math.round(((current7DaysCount - prev7DaysCount) / prev7DaysCount) * 100)

    // Trends (Current 7 days vs Previous 7 days)
    const [prevTotal, prevInProgress, prevDocs] = await Promise.all([
      prisma.task.count({ where: { assignments: { some: { userId } }, createdAt: { lt: subDays(new Date(), 6), gte: subDays(new Date(), 13) } } }),
      prisma.task.count({ where: { assignments: { some: { userId } }, status: "IN_PROGRESS", updatedAt: { lt: subDays(new Date(), 6), gte: subDays(new Date(), 13) } } }),
      prisma.document.count({ where: { authorId: userId, createdAt: { lt: subDays(new Date(), 6), gte: subDays(new Date(), 13) } } })
    ])

    const calculateTrend = (current: number, prev: number) => {
      if (prev === 0) return current > 0 ? 100 : 0
      return Math.round(((current - prev) / prev) * 100)
    }

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
        projectStats,
        avgPoints,
        velocityChange,
        trends: {
          total: calculateTrend(totalTasks, prevTotal),
          completed: velocityChange,
          inProgress: calculateTrend(inProgressTasks, prevInProgress),
          docs: calculateTrend(documentsCount, prevDocs)
        },
        thresholds: {
          high: userSettings.highFocusMax,
          medium: userSettings.mediumFocusMax
        }
      }
    }
  } catch (error) {
    console.error("getDashboardStats error:", error)
    return { success: false, error: "Failed to fetch dashboard data" }
  }
}
