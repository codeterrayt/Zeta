const { Pool } = require("pg")
const { PrismaPg } = require("@prisma/adapter-pg")
const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")
require("dotenv").config()

const connectionString = `${process.env.DATABASE_URL}`
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: "rohan@gmail.com" }
    })
    
    if (!user) {
      console.log("User not found!")
      return
    }
    
    console.log("User in DB:", {
      id: user.id,
      email: user.email,
      passwordHash: user.password,
      emailVerified: user.emailVerified
    })
    
    const isMatch = await bcrypt.compare("rohan@gmail.com", user.password)
    console.log("Comparison result for 'rohan@gmail.com':", isMatch)
  } catch (error) {
    console.error("Error verifying password:", error)
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main()
