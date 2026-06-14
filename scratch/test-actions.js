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

async function getChatGroupsMock() {
  const memberships = await prisma.chatMember.findMany({
    where: { userId: mockUserId },
    select: { chatGroupId: true, lastReadAt: true }
  });

  const groupIds = memberships.map(m => m.chatGroupId);

  const groups = await prisma.chatGroup.findMany({
    where: { id: { in: groupIds } },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true }
          }
        }
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          sender: {
            select: { id: true, name: true }
          }
        }
      }
    },
    orderBy: { updatedAt: "desc" }
  });

  // Calculate actual unread count for each group based on lastReadAt
  const groupsWithUnread = await Promise.all(
    groups.map(async (group) => {
      const membership = memberships.find(m => m.chatGroupId === group.id);
      const lastRead = membership?.lastReadAt || new Date(0);

      const unreadCount = await prisma.chatMessage.count({
        where: {
          chatGroupId: group.id,
          senderId: { not: mockUserId },
          createdAt: { gt: lastRead },
          isDeleted: false
        }
      });

      return {
        ...group,
        unreadCount
      };
    })
  );

  return groupsWithUnread;
}

async function main() {
  console.log("Fetching chat groups...");
  const groups = await getChatGroupsMock();
  console.log("Fetched groups count:", groups.length);
  console.log("Groups details:", groups.map(g => ({ id: g.id, name: g.name, isGroup: g.isGroup, unreadCount: g.unreadCount })));

  if (groups.length > 0) {
    const groupId = groups[0].id;
    console.log(`\nMarking chat ${groupId} as read...`);
    await prisma.chatMember.update({
      where: { chatGroupId_userId: { chatGroupId: groupId, userId: mockUserId } },
      data: { lastReadAt: new Date() }
    });
    console.log("Successfully updated lastReadAt!");
  }
}

main().catch(console.error).finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
