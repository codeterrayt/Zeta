import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import * as dotenv from "dotenv"
import path from "path"

dotenv.config({ path: path.join(__dirname, "../.env") })

const connectionString = `${process.env.DATABASE_URL}`
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const projects = await prisma.project.findMany({
    where: {
      members: { none: {} }
    }
  })
  
  const users = await prisma.user.findMany({
    where: { email: { not: "system@openjira.local" } }
  })
  
  if (users.length === 0) {
    console.log("No non-system users found to assign.")
    return
  }

  const defaultUser = users[0]
  console.log(`Rescuing ${projects.length} projects by assigning to ${defaultUser.email}...`)

  for (const project of projects) {
    await prisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: defaultUser.id,
        role: "ADMIN"
      }
    })
    console.log(`  Added ${defaultUser.email} to ${project.name}`)
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
