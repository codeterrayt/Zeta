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
      members: {
        include: { user: true }
      },
    },
    orderBy: { createdAt: "desc" }
  })
  console.log("Total projects:", projects.length)
  projects.forEach(p => {
    console.log(`Project: ${p.name} (${p.id}) - CreatedAt: ${p.createdAt} - Members: ${p.members.length}`)
    p.members.forEach(m => {
      console.log(`  Member: ${m.user.email} (${m.role})`)
    })
  })
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
