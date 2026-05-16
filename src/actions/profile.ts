"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"

export async function getUserProfile() {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return { success: false, error: "Unauthorized", user: null }
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { name: true, email: true }
    })

    return { success: true, user }
  } catch (error) {
    console.error("getUserProfile error:", error)
    return { success: false, error: "Failed to fetch profile", user: null }
  }
}

export async function updateUserProfile(data: { name: string, currentPassword?: string, newPassword?: string }) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return { success: false, error: "Unauthorized" }
    }

    const updateData: any = { name: data.name }
    
    if (data.newPassword && data.newPassword.trim().length > 0) {
      if (!data.currentPassword) {
        return { success: false, error: "Current password is required to set a new password." }
      }

      const user = await prisma.user.findUnique({
        where: { email: session.user.email }
      })

      if (!user || !user.password) {
        return { success: false, error: "Account does not have a password set." }
      }

      const isValid = await bcrypt.compare(data.currentPassword, user.password)
      if (!isValid) {
        return { success: false, error: "Incorrect current password." }
      }

      updateData.password = await bcrypt.hash(data.newPassword, 10)
    }

    await prisma.user.update({
      where: { email: session.user.email },
      data: updateData
    })

    revalidatePath("/profile")
    return { success: true }
  } catch (error) {
    console.error("updateUserProfile error:", error)
    return { success: false, error: "Failed to update profile" }
  }
}
