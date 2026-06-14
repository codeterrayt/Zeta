import nodemailer from "nodemailer"
import { prisma } from "@/lib/prisma"

let cachedTransporter: nodemailer.Transporter | null = null
let cachedConfigKey: string | null = null

function getConfigKey(settings: any) {
  if (!settings) return ""
  return `${settings.smtpHost}:${settings.smtpPort}:${settings.smtpUser}:${settings.smtpSecure}:${settings.smtpFrom}`
}

export async function getSmtpTransporter() {
  const settings = await prisma.systemSettings.findUnique({
    where: { id: "system" }
  })

  if (!settings || !settings.smtpHost || !settings.smtpPort || !settings.smtpUser || !settings.smtpPass) {
    return null
  }

  const currentKey = getConfigKey(settings)
  if (cachedTransporter && cachedConfigKey === currentKey) {
    return cachedTransporter
  }

  console.log("Creating new SMTP transporter connection pool...")
  cachedTransporter = nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpSecure,
    auth: {
      user: settings.smtpUser,
      pass: settings.smtpPass
    },
    pool: true, // Uses connection pooling
    maxConnections: 5,
    maxMessages: 100
  })
  cachedConfigKey = currentKey
  return cachedTransporter
}

let isProcessing = false

export async function processMailQueue() {
  if (isProcessing) return
  isProcessing = true

  try {
    const transporter = await getSmtpTransporter()
    if (!transporter) {
      isProcessing = false
      return
    }

    const settings = await prisma.systemSettings.findUnique({
      where: { id: "system" }
    })
    const fromAddress = settings?.smtpFrom || "noreply@zeta.com"

    const pendingJobs = await prisma.emailQueue.findMany({
      where: {
        status: { in: ["PENDING", "FAILED"] },
        attempts: { lt: 5 }
      },
      orderBy: { createdAt: "asc" },
      take: 5 // Concurrency limit
    })

    if (pendingJobs.length === 0) {
      isProcessing = false
      return
    }

    const jobIds = pendingJobs.map(j => j.id)
    await prisma.emailQueue.updateMany({
      where: { id: { in: jobIds } },
      data: { status: "PROCESSING" }
    })

    await Promise.all(
      pendingJobs.map(async (job) => {
        try {
          await transporter.sendMail({
            from: fromAddress,
            to: job.to,
            subject: job.subject,
            html: job.body
          })

          await prisma.emailQueue.update({
            where: { id: job.id },
            data: {
              status: "SENT",
              processedAt: new Date()
            }
          })
        } catch (err: any) {
          console.error(`Failed to send email to ${job.to}:`, err)
          await prisma.emailQueue.update({
            where: { id: job.id },
            data: {
              status: "FAILED",
              attempts: { increment: 1 }
            }
          })
        }
      })
    )
  } catch (error) {
    console.error("processMailQueue error:", error)
  } finally {
    isProcessing = false
  }
}

export async function queueEmail(to: string, subject: string, body: string) {
  try {
    const job = await prisma.emailQueue.create({
      data: {
        to,
        subject,
        body,
        status: "PENDING"
      }
    })

    const settings = await prisma.systemSettings.findUnique({
      where: { id: "system" }
    })
    
    if (settings && settings.smtpHost && settings.smtpPort && settings.smtpUser && settings.smtpPass) {
      setImmediate(() => {
        processMailQueue()
      })
    } else {
      console.log(`SMTP is not configured. Email to ${to} is queued as PENDING.`)
    }

    return { success: true, jobId: job.id }
  } catch (error) {
    console.error("queueEmail error:", error)
    return { success: false, error: "Failed to queue email" }
  }
}

// Next.js hot-reload safe background timer
if (typeof global !== "undefined") {
  if (!(global as any).__mailQueueInterval) {
    (global as any).__mailQueueInterval = setInterval(() => {
      processMailQueue()
    }, 30000)
    console.log("Background mail queue worker interval initialized.")
  }
}
