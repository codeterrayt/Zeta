import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const comments = await prisma.comment.findMany({
    include: {
      user: true,
      task: true,
      sprint: true
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  })
  console.log(JSON.stringify(comments, null, 2))
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
