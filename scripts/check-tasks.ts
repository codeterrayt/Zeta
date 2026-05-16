import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({ take: 1 })
  if (users.length === 0) {
    console.log("No users found")
    return
  }
  const userId = users[0].id
  console.log(`Checking tasks for user: ${userId} (${users[0].email})`)

  const tasks = await prisma.task.findMany({
    where: { assignments: { some: { userId } } }
  })

  console.log(`Total tasks found: ${tasks.length}`)
  const statusCounts: Record<string, number> = {}
  let totalPoints = 0
  tasks.forEach(t => {
    statusCounts[t.status] = (statusCounts[t.status] || 0) + 1
    totalPoints += (t.points || 0)
    console.log(`- [${t.status}] ${t.title} (Points: ${t.points})`)
  })

  console.log(`\nStatus Breakdown:`, statusCounts)
  console.log(`Total Story Points: ${totalPoints}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
