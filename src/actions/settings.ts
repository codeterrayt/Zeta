"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"

export async function updateSettings(data: {
  highFocusMax: number,
  mediumFocusMax: number,
  aiEnabled: boolean,
  aiModel: string,
  askTimelineComment: boolean
}) {
  const session = await auth()
  const userId = (session?.user as any)?.id
  if (!userId) return { success: false, error: "Unauthorized" }

  try {
    await prisma.settings.update({
      where: { userId },
      data: {
        highFocusMax: data.highFocusMax,
        mediumFocusMax: data.mediumFocusMax,
        aiEnabled: data.aiEnabled,
        aiModel: data.aiModel,
        askTimelineComment: data.askTimelineComment
      }
    })

    revalidatePath("/")
    revalidatePath("/settings")
    return { success: true }
  } catch (error) {
    console.error("updateSettings error:", error)
    return { success: false, error: "Failed to update settings" }
  }
}

export async function getUserSettings() {
  const session = await auth()
  const userId = (session?.user as any)?.id
  if (!userId) return { success: false, error: "Unauthorized" }

  try {
    let settings = await prisma.settings.findUnique({
      where: { userId }
    })

    if (!settings) {
      settings = await prisma.settings.create({
        data: { userId }
      })
    }

    return { success: true, settings }
  } catch (error) {
    console.error("getUserSettings error:", error)
    return { success: false, error: "Failed to fetch settings" }
  }
}
