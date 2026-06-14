require("dotenv").config();
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const groupCount = await prisma.chatGroup.count();
  const memberCount = await prisma.chatMember.count();
  const messageCount = await prisma.chatMessage.count();
  const userCount = await prisma.user.count();

  console.log("Counts in DB:");
  console.log("Users:", userCount);
  console.log("ChatGroups:", groupCount);
  console.log("ChatMembers:", memberCount);
  console.log("ChatMessages:", messageCount);

  // Check if we can run getChatGroups logic
  console.log("\nTrying getChatGroups logic...");
  const users = await prisma.user.findMany({ take: 5 });
  console.log("Users in DB:", users.map(u => ({ id: u.id, email: u.email })));

  if (users.length > 0) {
    const userId = users[0].id;
    console.log(`\nTesting getChatGroups logic for user: ${users[0].email} (${userId})`);
    const memberships = await prisma.chatMember.findMany({
      where: { userId },
      select: { chatGroupId: true, lastReadAt: true }
    });
    console.log("Memberships:", memberships);
  }
}

main().catch(console.error).finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
