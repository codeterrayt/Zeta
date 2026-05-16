"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { startOfMonth, endOfMonth, subMonths, format, eachDayOfInterval, subDays } from "date-fns"

import { getCurrentUserId } from "./project"

export async function getDashboardStats(filters?: {
  startDate?: Date,
  endDate?: Date,
  projectId?: string,
  sprintId?: string
}) {
  const userId = await getCurrentUserId()
  if (!userId) return { success: false, error: "Unauthorized" }

  try {
    const baseWhere: any = {
      assignments: { some: { userId } }
    }

    if (filters?.projectId && filters.projectId !== "ALL") {
      baseWhere.projectId = filters.projectId
    }
    if (filters?.sprintId && filters.sprintId !== "ALL") {
      baseWhere.sprintId = filters.sprintId
    }

    const dateWhere: any = { ...baseWhere }
    if (filters?.startDate || filters?.endDate) {
      dateWhere.createdAt = {}
      if (filters.startDate) dateWhere.createdAt.gte = filters.startDate
      if (filters.endDate) dateWhere.createdAt.lte = filters.endDate
    }

    const [
      totalTasks,
      completedTasks,
      inProgressTasks,
      blockedTasks,
      recentActivity,
      projects,
      documentsCount,
      settings,
      sprintsCount
    ] = await Promise.all([
      prisma.task.count({ where: dateWhere }),
      prisma.task.count({ where: { ...dateWhere, status: "DONE" } }),
      prisma.task.count({ where: { ...dateWhere, status: "IN_PROGRESS" } }),
      prisma.task.count({ where: { ...dateWhere, status: "BACKLOG" } }),
      prisma.task.findMany({
        where: baseWhere,
        orderBy: { updatedAt: "desc" },
        take: 5,
        include: { project: { select: { name: true } } }
      }),
      prisma.project.findMany({
        where: {
          OR: [
            { members: { some: { userId } } },
            { tasks: { some: { assignments: { some: { userId } } } } }
          ]
        },
        include: {
          _count: { select: { tasks: true } },
          sprints: { select: { id: true, name: true } }
        }
      }),
      prisma.document.count({ where: { authorId: userId } }),
      prisma.settings.findUnique({ where: { userId } }),
      prisma.sprint.count({ 
        where: { 
          project: { 
            OR: [
              { members: { some: { userId } } },
              { tasks: { some: { assignments: { some: { userId } } } } }
            ]
          } 
        } 
      })
    ])

    // Ensure settings exist
    let userSettings = settings
    if (!userSettings) {
      userSettings = await prisma.settings.create({
        data: { userId }
      })
    }

    // Task Completion Trend (last 7 days or filtered range)
    const trendDays = eachDayOfInterval({
      start: filters?.startDate || subDays(new Date(), 6),
      end: filters?.endDate || new Date()
    })

    const completionTrend = await Promise.all(trendDays.slice(-14).map(async (day) => {
      const count = await prisma.task.count({
        where: {
          ...baseWhere,
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

    // Project Distribution (Filtered by user's active tasks for "Project Load")
    const projectStats = await Promise.all(projects.map(async (p) => {
      const userActiveTasksInProject = await prisma.task.count({
        where: { ...baseWhere, projectId: p.id, status: "IN_PROGRESS" }
      })
      return {
        name: p.name,
        tasks: userActiveTasksInProject
      }
    }))

    // Total Points
    const pointsAggregate = await prisma.task.aggregate({
      where: dateWhere,
      _sum: { points: true }
    })
    const totalPoints = pointsAggregate._sum.points || 0

    // Avg Points
    const completedTasksWithPoints = await prisma.task.findMany({
      where: { ...dateWhere, status: "DONE" },
      select: { points: true }
    })
    const avgPoints = completedTasksWithPoints.length > 0
      ? (completedTasksWithPoints.reduce((acc, curr) => acc + (curr.points || 0), 0) / completedTasksWithPoints.length).toFixed(1)
      : "0"

    // Velocity Change
    const prevRangeStart = subDays(filters?.startDate || new Date(), 7)
    const prev7DaysCount = await prisma.task.count({
      where: {
        ...baseWhere,
        status: "DONE",
        updatedAt: {
          gte: prevRangeStart,
          lt: filters?.startDate || subDays(new Date(), 6)
        }
      }
    })
    const velocityChange = prev7DaysCount === 0 
      ? (completedTasks > 0 ? 100 : 0)
      : Math.round(((completedTasks - prev7DaysCount) / prev7DaysCount) * 100)

    // Trends
    const prevInProgress = await prisma.task.count({
      where: {
        ...baseWhere,
        status: "IN_PROGRESS",
        updatedAt: {
          gte: prevRangeStart,
          lt: filters?.startDate || subDays(new Date(), 6)
        }
      }
    })

    const trends = {
      total: 0, 
      completed: velocityChange,
      inProgress: prevInProgress === 0 
        ? (inProgressTasks > 0 ? 100 : 0)
        : Math.round(((inProgressTasks - prevInProgress) / prevInProgress) * 100),
      docs: 0
    }

    return {
      success: true,
      stats: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        blockedTasks,
        documentsCount,
        sprintsCount,
        recentActivity,
        completionTrend,
        projectStats,
        avgPoints,
        totalPoints,
        velocityChange,
        trends,
        thresholds: {
          high: userSettings.highFocusMax,
          medium: userSettings.mediumFocusMax
        },
        projects // Return projects with sprints for filtering
      }
    }
  } catch (error) {
    console.error("getDashboardStats error:", error)
    return { success: false, error: "Failed to fetch dashboard data" }
  }
}

export async function debugDashboard() {
  const userId = await getCurrentUserId()
  if (!userId) return { success: false }

  const tasks = await prisma.task.findMany({
    where: { assignments: { some: { userId } } },
    select: { title: true, status: true, projectId: true }
  })

  return { success: true, tasks }
}
