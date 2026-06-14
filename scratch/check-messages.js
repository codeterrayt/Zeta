require("dotenv").config();
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const messages = await prisma.chatMessage.findMany({
    where: {
      OR: [
        { content: { contains: "href" } },
        { content: { contains: "uploads" } },
        { content: { contains: "download" } }
      ]
    },
    orderBy: { createdAt: "desc" }
  });
  console.log(JSON.stringify(messages, null, 2));
}

main().catch(console.error).finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
