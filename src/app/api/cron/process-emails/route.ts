import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// In a real application, you'd use a service like Resend, SendGrid, or Nodemailer.
// This is a placeholder for the actual SMTP integration.
async function sendEmailViaSMTP(to: string, subject: string, body: string) {
  console.log(`Sending email to ${to}...`)
  // Mock async delay
  await new Promise((resolve) => setTimeout(resolve, 500))
  // Mock success
  return true
}

export async function GET(request: Request) {
  try {
    // 1. Fetch pending emails from the queue
    const pendingEmails = await prisma.emailQueue.findMany({
      where: {
        status: "PENDING",
        attempts: { lt: 3 } // max 3 attempts
      },
      take: 50 // process in batches
    })

    if (pendingEmails.length === 0) {
      return NextResponse.json({ success: true, message: "No pending emails." })
    }

    const results = []

    // 2. Process each email
    for (const email of pendingEmails) {
      try {
        const success = await sendEmailViaSMTP(email.to, email.subject, email.body)
        
        if (success) {
          await prisma.emailQueue.update({
            where: { id: email.id },
            data: { status: "SENT", processedAt: new Date(), attempts: { increment: 1 } }
          })
          results.push({ id: email.id, status: "SENT" })
        } else {
          throw new Error("SMTP service failed to send")
        }
      } catch (err) {
        await prisma.emailQueue.update({
          where: { id: email.id },
          data: { status: "FAILED", attempts: { increment: 1 } }
        })
        results.push({ id: email.id, status: "FAILED" })
      }
    }

    return NextResponse.json({ success: true, processed: results.length, results })
  } catch (error) {
    console.error("Cron Error:", error)
    return NextResponse.json({ success: false, error: "Failed to process email queue" }, { status: 500 })
  }
}
