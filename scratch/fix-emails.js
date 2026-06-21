const { Pool } = require("pg")
const { PrismaPg } = require("@prisma/adapter-pg")
const { PrismaClient } = require("@prisma/client")
require("dotenv").config()

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function run() {
  await prisma.user.updateMany({
    data: {
      emailVerified: new Date()
    }
  })
  console.log("Updated all users: emailVerified set to now!")
  await prisma.$disconnect()
  await pool.end()
}
run().catch(console.error)
