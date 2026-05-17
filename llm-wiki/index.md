# Zeta LLM Wiki

Welcome to the Zeta Project Knowledge Base. This wiki is designed to provide high-level context and deep-dive technical details for LLM agents working on this codebase.

## 🗺️ Project Navigation

- [**Architecture Overview**](./architecture.md) - Tech stack, project structure, and core principles.
- [**Database & Schema**](./database.md) - Detailed breakdown of Prisma models and relationships.
- [**Features**](./features/index.md)
  - [Sprints Management](./features/sprints.md) - Lifecycle, tabs, and backlog.
  - [Task System](./features/tasks.md) - Kanban, Closure Table (subtasks), and Metadata.
  - [Collaboration](./features/collaboration.md) - Comments, Mentions, and Threading.
- [**Integrations**](./integrations/github.md) - GitHub Commit/PR parsing logic.

---

## 🚀 Current Status (May 16, 2026)

The project has recently undergone a major transformation to become "Sprint-Centric".

### Key Milestones Completed:
1. **Backlog & Sprint Separation**: Dedicated tabs for Backlog and Sprint management.
2. **Dynamic Sprint Lifecycle**: Sprints are automatically categorized as **Planned**, **Active**, or **Completed** based on their date ranges.
3. **Advanced Task Modal**: Modern 8:4 layout with metadata sidebar.
4. **GitHub Persistence**: Logic implemented to parse and store GitHub commit/PR URLs.
5. **Threaded Comments**: Support for nested replies and user mentions (`@`).

> [!IMPORTANT]
> Some advanced features (Threaded Comments, Mentions, GitHub persistence) were recently **stashed**. If they are missing from the active code, they can be recovered from the git stash.

## 🛠️ Tech Stack
- **Framework**: Next.js 15+ (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: Auth.js (NextAuth v5)
- **Styling**: Tailwind CSS / Shadcn UI
- **Drag & Drop**: @hello-pangea/dnd
