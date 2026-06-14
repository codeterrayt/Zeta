"use server"

import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { ensureOwnerExists } from "@/lib/init"
import { queueEmail } from "@/lib/mail-queue"

/** Derive a unique username from an email address. */
async function deriveUsername(email: string): Promise<string> {
  const [localPart, fullDomain] = email.split("@")
  const domainLabel = fullDomain.split(".")[0]

  const baseUsername = localPart
  const existing = await prisma.user.findFirst({ where: { name: baseUsername } })

  if (!existing) return baseUsername

  const qualified = `${localPart}.${domainLabel}`
  const existingQualified = await prisma.user.findFirst({ where: { name: qualified } })
  if (!existingQualified) return qualified

  let suffix = 2
  while (true) {
    const candidate = `${qualified}${suffix}`
    const taken = await prisma.user.findFirst({ where: { name: candidate } })
    if (!taken) return candidate
    suffix++
  }
}

export async function registerUser(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const inviteToken = formData.get("token") as string | null

  if (!email || !password) {
    return { error: "Missing required fields" }
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { error: "Invalid email address" }
  }

  // Password strength: minimum 8 characters
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters long" }
  }

  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) {
    return { error: "User already exists with this email" }
  }

  try {
    const name = await deriveUsername(email)
    const hashedPassword = await bcrypt.hash(password, 10)

    // Check system setup: is it the first user?
    const userCount = await prisma.user.count()
    const isFirstUser = userCount === 0

    // Check if registering via invitation
    let userRole = "USER"
    let isOwner = false
    let isVerified = false

    if (isFirstUser) {
      isOwner = true
      userRole = "ADMIN"
      isVerified = true
    } else if (inviteToken) {
      const invite = await prisma.userInvite.findFirst({
        where: { token: inviteToken, email, isUsed: false, expiresAt: { gt: new Date() } }
      })
      if (!invite) {
        return { error: "Invalid, expired, or mismatching invitation token." }
      }
      userRole = invite.role
      isVerified = true

      // Mark invite as used
      await prisma.userInvite.update({
        where: { id: invite.id },
        data: { isUsed: true }
      })
    }

    // Check SMTP config status to see if direct registration needs verification
    const smtpSettings = await prisma.systemSettings.findUnique({
      where: { id: "system" }
    })
    const isSmtpConfigured = !!(
      smtpSettings &&
      smtpSettings.smtpHost &&
      smtpSettings.smtpPort &&
      smtpSettings.smtpUser &&
      smtpSettings.smtpPass
    )

    // Direct registration (no invite token) requires verification only if SMTP is active
    if (!isFirstUser && !inviteToken) {
      if (isSmtpConfigured) {
        isVerified = false
      } else {
        isVerified = true // Auto-verify if no SMTP is configured so app doesn't block
      }
    }

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: userRole as any,
        isOwner,
        emailVerified: isVerified ? new Date() : null
      }
    })

    // Auto-create initial blank Settings for the user
    await prisma.settings.upsert({
      where: { userId: newUser.id },
      create: { userId: newUser.id },
      update: {}
    })

    // If SMTP is active and user is not verified, generate verification code
    if (!isVerified && isSmtpConfigured) {
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
      const expires = new Date(Date.now() + 15 * 60 * 1000) // 15 mins

      // Save token in VerificationToken table
      await prisma.verificationToken.upsert({
        where: {
          identifier_token: {
            identifier: email,
            token: verificationCode
          }
        },
        create: {
          identifier: email,
          token: verificationCode,
          expires
        },
        update: {
          expires
        }
      })

      // Send verification email
      const subject = "Verify your Zeta Account"
      const body = `
        <div style="font-family: sans-serif; padding: 20px; max-width: 600px;">
          <h2>Welcome to Zeta!</h2>
          <p>Please use the following 6-digit verification code to complete your registration:</p>
          <div style="font-size: 24px; font-weight: bold; background: #f4f5f7; padding: 15px; border-radius: 6px; letter-spacing: 5px; text-align: center; margin: 15px 0;">
            ${verificationCode}
          </div>
          <p>This verification code is valid for 15 minutes.</p>
        </div>
      `
      await queueEmail(email, subject, body)
      return { success: true, requiresVerification: true }
    }

    // Trigger ensureOwnerExists in the background on any new registration
    setImmediate(() => {
      ensureOwnerExists()
    })

    return { success: true, requiresVerification: false }
  } catch (err) {
    console.error("Registration error:", err)
    return { error: "Something went wrong during registration" }
  }
}

