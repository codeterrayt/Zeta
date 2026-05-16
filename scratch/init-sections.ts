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
    include: {
      boardSections: true,
    }
  })
  
  const defaultSections = ["BACKLOG", "IN_PROGRESS", "REVIEW", "DONE"]

  for (const project of projects) {
    if (project.boardSections.length === 0) {
      console.log(`Initializing sections for project: ${project.name} (${project.id})`)
      await prisma.boardSection.createMany({
        data: defaultSections.map((name, index) => ({
          projectId: project.id,
          name,
          order: index,
        })),
      })
      console.log(`  Added default sections.`)
    } else {
      console.log(`Project ${project.name} already has ${project.boardSections.length} sections.`)
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
