const { Pool } = require("pg")
const { PrismaPg } = require("@prisma/adapter-pg")
const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")

require("dotenv").config()

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/Zeta?schema=public"
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("Seeding Zeta database with rich mock data...")

  // 1. Clean old data
  console.log("Cleaning database...")
  await prisma.chatMessage.deleteMany()
  await prisma.chatMember.deleteMany()
  await prisma.chatGroup.deleteMany()
  await prisma.auditLogComment.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.docLink.deleteMany()
  await prisma.document.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.taskAssignment.deleteMany()
  await prisma.taskClosure.deleteMany()
  await prisma.task.deleteMany()
  await prisma.folder.deleteMany()
  await prisma.sprint.deleteMany()
  await prisma.boardSection.deleteMany()
  await prisma.projectMember.deleteMany()
  await prisma.project.deleteMany()
  await prisma.settings.deleteMany()
  await prisma.user.deleteMany()

  // 2. Create Users
  console.log("Creating users...")
  const passwordHash = bcrypt.hashSync("password123", 10)
  
  const admin = await prisma.user.create({
    data: {
      name: "rohan.dev",
      email: "admin@zeta.dev",
      password: passwordHash,
      emailVerified: new Date(),
      image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80",
      role: "ADMIN",
      isOwner: true,
    }
  })

  const alice = await prisma.user.create({
    data: {
      name: "alice.smith",
      email: "alice@zeta.dev",
      password: passwordHash,
      emailVerified: new Date(),
      image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80",
      role: "USER",
      }
  })

  const elena = await prisma.user.create({
    data: {
      name: "elena.rostova",
      email: "elena@zeta.dev",
      password: passwordHash,
      emailVerified: new Date(),
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=100&q=80",
      role: "USER",
    }
  })

  // Create User settings
  await prisma.settings.createMany({
    data: [
      { userId: admin.id },
      { userId: alice.id },
      { userId: elena.id }
    ]
  })

  // 3. Create Project
  console.log("Creating project...")
  const project = await prisma.project.create({
    data: {
      name: "Zeta Core Application",
      description: "Open source Next.js project management software designed for speed, flexibility, and real-time developer collaboration.",
    }
  })

  // Create Members
  await prisma.projectMember.createMany({
    data: [
      { projectId: project.id, userId: admin.id, role: "ADMIN" },
      { projectId: project.id, userId: alice.id, role: "CONTRIBUTOR" },
      { projectId: project.id, userId: elena.id, role: "VIEWER" }
    ]
  })

  // Create Default Board Sections
  const sections = ["BACKLOG", "IN_PROGRESS", "REVIEW", "DONE"]
  await prisma.boardSection.createMany({
    data: sections.map((name, index) => ({
      projectId: project.id,
      name,
      order: index,
    }))
  })

  // 4. Create Sprint
  console.log("Creating sprint...")
  const startDate = new Date()
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + 14)

  const sprint = await prisma.sprint.create({
    data: {
      name: "Sprint 12 - Realtime Engine",
      startDate,
      endDate,
      projectId: project.id,
    }
  })

  // 5. Create Tasks
  console.log("Creating tasks...")
  const t1 = await prisma.task.create({
    data: {
      title: "OPEN-T3B2 - Migrate CI to GitHub Actions",
      description: "Migrate the legacy Jenkins pipelines to parallelized GitHub Actions workflows to cut testing latency.",
      status: "IN_PROGRESS",
      points: 3,
      projectId: project.id,
      sprintId: sprint.id,
      creatorId: admin.id,
    }
  })

  const t2 = await prisma.task.create({
    data: {
      title: "OPEN-T3B3 - Integrate Docker Compose for Databases",
      description: "Bundle PostgreSQL 18, pgAdmin, and Dozzle into a single docker-compose.yml configuration for local dev deployment.",
      status: "DONE",
      points: 2,
      projectId: project.id,
      sprintId: sprint.id,
      creatorId: admin.id,
    }
  })

  const t3 = await prisma.task.create({
    data: {
      title: "OPEN-T3B4 - Socket.io Multi-User Collaborative State",
      description: "Sync active board columns and task dragging in real-time across multiple viewing clients.",
      status: "BACKLOG",
      points: 5,
      projectId: project.id,
      sprintId: sprint.id,
      creatorId: alice.id,
    }
  })

  // Self-Closures for closure table infinite hierarchies
  await prisma.taskClosure.createMany({
    data: [
      { ancestorId: t1.id, descendantId: t1.id, depth: 0 },
      { ancestorId: t2.id, descendantId: t2.id, depth: 0 },
      { ancestorId: t3.id, descendantId: t3.id, depth: 0 }
    ]
  })

  // Task assignments
  await prisma.taskAssignment.createMany({
    data: [
      { taskId: t1.id, userId: admin.id, role: "OWNER" },
      { taskId: t1.id, userId: alice.id, role: "ASSIGNEE" },
      { taskId: t2.id, userId: admin.id, role: "OWNER" },
      { taskId: t3.id, userId: alice.id, role: "OWNER" }
    ]
  })

  // Comments
  await prisma.comment.createMany({
    data: [
      {
        content: "Drafted the base workflows in .github/workflows/ci.yml. Alice, please verify local runner commands.",
        taskId: t1.id,
        userId: admin.id,
      },
      {
        content: "Will check on the self-hosted Linux actions runner node tonight.",
        taskId: t1.id,
        userId: alice.id,
      }
    ]
  })

  // Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        action: "CREATE",
        details: "Task created and added to Sprint 12",
        taskId: t1.id,
        userId: admin.id,
      },
      {
        action: "STATUS_CHANGE",
        details: "BACKLOG -> IN_PROGRESS",
        comment: "Starting active work on Jenkins migration",
        taskId: t1.id,
        userId: admin.id,
      },
      {
        action: "STATUS_CHANGE",
        details: "IN_PROGRESS -> DONE",
        comment: "Compose up is fully configured and local pgAdmin running fine on port 5050.",
        taskId: t2.id,
        userId: admin.id,
      }
    ]
  })

  // 6. Documents / Wiki
  console.log("Creating documents...")
  const doc = await prisma.document.create({
    data: {
      title: "CI Pipeline Migration Specs",
      content: "This document describes the workflow migration from Jenkins to GitHub Actions.\n\n## Secrets required:\n- DOCKER_USERNAME\n- DOCKER_PASSWORD\n\nVerified by @rohan.dev.",
      projectId: project.id,
      authorId: admin.id,
    }
  })

  await prisma.docLink.create({
    data: {
      documentId: doc.id,
      taskId: t1.id
    }
  })

  // 7. Workspace Chat
  console.log("Creating workspace chats...")
  
  // Create a file attachment for the file mention
  const att1 = await prisma.attachment.create({
    data: {
      id: "file-docker-compose",
      name: "docker-compose.yml",
      url: "/uploads/docker-compose.yml",
      size: 1521,
      type: "text/yaml",
      userId: admin.id,
    }
  })

  const group = await prisma.chatGroup.create({
    data: {
      name: "Engineering core",
      isGroup: true,
      ownerId: admin.id,
    }
  })

  await prisma.chatMember.createMany({
    data: [
      { chatGroupId: group.id, userId: admin.id, isAdmin: true },
      { chatGroupId: group.id, userId: alice.id, isAdmin: false },
      { chatGroupId: group.id, userId: elena.id, isAdmin: false }
    ]
  })

  // Group chat history with mentions, file tags, and replies (nested blockquotes)
  await prisma.chatMessage.createMany({
    data: [
      {
        chatGroupId: group.id,
        senderId: admin.id,
        content: "Welcome everyone! This is the main Engineering Core channel for Zeta.",
        createdAt: new Date(Date.now() - 3600000 * 2)
      },
      {
        chatGroupId: group.id,
        senderId: alice.id,
        content: "<blockquote><strong>rohan.dev</strong>: Welcome everyone! This is the main Engineering Core channel for Zeta.</blockquote>Awesome, let's keep all task-specific coordination logs here.",
        createdAt: new Date(Date.now() - 3600000 * 1.8)
      },
      {
        chatGroupId: group.id,
        senderId: admin.id,
        content: 'Hey <span data-type="mention" data-id="elena.rostova" data-label="elena.rostova">@elena.rostova</span>, did you review the docker configurations in <span data-type="file-mention" data-id="file-docker-compose" data-label="docker-compose.yml">@file:docker-compose.yml</span>?',
        createdAt: new Date(Date.now() - 3600000 * 1.5)
      },
      {
        chatGroupId: group.id,
        senderId: elena.id,
        content: '<blockquote><strong>rohan.dev</strong>: Hey @elena.rostova, did you review the docker configurations in @file:docker-compose.yml?</blockquote>Yes, just checked it. Works great, but we should make sure pgAdmin starts after postgres is fully healthy.',
        createdAt: new Date(Date.now() - 3600000 * 1.2)
      },
      {
        chatGroupId: group.id,
        senderId: alice.id,
        content: '<blockquote><strong>elena.rostova</strong>: Yes, just checked it. Works great, but we should make sure pgAdmin starts after postgres is fully healthy.</blockquote>Good catch, I\'ll update the healthcheck dependency.',
        createdAt: new Date(Date.now() - 3600000 * 1.0)
      }
    ]
  })

  // Create DMs to show in the sidebar list
  const dm1 = await prisma.chatGroup.create({
    data: {
      isGroup: false,
    }
  })
  await prisma.chatMember.createMany({
    data: [
      { chatGroupId: dm1.id, userId: admin.id },
      { chatGroupId: dm1.id, userId: elena.id }
    ]
  })
  await prisma.chatMessage.createMany({
    data: [
      {
        chatGroupId: dm1.id,
        senderId: elena.id,
        content: "Hi Rohan, I noticed you were working on the CI pipeline migration. Let me know if you need help with the runner setups.",
        createdAt: new Date(Date.now() - 3600000 * 5)
      },
      {
        chatGroupId: dm1.id,
        senderId: admin.id,
        content: "Thanks Elena! I just updated the docker-compose setup. Let's discuss it in the Engineering core channel.",
        createdAt: new Date(Date.now() - 3600000 * 4.8)
      }
    ]
  })

  const dm2 = await prisma.chatGroup.create({
    data: {
      isGroup: false,
    }
  })
  await prisma.chatMember.createMany({
    data: [
      { chatGroupId: dm2.id, userId: admin.id },
      { chatGroupId: dm2.id, userId: alice.id }
    ]
  })
  await prisma.chatMessage.createMany({
    data: [
      {
        chatGroupId: dm2.id,
        senderId: alice.id,
        content: "Drafted the workflow changes. Let's merge them tomorrow.",
        createdAt: new Date(Date.now() - 3600000 * 3)
      }
    ]
  })

  console.log("Seeding complete! Admin user: admin@zeta.dev / password123")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
