require("dotenv").config();
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");
const { PrismaClient } = require("@prisma/client");

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Mock auth session
const mockUserId = 'cmp9qz4yk00002elvh8r9rezu'; // Rohan
const targetUserId = 'cmp9udh5p000p6cf51q52a0dx'; // Kishan

async function createChatGroupMock() {
  const allUserIds = [mockUserId, targetUserId];

  // Create the group
  const group = await prisma.chatGroup.create({
    data: {
      name: "Test Group " + Date.now(),
      isGroup: true,
      ownerId: mockUserId,
      members: {
        create: allUserIds.map(uid => ({
          userId: uid,
          isAdmin: uid === mockUserId,
        }))
      }
    },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } }
        }
      }
    }
  });

  return group;
}

async function main() {
  console.log("Creating mock group...");
  const group = await createChatGroupMock();
  console.log("Group created successfully! ID:", group.id);
  console.log("Group Members:", group.members.map(m => ({ userId: m.userId, lastReadAt: m.lastReadAt })));

  // Clean up
  console.log("Cleaning up created group...");
  await prisma.chatGroup.delete({ where: { id: group.id } });
  console.log("Cleaned up successfully!");
}

main().catch(console.error).finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
