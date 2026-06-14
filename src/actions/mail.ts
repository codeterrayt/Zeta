"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import nodemailer from "nodemailer"
import crypto from "crypto"
import { queueEmail } from "@/lib/mail-queue"

// Helper to check if current user is an Admin or Owner
async function checkAdminOrOwner() {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return null

  const user = await prisma.user.findUnique({
    where: { id: userId }
  })
  if (!user || (user.role !== "ADMIN" && !user.isOwner)) {
    return null
  }
  return user
}

// Test SMTP connection parameters in real-time
export async function testSmtpConnection(data: {
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPass: string
  smtpSecure: boolean
}) {
  const admin = await checkAdminOrOwner()
  if (!admin) return { success: false, error: "Unauthorized" }

  try {
    let passwordToTest = data.smtpPass
    if (passwordToTest === "" || passwordToTest === "••••••••") {
      const existing = await prisma.systemSettings.findUnique({
        where: { id: "system" }
      })
      if (existing?.smtpPass) {
        passwordToTest = existing.smtpPass
      }
    }

    const transporter = nodemailer.createTransport({
      host: data.smtpHost,
      port: data.smtpPort,
      secure: data.smtpSecure,
      auth: {
        user: data.smtpUser,
        pass: passwordToTest
      }
    })

    await transporter.verify()
    return { success: true }
  } catch (error: any) {
    console.error("testSmtpConnection error:", error)
    return { success: false, error: error.message || "Connection failed" }
  }
}

// Save SMTP configuration
export async function saveSmtpSettings(data: {
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPass: string
  smtpFrom: string
  smtpSecure: boolean
}) {
  const admin = await checkAdminOrOwner()
  if (!admin) return { success: false, error: "Unauthorized" }

  try {
    const existing = await prisma.systemSettings.findUnique({
      where: { id: "system" }
    })

    let finalPass = data.smtpPass
    if (finalPass === "" || finalPass === "••••••••") {
      finalPass = existing?.smtpPass || ""
    }

    const settingsData = {
      smtpHost: data.smtpHost,
      smtpPort: data.smtpPort,
      smtpUser: data.smtpUser,
      smtpPass: finalPass,
      smtpFrom: data.smtpFrom,
      smtpSecure: data.smtpSecure
    }

    await prisma.systemSettings.upsert({
      where: { id: "system" },
      create: {
        id: "system",
        ...settingsData
      },
      update: {
        ...settingsData
      }
    })

    return { success: true }
  } catch (error) {
    console.error("saveSmtpSettings error:", error)
    return { success: false, error: "Failed to save SMTP settings" }
  }
}

// Save AI configurations
export async function saveAiSettings(data: {
  aiEnabled: boolean
  aiModel: string
  aiApiKey: string
}) {
  const admin = await checkAdminOrOwner()
  if (!admin) return { success: false, error: "Unauthorized" }

  try {
    const existing = await prisma.systemSettings.findUnique({
      where: { id: "system" }
    })

    let finalApiKey = data.aiApiKey
    if (finalApiKey === "" || finalApiKey === "••••••••") {
      finalApiKey = existing?.aiApiKey || ""
    }

    const aiData = {
      aiEnabled: data.aiEnabled,
      aiModel: data.aiModel,
      aiApiKey: finalApiKey
    }

    await prisma.systemSettings.upsert({
      where: { id: "system" },
      create: {
        id: "system",
        ...aiData
      },
      update: {
        ...aiData
      }
    })

    return { success: true }
  } catch (error) {
    console.error("saveAiSettings error:", error)
    return { success: false, error: "Failed to save AI settings" }
  }
}

// Get global system configurations (with masked password and API key)
export async function getSystemSettings() {
  const admin = await checkAdminOrOwner()
  if (!admin) return { success: false, error: "Unauthorized" }

  try {
    const settings = await prisma.systemSettings.findUnique({
      where: { id: "system" }
    })

    if (!settings) return { success: true, settings: null }

    return {
      success: true,
      settings: {
        ...settings,
        smtpPass: settings.smtpPass ? "••••••••" : "",
        aiApiKey: settings.aiApiKey ? "••••••••" : ""
      }
    }
  } catch (error) {
    console.error("getSystemSettings error:", error)
    return { success: false, error: "Failed to fetch system settings" }
  }
}

