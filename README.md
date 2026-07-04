<div align="center">

<img src="https://img.shields.io/badge/Zeta-Open%20Source%20PM-4F46E5?style=for-the-badge&logoColor=white" alt="Zeta" />

# Zeta

**The open-source, self-hosted project management platform built for modern engineering teams.**

Sprints · Kanban · Real-time Chat · Wiki Docs — all in one beautiful app.

<br />

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)](https://prisma.io)
[![Socket.io](https://img.shields.io/badge/Socket.io-4-010101?logo=socket.io&logoColor=white)](https://socket.io)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![GitHub Stars](https://img.shields.io/github/stars/codeterrayt/Zeta?style=social)](https://github.com/codeterrayt/Zeta/stargazers)

<br />

[**View on GitHub**](https://github.com/codeterrayt/Zeta) · [**Report a Bug**](https://github.com/codeterrayt/Zeta/issues) · [**Request a Feature**](https://github.com/codeterrayt/Zeta/issues) · [**Discussions**](https://github.com/codeterrayt/Zeta/discussions)

</div>

---

## Why Zeta?

Most project management tools are either too simple or locked behind expensive SaaS subscriptions. **Zeta is fully self-hosted, open source, and free** — giving your team complete ownership of their data and workflow.

| | Zeta | Jira | Linear |
|---|:---:|:---:|:---:|
| Self-hosted | ✅ | ❌ | ❌ |
| Open source | ✅ | ❌ | ❌ |
| Real-time collaboration | ✅ | ⚠️ | ⚠️ |
| Built-in chat | ✅ | ❌ | ❌ |
| Wiki & Docs | ✅ | ✅ | ⚠️ |
| AI summaries | 🚧 | 💰 | 💰 |
| Free forever | ✅ | ❌ | ❌ |

---

## Zeta in Action

### Sprint Analytics Dashboard
> Unified cockpit for sprint health — velocity trends, workload distribution, and real-time task metrics.

![Sprint Analytics Dashboard](docs/images/preview-dashboard.gif)

---

### Project & Sprint Lifecycle
> Spin up new projects, establish multiple active and planned sprints, map tasks, and track team activity updates.

![Project & Sprint Setup](docs/images/preview-project-sprints.gif)

**Key Walkthrough Highlights:**
- **Dynamic Project Setup**: Seamlessly spin up separate workspace boards with custom scopes.
- **Sprint Sequencing**: Spin up multiple sprints (active and upcoming) to plan deliverables.
- **Task Alignment**: Create and map tasks to sprint backlogs directly from task creation modals.
- **Dashboard Activity Feed**: Monitor real-time audit trails of workspace actions on the cockpit.

---

### Drag-and-Drop Kanban Board
> Move tasks across Backlog → In Progress → Review → Done with live Socket.io updates.

![Kanban Board](docs/images/preview-kanban.gif)

---

### Collaborative Wiki & Docs
> Rich TipTap editor with `@mention` support, real-time viewer presence, and per-project documentation spaces.

![Documentation Editor](docs/images/preview-docs.gif)

---

### Real-time Team Chat
> 1-to-1 and group messaging with typing indicators, read receipts, file attachments, and deep-link notifications.

![Team Chat](docs/images/preview-chat.gif)

---

## Features

<details>
<summary><strong>📊 Sprint Analytics Dashboard</strong></summary>

- Personalized overview: completed tasks, active tasks, total count, sprint count
- Bar charts, area charts, and pie charts powered by Recharts
- Filter by project and sprint for focused metrics
- Velocity trend indicators showing week-over-week changes
- Task completion chart over the last 30 days
- Per-user workload and assignment distribution
</details>

<details>
<summary><strong>📁 Project Management</strong></summary>

- Create and manage multiple projects with descriptions
- Role-based project membership: **Viewer / Contributor / Admin**
- Invite members by email or user ID
- Per-project settings, member management, and deletion
- Project-level activity and audit trail
</details>

<details>
<summary><strong>🗂 Kanban Board</strong></summary>

- Drag-and-drop task cards across fully **customizable stages** (add, rename, or remove columns)
- Default stages: **Backlog → In Progress → Review → Done** — extend with your own workflow steps
- Create, edit, and delete tasks inline
- Task cards display assignees, priority, due dates, and complexity points
- Supports infinite subtask hierarchy via a closure table model
- Sprint selector with start & end date indicators
- Interactive sidebar panel with detailed audit logs per task
</details>

<details>
<summary><strong>🏃 Sprint Management</strong></summary>

- Create sprints with start and end dates
- Move tasks in and out of sprints (full backlog support)
- Sprint-level activity feed and comments
- Sprint analytics and burndown indicators
- Mark sprints complete and archive them
</details>

<details>
<summary><strong>📜 Activity Feed & Audit Trails</strong></summary>

- Main dashboard live activity feed aggregating workspace events
- Comprehensive task-level audit timelines capturing ownership changes, status updates, description edits, and comment threads
- Sprint-specific activity logs tracking scope additions and removals
- Live user presence events (real-time indicators in docs and chat)
</details>

<details>
<summary><strong>✅ Task Detail</strong></summary>

- Rich TipTap editor for descriptions (bold, italic, headings, lists, images, links)
- `@mention` users directly in descriptions and comments
- Multiple assignees with roles: **Owner / Secondary Owner / POC / Assignee**
- Set due dates, complexity points, sprint, reporter, GitHub link, branch name, and repo
- Threaded comments with nested replies
- File attachments (images, PDFs, docs, spreadsheets — up to 50 MB)
- Full audit log — every change recorded with optional comment
</details>

<details>
<summary><strong>📝 Wiki & Documentation</strong></summary>

- Per-project rich-text documentation with full TipTap editor
- Headings, blockquotes, highlights, alignment, images, and links
- Link docs to specific tasks for full traceability
- Real-time viewer indicator showing active user avatars
- `@username` autocomplete mentions
- Author/admin-only editing and deletion controls
</details>

<details>
<summary><strong>💬 Real-time Chat</strong></summary>

- 1-to-1 direct messages and group chats
- Live typing indicators, online status, and read receipts
- Rich message editor with formatting, `@mentions`, and file attachments
- Message edit and soft-delete
- Paginated message history with lazy scroll loading
- Search messages across all chats from the command palette
- Deep-link to any message — click a notification and jump directly with highlight animation
- Group admin controls: rename, add/remove members, mute, toggle permissions
- Unread message count badges per chat
</details>

<details>
<summary><strong>🔔 Notifications</strong></summary>

- Types: **Mention / Assigned / Project Added / Task Changed / Due Soon**
- Auto-generated **Due Soon** alerts within 3 days of due date
- Real-time notification bell with badge count
- Click any notification to deep-link to the relevant task, sprint, or message
</details>

<details>
<summary><strong>🔍 Global Search — Command Palette (`Ctrl+K` / `Cmd+K`)</strong></summary>

- Searches across: Projects, Tasks, Sprints, Docs, People, Chats, Files, Notifications
- Filter by category for focused results
- Timestamp shown for chat message results (12-hour format)
- Instant DM creation from People search results
</details>

<details>
<summary><strong>📎 File Storage</strong></summary>

- Upload attachments to tasks, comments, sprints, and chat messages
- 50 MB per-file limit with allowlisted MIME types
- Global storage search — find any file you've uploaded or have access to
- Files served with authentication — no public URLs
</details>

<details>
<summary><strong>⚙️ Admin Panel (Owner/Admin only)</strong></summary>

- **SMTP configuration** — host, port, auth, TLS, and test connection
- **AI configuration** — enable/disable Gemini, choose model, set API key
- **User invitations** — invite by email with role assignment; revoke pending invites
- **Privilege management** — promote/demote users (owner only)
- Background email queue with retry logic (up to 3 attempts)
</details>

<details>
<summary><strong>🔐 Authentication</strong></summary>

- Credentials login (email + password, min 8 characters)
- GitHub OAuth (optional)
- Email verification flow (when SMTP is configured)
- Forgot password / reset password via secure token email
- Invite-only registration option
- **First registered user is automatically Owner + Admin**
- Session-based auth via NextAuth.js v5
</details>

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5 |
| **UI** | Tailwind CSS v4, Radix UI, Lucide Icons |
| **Rich Text** | Tiptap v3 |
| **Database** | PostgreSQL via Prisma 7 |
| **Real-time** | Socket.io 4 |
| **Auth** | NextAuth.js v5 |
| **Charts** | Recharts |
| **Drag & Drop** | @hello-pangea/dnd |
| **AI** | Google Gemini API |
| **Email** | Nodemailer |
| **Command Palette** | cmdk |
| **Notifications** | Sonner |
| **Passwords** | bcryptjs |

---

## Self-Hosting with Docker (Recommended)

The fastest way to get Zeta running is with Docker Compose. It spins up the app, PostgreSQL, pgAdmin (database UI), and Dozzle (log viewer) with a single command.

### Step 1 — Clone the Repository

```bash
git clone https://github.com/codeterrayt/Zeta.git
cd Zeta
```

### Step 2 — Configure Environment

Copy the example env file:

```bash
cp .env.example .env
```

Open `.env` and fill in the required values:

```env
# Database (auto-configured by Docker Compose)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/Zeta?schema=public"

# NextAuth — required for session encryption
AUTH_SECRET="your-auth-secret"
NEXTAUTH_URL="http://localhost:3000"
AUTH_TRUST_HOST=true

# Cron endpoint protection — generate with the command below
CRON_SECRET="your-cron-secret"
```

**Generate your secrets** using Node.js crypto (no extra packages needed):

```bash
# Generate AUTH_SECRET
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"

# Generate CRON_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output values into your `.env` file.

### Step 3 — Build & Start

```bash
docker compose up --build -d
```

That's it. Zeta starts with default configurations. Once running:

| Service | URL | Notes |
|---------|-----|-------|
| **Zeta App** | http://localhost:3000 | Main application |
| **pgAdmin** | http://localhost:5050 | DB admin UI (`admin@gmail.com` / `admin`) |
| **Dozzle Logs** | http://localhost:8888 | Container log viewer |

> **The first account you register automatically becomes the Owner account.** Register immediately after first boot to claim ownership.

---

## Local Development Setup

If you'd prefer to run without Docker:

### Prerequisites

- Node.js >= 18
- PostgreSQL >= 14
- npm or pnpm

### Steps

```bash
# 1. Clone
git clone https://github.com/codeterrayt/Zeta.git
cd Zeta

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your database URL and secrets (see above)

# 4. Run migrations
npx prisma migrate deploy
npx prisma generate

# 5. Start the dev server
npm run dev
```

Open http://localhost:3000. The **first user to register** becomes the Owner and Admin.

### Useful Dev Commands

```bash
# Lint the codebase
npm run lint

# Type-check without building
npx tsc --noEmit

# Explore the database visually
npx prisma studio

# Reset the database (destroys all data)
npx prisma migrate reset
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `AUTH_SECRET` | ✅ | NextAuth session encryption secret |
| `NEXTAUTH_URL` | ✅ | Full URL of your deployment (e.g. `http://localhost:3000`) |
| `AUTH_TRUST_HOST` | ✅ | Set to `true` when behind a proxy or in Docker |
| `CRON_SECRET` | ✅ | Secret to protect the `/api/cron` endpoint |

---

## Project Structure

```
Zeta/
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
├── docker-compose.yml    # Docker Compose with Postgres, pgAdmin, Dozzle
└── .env.example          # Environment variable template
```

---

## Roadmap

- [ ] AI-powered thread summaries via Gemini API
- [ ] Github Integration with Tasks

---

## Contributing

We warmly welcome contributions from the community! Whether it's fixing a bug, improving docs, adding a feature, or sharing feedback — every contribution matters.

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
- For security issues, **open a private security advisory** instead of a public issue

### Good First Issues

Issues tagged [`good first issue`](https://github.com/codeterrayt/Zeta/labels/good%20first%20issue) are well-scoped and beginner-friendly.

---

## Security

Zeta takes security seriously. If you discover a vulnerability, please **do not open a public issue**. Instead, open a [private security advisory](https://github.com/codeterrayt/Zeta/security/advisories/new).

Security hardening includes: authenticated file serving, per-project authorization on all write operations, MIME type allowlisting, prompt injection mitigation, and cryptographically generated secrets.

---

## License

Zeta is open source, released under the **[MIT License](LICENSE)**.

---

## Acknowledgements

Built with these amazing open-source projects:

[Next.js](https://nextjs.org) · [Prisma](https://prisma.io) · [Socket.io](https://socket.io) · [Tiptap](https://tiptap.dev) · [Tailwind CSS](https://tailwindcss.com) · [NextAuth.js](https://authjs.dev) · [Recharts](https://recharts.org) · [Radix UI](https://www.radix-ui.com) · [Lucide](https://lucide.dev) · [hello-pangea/dnd](https://github.com/hello-pangea/dnd)

---

<div align="center">

**⭐ If Zeta is useful to you, please star the repository — it helps others find the project!**

[⭐ Star on GitHub](https://github.com/codeterrayt/Zeta) · [🐛 Report Bug](https://github.com/codeterrayt/Zeta/issues) · [💡 Request Feature](https://github.com/codeterrayt/Zeta/issues) · [💬 Discussions](https://github.com/codeterrayt/Zeta/discussions)

</div>
