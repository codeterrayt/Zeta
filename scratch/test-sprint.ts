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
  const project = await prisma.project.findFirst()
  if (!project) {
    console.log("No project found to test with.")
    return
  }

  console.log(`Testing sprint creation for project: ${project.name} (${project.id})`)
  
  try {
    const sprint = await prisma.sprint.create({
      data: {
        name: "Test Sprint " + Date.now(),
        projectId: project.id,
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }
    })
    console.log("SUCCESS: Created sprint", sprint.id)
  } catch (err: any) {
    console.error("FAILURE:", err.message)
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
