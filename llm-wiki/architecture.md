# Architecture Overview

Zeta is built as a modern, high-performance project management tool using the Next.js App Router and a robust relational data model.

## 📁 Project Structure

- `src/app`: Next.js App Router routes.
  - `(dashboard)/projects/[projectId]`: Main project board and backlog.
  - `(dashboard)/projects/[projectId]/sprints/[sprintId]`: Active sprint Kanban view.
  - `api/`: API Route handlers (Auth, Tasks, Comments).
- `src/actions`: Server Actions for data mutations (Sprints, Tasks, Members).
- `src/components`: UI components organized by domain.
  - `kanban/`: Board, TaskCard, TaskModal.
  - `sprints/`: SprintList, CreateSprintModal.
  - `projects/`: BacklogView, Member management.
- `prisma/`: Database schema and migrations.
- `src/lib/`: Shared utilities (Prisma client, Auth configuration).

## 🧩 Core Principles

1. **Server-First Data**: Use Server Actions for mutations and RSC (React Server Components) for initial data fetching where possible. API routes use Prisma **connect/disconnect** syntax for relation updates to ensure referential integrity.
2. **Glassmorphism UI**: High-end aesthetic using semi-transparent backgrounds, subtle borders, and smooth transitions.
3. **Closure Table Pattern**: Used for managing hierarchical tasks (subtasks) with infinite depth support.
4. **Permissions**: Role-based access controlled via `assigneeId` and `creatorId` (Reporter) for sensitive edits like task descriptions and titles.

## 🔐 Authentication
Uses **Auth.js (v5)** with a Credentials provider. The session includes `user.id` for cross-referencing with Prisma models.
- Entry point: `src/auth.ts`
- Session hook: `useSession()` (client-side) or `auth()` (server-side).
