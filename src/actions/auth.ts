"use server"

import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

/** Derive a unique username from an email address.
 *  1st try: `local-part`  (e.g. rohan.prajapati)
 *  2nd try: `local-part.domain-without-tld` (e.g. rohan.prajapati.gmail)
 */
async function deriveUsername(email: string): Promise<string> {
  const [localPart, fullDomain] = email.split("@")
  // Strip TLD: "gmail.com" → "gmail", "company.co.uk" → "company"
  const domainLabel = fullDomain.split(".")[0]

  const baseUsername = localPart
  const existing = await prisma.user.findFirst({ where: { name: baseUsername } })

  if (!existing) return baseUsername

  // Collision — check if the domain-qualified name is taken too
  const qualified = `${localPart}.${domainLabel}`
  const existingQualified = await prisma.user.findFirst({ where: { name: qualified } })
  if (!existingQualified) return qualified

  // Last resort: add a numeric suffix
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

  if (!email || !password) {
    return { error: "Missing required fields" }
  }

  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) {
    return { error: "User already exists with this email" }
  }

  try {
    const name = await deriveUsername(email)
    const hashedPassword = await bcrypt.hash(password, 10)

    await prisma.user.create({
      data: { name, email, password: hashedPassword }
    })

    return { success: true }
  } catch (err) {
    console.error("Registration error:", err)
    return { error: "Something went wrong during registration" }
  }
}

