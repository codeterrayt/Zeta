<div align="center">

# Zeta

**The open-source project management platform built for modern teams.**

Sprints · Kanban · Real-time Chat · Docs · AI Summaries — all in one place.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma)](https://prisma.io)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

</div>

---

## Demo

> **[Watch the full demo video](#)**
> *(placeholder — add a screen recording or Loom link here)*

| Dashboard | Kanban Board | Sprint View |
|:---------:|:------------:|:-----------:|
| ![Dashboard](docs/images/dashboard.png) | ![Kanban](docs/images/kanban.png) | ![Sprint](docs/images/sprint.png) |

| Real-time Chat | Documentation Editor | Admin Panel |
|:--------------:|:--------------------:|:-----------:|
| ![Chat](docs/images/chat.png) | ![Docs](docs/images/docs.png) | ![Admin](docs/images/admin.png) |

> Replace placeholder images by dropping screenshots into `docs/images/`.

---

## Why Zeta?

Most project management tools are either too simple or locked behind expensive SaaS subscriptions. **Zeta is fully self-hosted, open source, and free** — giving your team complete ownership of your data and workflow.

- **Your data, your server** — no third-party cloud required
- **Everything in one app** — no juggling Jira + Slack + Notion
- **Real-time by default** — Socket.io powers live updates everywhere
- **AI-assisted** — built-in Gemini integration for smart summaries
- **Beautiful UI** — dark mode, animations, and a premium design

---

## Features

### Dashboard
- Personalized analytics with bar charts, area charts, and pie charts
- Stats cards: completed tasks, active tasks, total tasks, sprint count
- Filter by project and sprint for focused metrics
- Trend indicators showing week-over-week changes
- Task completion chart over the last 30 days

### Project Management
- Create and manage multiple projects with descriptions
- Role-based project membership: Viewer / Contributor / Admin
- Invite members by email or user ID
- Per-project board sections — fully customizable Kanban columns
- Project-level settings, member management, and deletion

### Kanban Board
- Drag-and-drop task cards across custom columns
- Create, edit, and delete tasks inline
- Task cards show assignees, priority, due dates, and complexity points
- Supports infinite subtask hierarchy via a closure table model
- Filter and sort by status, assignee, and sprint

### Sprint Management
- Create sprints with start and end dates
- Move tasks in and out of sprints (backlog support)
- Sprint-level activity feed and comments
- Sprint analytics and burndown indicators
- Mark sprints as complete and archive them

### Task Detail
- Rich TipTap editor for task descriptions (bold, italic, headings, lists, images, links)
- @mention users directly in descriptions and comments
- Multiple assignees with roles: Owner / Secondary Owner / POC / Assignee
- Set due dates, complexity points, sprint, reporter, GitHub link, branch name, repo
- Threaded comments with nested replies
- Attachment uploads (images, PDFs, docs, spreadsheets — up to 50 MB)
- Full timeline/audit log — every change recorded with optional comment
- AI-powered thread summary using Gemini API

### Documentation
- Per-project rich text documentation with TipTap editor
- Full formatting: headings, blockquotes, highlights, alignment, images, links
- Link docs to specific tasks for traceability
- Author/admin-only editing and deletion

### Real-time Chat
- 1-to-1 direct messages and group chats
- Live typing indicators, online status, and read receipts
- Rich message editor with formatting, @mentions, and file attachments
- Message edit and soft-delete
- Paginated message history with lazy scroll loading
- Search messages across all chats from the command palette
- Deep-link to any message — click a notification and jump directly with highlight animation
- Group admin controls: rename, add/remove members, mute, toggle permissions
- Unread message count badges per chat

### Notifications
- Types: Mention / Assigned / Project Added / Task Changed / Due Soon
- Auto-generated Due Soon alerts (within 3 days of due date)
- Real-time notification bell with badge count
- Click any notification to deep-link to the relevant task, sprint, or message

### Global Search — Command Palette (`Ctrl+K` / `Cmd+K`)
- Searches across: Projects, Tasks, Sprints, Docs, People, Chats, Files, Notifications
- Filter by category for focused results
- Timestamp shown for chat message results (12-hour format)
- Instant DM creation from People search results

### File Storage
- Upload attachments to tasks, comments, sprints, and chat messages
- 50 MB per-file limit, allowlisted MIME types
- Global storage search — find any file you've uploaded or have access to
- Files served with authentication — no public URLs

### User Settings
- Update display name and change password (bcrypt-hashed)
- Configure dashboard focus thresholds
- Toggle timeline comment prompts
- Enable or disable real-time notifications

### Admin Panel (Owner / Admin only)
- SMTP configuration — host, port, auth, TLS, test connection
- AI configuration — enable/disable Gemini, choose model, set API key
- User invitations — invite by email with role assignment; revoke pending invites
- Privilege management — promote/demote users (owner only)
- Background email queue with retry logic (up to 3 attempts)

### Authentication
- Credentials login (email + password, min 8 characters)
- GitHub OAuth (optional)
- Email verification flow (when SMTP is configured)
- Forgot password / reset password via secure token email
- Invite-only registration option
- First registered user is automatically Owner + Admin
- Session-based auth via NextAuth.js v5

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| UI | Tailwind CSS v4, Radix UI, Lucide Icons |
| Rich Text | Tiptap v3 |
| Database | PostgreSQL via Prisma 7 |
| Real-time | Socket.io 4 |
| Auth | NextAuth.js v5 |
| Charts | Recharts |
| Drag & Drop | @hello-pangea/dnd |
| AI | Google Gemini API |
| Email | Nodemailer |
| Command Palette | cmdk |
| Notifications | Sonner |
| Passwords | bcryptjs |

---

## Getting Started

### Prerequisites

- Node.js >= 18
- PostgreSQL >= 14
- npm or pnpm

### 1 — Clone the Repository

```bash
git clone https://github.com/your-org/zeta.git
cd zeta
```

### 2 — Install Dependencies

```bash
npm install
```

### 3 — Configure Environment

```bash
cp .env.example .env
```

Open `.env` and fill in:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/zeta?schema=public"

# NextAuth — generate with: node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
AUTH_SECRET="your-generated-secret"

# GitHub OAuth (optional)
AUTH_GITHUB_ID=""
AUTH_GITHUB_SECRET=""

# Gemini AI (optional — can also be set in Admin Panel at runtime)
GEMINI_API_KEY=""

# App URL
NEXTAUTH_URL=http://localhost:3000
AUTH_TRUST_HOST=true

# Cron endpoint protection
CRON_SECRET="your-generated-cron-secret"
```

### 4 — Set Up the Database

```bash
npx prisma migrate deploy
npx prisma generate
```

### 5 — Run the Development Server

```bash
npm run dev
```

Open http://localhost:3000. The **first user to register** automatically becomes the Owner and Admin.

---

## Docker

```bash
# Copy and edit the Docker env file
cp .docker.env .docker.env.local
# Edit .docker.env.local with your secrets

docker compose up -d
```

A full Docker Compose file (including a PostgreSQL service) is on the roadmap.

---

## Project Structure

```
zeta/
├── src/
│   ├── actions/          # Server Actions (auth, chat, tasks, notifications, search…)
│   ├── app/
│   │   ├── (auth)/       # Login, Register, Verify Email, Reset Password
│   │   ├── (dashboard)/  # Dashboard, Projects, Sprints, Kanban, Chat, Docs, Settings
│   │   └── api/          # REST API routes (upload, tasks PATCH, cron)
│   ├── components/
│   │   ├── chat/         # Chat window, message list, composer, group info panel
│   │   ├── editor/       # TipTap editor + mention extension
│   │   ├── kanban/       # Kanban board and cards
│   │   ├── layout/       # Sidebar, navbar, command palette, notification panel
│   │   ├── projects/     # Project list, task detail modal, sprint views
│   │   ├── settings/     # User settings, admin panel
│   │   └── sprints/      # Sprint dashboard, activity feed
│   ├── lib/              # Prisma client, mail queue, utility helpers
│   └── auth.ts           # NextAuth configuration
├── prisma/
│   └── schema.prisma     # Full database schema
├── server.js             # Custom Node.js server (Next.js + Socket.io)
└── .env.example          # Environment variable template
```

---

## Roadmap

- [ ] Docker Compose file with PostgreSQL service included
- [ ] GitHub Actions CI pipeline (lint, typecheck, tests)
- [ ] Unit and integration test suite
- [ ] Mobile-responsive layout improvements
- [ ] Webhook support (Slack, Discord)
- [ ] GitHub integration — auto-link commits and PRs to tasks
- [ ] Time tracking per task
- [ ] Export to CSV / PDF
- [ ] SSO / LDAP support
- [ ] Localization (i18n)
- [ ] Public project sharing / read-only view
- [ ] Public REST API with API key authentication

---

## Contributing

We warmly welcome contributions from the community! Whether it is fixing a bug, improving the docs, adding a feature, or sharing feedback — every contribution matters.

### How to Contribute

1. **Fork** this repository
2. **Create a branch** for your change
   ```bash
   git checkout -b feat/your-feature-name
   ```
3. **Make your changes** — keep commits focused and atomic
4. **Test** your changes locally
5. **Open a Pull Request** against `main` with a clear description

### Guidelines

- Follow the existing code style (TypeScript strict, Tailwind CSS v4, server actions)
- Keep PRs small and focused — one feature or fix per PR
- Use [Conventional Commits](https://www.conventionalcommits.org) for commit messages
- If adding a new feature, update the relevant documentation
- For security issues, please **open a private security advisory** instead of a public issue

### Good First Issues

Issues tagged [`good first issue`](https://github.com/your-org/zeta/labels/good%20first%20issue) are well-scoped and beginner-friendly.

### Bug Reports & Feature Requests

- **Bug?** Open an issue with steps to reproduce
- **Idea?** Start a discussion or open a feature request

### Useful Commands

```bash
# Run linting
npm run lint

# Type-check without building
npx tsc --noEmit

# Explore the database with Prisma Studio
npx prisma studio

# Reset the database (destroys all data)
npx prisma migrate reset
```

---

## Security

Zeta takes security seriously. If you discover a vulnerability, please **do not open a public issue**. Instead, open a [private security advisory](https://github.com/your-org/zeta/security/advisories/new) or email **security@your-domain.com**.

Recent security hardening includes authenticated file serving, per-project authorization on all write operations, MIME type allowlisting, prompt injection mitigation, and cryptographically generated secrets.

---

## License

Zeta is open source and released under the **MIT License**.

```
MIT License

Copyright (c) 2026 Zeta Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

---

## Acknowledgements

Built with these amazing open-source projects:

[Next.js](https://nextjs.org) · [Prisma](https://prisma.io) · [Socket.io](https://socket.io) · [Tiptap](https://tiptap.dev) · [Tailwind CSS](https://tailwindcss.com) · [NextAuth.js](https://authjs.dev) · [Recharts](https://recharts.org) · [Radix UI](https://www.radix-ui.com) · [Lucide](https://lucide.dev) · [hello-pangea/dnd](https://github.com/hello-pangea/dnd)

---

<div align="center">

**If Zeta is useful to you, please star the repository — it helps others find the project!**

[Report Bug](https://github.com/your-org/zeta/issues) · [Request Feature](https://github.com/your-org/zeta/issues) · [Join Discussions](https://github.com/your-org/zeta/discussions)

</div>
