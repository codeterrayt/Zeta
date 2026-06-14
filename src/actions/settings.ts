"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { ensureOwnerExists } from "@/lib/init"

export async function updateSettings(data: {
  highFocusMax: number,
  mediumFocusMax: number,
  askTimelineComment: boolean,
  notificationsEnabled?: boolean
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
        askTimelineComment: data.askTimelineComment,
        notificationsEnabled: data.notificationsEnabled ?? true
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

  // Ensure owner setup is initialized
  await ensureOwnerExists()

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
