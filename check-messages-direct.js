const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  
  const messages = await prisma.chatMessage.findMany({
    where: {
      OR: [
        { content: { contains: 'data-type="file-mention"' } },
        { content: { contains: 'file-mention' } }
      ]
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { attachments: true }
  });
  console.log(JSON.stringify(messages, null, 2));
  await prisma.$disconnect();
  await pool.end();
}

main().catch(console.error);