// Expose internal raw settings fetcher for Gemini usage
async function getRawSystemSettingsInternal() {
  return await prisma.systemSettings.findUnique({
    where: { id: "system" }
  })
}

// Send user invitation email
export async function sendInvitation(email: string, role: "USER" | "ADMIN") {
  const admin = await checkAdminOrOwner()
  if (!admin) return { success: false, error: "Unauthorized" }

  try {
    const token = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    await prisma.userInvite.upsert({
      where: { email },
      create: {
        email,
        role,
        token,
        expiresAt
      },
      update: {
        role,
        token,
        isUsed: false,
        expiresAt,
        createdAt: new Date()
      }
    })

    const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
    const inviteUrl = `${appUrl}/register?token=${token}`

    const subject = "Invitation to join Zeta"
    const body = `
      <div style="font-family: sans-serif; padding: 20px; max-width: 600px;">
        <h2>You are invited to join Zeta!</h2>
        <p>${admin.name || admin.email} has invited you to join the Zeta platform as a <strong>${role}</strong>.</p>
        <p>Please click the button below to register your account and set up your password. This invitation is valid for 24 hours.</p>
        <a href="${inviteUrl}" style="display: inline-block; background: #0052CC; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 15px 0;">Join Zeta Now</a>
        <p>Or copy and paste this link in your browser:</p>
        <p><a href="${inviteUrl}">${inviteUrl}</a></p>
      </div>
    `

    await queueEmail(email, subject, body)
    return { success: true }
  } catch (error) {
    console.error("sendInvitation error:", error)
    return { success: false, error: "Failed to send invitation" }
  }
}

// Get user invitations list
export async function getInvitations() {
  const admin = await checkAdminOrOwner()
  if (!admin) return { success: false, error: "Unauthorized" }

  try {
    const invites = await prisma.userInvite.findMany({
      orderBy: { createdAt: "desc" }
    })
    return { success: true, invites }
  } catch (error) {
    console.error("getInvitations error:", error)
    return { success: false, error: "Failed to fetch invites" }
  }
}

// Revoke user invitation
export async function revokeInvitation(inviteId: string) {
  const admin = await checkAdminOrOwner()
  if (!admin) return { success: false, error: "Unauthorized" }

  try {
    await prisma.userInvite.delete({
      where: { id: inviteId }
    })
    return { success: true }
  } catch (error) {
    console.error("revokeInvitation error:", error)
    return { success: false, error: "Failed to revoke invitation" }
  }
}

// Toggle user role privilege (Make ADMIN / USER - Owner only)
export async function toggleUserPrivilege(userIdToToggle: string, makeAdmin: boolean) {
  const admin = await checkAdminOrOwner()
  if (!admin || !admin.isOwner) {
    return { success: false, error: "Only the system owner can manage admin privileges." }
  }

  // Prevent self demotion
  if (admin.id === userIdToToggle) {
    return { success: false, error: "You cannot change your own owner privileges." }
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userIdToToggle }
    })
    if (!user) return { success: false, error: "User not found" }
    if (user.isOwner) return { success: false, error: "Cannot modify privileges of the owner." }

    await prisma.user.update({
      where: { id: userIdToToggle },
      data: {
        role: makeAdmin ? "ADMIN" : "USER"
      }
    })

    return { success: true }
  } catch (error) {
    console.error("toggleUserPrivilege error:", error)
    return { success: false, error: "Failed to toggle user privilege" }
  }
}

// List all users in the system (Owner only, for privilege management)
export async function listSystemUsers() {
  const admin = await checkAdminOrOwner()
  if (!admin || !admin.isOwner) {
    return { success: false, error: "Unauthorized" }
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isOwner: true
      },
      orderBy: { id: "asc" }
    })
    return { success: true, users }
  } catch (error) {
    console.error("listSystemUsers error:", error)
    return { success: false, error: "Failed to fetch users" }
  }
}