// Verify verification code
export async function verifyEmailCode(email: string, code: string) {
  try {
    const tokenRecord = await prisma.verificationToken.findFirst({
      where: {
        identifier: email,
        token: code,
        expires: { gt: new Date() }
      }
    })

    if (!tokenRecord) {
      return { success: false, error: "Invalid or expired verification code." }
    }

    // Mark user email as verified
    await prisma.user.update({
      where: { email },
      data: { emailVerified: new Date() }
    })

    // Delete verification token
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: email,
          token: code
        }
      }
    })

    return { success: true }
  } catch (error) {
    console.error("verifyEmailCode error:", error)
    return { success: false, error: "Failed to verify code" }
  }
}

// Send verification code again (Resend)
export async function resendVerificationCode(email: string) {
  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return { success: false, error: "User not found" }
    if (user.emailVerified) return { success: false, error: "Email is already verified" }

    const smtpSettings = await prisma.systemSettings.findUnique({
      where: { id: "system" }
    })
    const isSmtpConfigured = !!(
      smtpSettings &&
      smtpSettings.smtpHost &&
      smtpSettings.smtpPort &&
      smtpSettings.smtpUser &&
      smtpSettings.smtpPass
    )

    if (!isSmtpConfigured) {
      // Auto-verify if SMTP was disabled in the meantime
      await prisma.user.update({
        where: { email },
        data: { emailVerified: new Date() }
      })
      return { success: true, requiresVerification: false }
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
    const expires = new Date(Date.now() + 15 * 60 * 1000)

    await prisma.verificationToken.upsert({
      where: {
        identifier_token: {
          identifier: email,
          token: verificationCode
        }
      },
      create: {
        identifier: email,
        token: verificationCode,
        expires
      },
      update: {
        expires
      }
    })

    const subject = "Verify your Zeta Account"
    const body = `
      <div style="font-family: sans-serif; padding: 20px; max-width: 600px;">
        <h2>Verify your Zeta Account</h2>
        <p>Please use the following 6-digit verification code to complete your registration:</p>
        <div style="font-size: 24px; font-weight: bold; background: #f4f5f7; padding: 15px; border-radius: 6px; letter-spacing: 5px; text-align: center; margin: 15px 0;">
          ${verificationCode}
        </div>
        <p>This verification code is valid for 15 minutes.</p>
      </div>
    `
    await queueEmail(email, subject, body)
    return { success: true, requiresVerification: true }
  } catch (error) {
    console.error("resendVerificationCode error:", error)
    return { success: false, error: "Failed to resend code" }
  }
}

// Request password reset email
export async function requestPasswordReset(email: string) {
  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      // Return success anyway to prevent email enumeration
      return { success: true }
    }

    const smtpSettings = await prisma.systemSettings.findUnique({
      where: { id: "system" }
    })
    const isSmtpConfigured = !!(
      smtpSettings &&
      smtpSettings.smtpHost &&
      smtpSettings.smtpPort &&
      smtpSettings.smtpUser &&
      smtpSettings.smtpPass
    )

    if (!isSmtpConfigured) {
      return { success: false, error: "Password reset is unavailable because SMTP is not configured." }
    }

    const token = crypto.randomBytes(32).toString("hex")
    const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await prisma.verificationToken.upsert({
      where: {
        identifier_token: {
          identifier: email,
          token
        }
      },
      create: {
        identifier: email,
        token,
        expires
      },
      update: {
        expires
      }
    })

    const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
    const resetUrl = `${appUrl}/reset-password?email=${email}&token=${token}`

    const subject = "Reset your Zeta password"
    const body = `
      <div style="font-family: sans-serif; padding: 20px; max-width: 600px;">
        <h2>Password Reset Request</h2>
        <p>You requested a password reset for your Zeta account.</p>
        <p>Please click the button below to choose a new password. This link is valid for 1 hour.</p>
        <a href="${resetUrl}" style="display: inline-block; background: #0052CC; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 15px 0;">Reset Password</a>
        <p>Or copy and paste this link in your browser:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>If you did not request this, you can ignore this email safely.</p>
      </div>
    `

    await queueEmail(email, subject, body)
    return { success: true }
  } catch (error) {
    console.error("requestPasswordReset error:", error)
    return { success: false, error: "Failed to request password reset" }
  }
}

// Reset password using token
export async function resetPassword(email: string, token: string, passwordNew: string) {
  try {
    const tokenRecord = await prisma.verificationToken.findFirst({
      where: {
        identifier: email,
        token,
        expires: { gt: new Date() }
      }
    })

    if (!tokenRecord) {
      return { success: false, error: "Invalid or expired password reset link." }
    }

    if (!passwordNew || passwordNew.length < 8) {
      return { success: false, error: "Password must be at least 8 characters long" }
    }

    const hashedPassword = await bcrypt.hash(passwordNew, 10)

    // Update user password and mark email verified (since they opened reset link)
    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        emailVerified: new Date()
      }
    })

    // Delete token
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: email,
          token
        }
      }
    })

    return { success: true }
  } catch (error) {
    console.error("resetPassword error:", error)
    return { success: false, error: "Failed to reset password" }
  }
}
