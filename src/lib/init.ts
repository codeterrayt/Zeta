import { prisma } from "@/lib/prisma"

export async function ensureOwnerExists() {
  try {
    const owner = await prisma.user.findFirst({
      where: { isOwner: true }
    })
    if (!owner) {
      // Find the first registered user sorted alphabetically by CUID ID (oldest)
      const firstUser = await prisma.user.findFirst({
        orderBy: { id: "asc" }
      })
      if (firstUser) {
        await prisma.user.update({
          where: { id: firstUser.id },
          data: {
            isOwner: true,
            role: "ADMIN",
            emailVerified: firstUser.emailVerified || new Date()
          }
        })
        console.log(`Designated first user ${firstUser.email} as the owner of Zeta.`)
      }
    }
  } catch (err) {
    console.error("ensureOwnerExists error:", err)
  }
}
