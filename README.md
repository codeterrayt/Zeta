# Zeta 🚀

### *The Premium Agile Project Workspace*

Zeta is a next-generation agile workspace designed as a premium, highly collaborative alternative to Jira. Fortified with keyboard-driven search navigation, rich in-context document sharing, and detailed change-tracking tools, Zeta equips product teams to organize, plan, and ship deliverables with maximum transparency and velocity.

---

## ✨ Key Features

Zeta is loaded with distinct collaboration and project management features built for high-performance software teams:

- **📁 Project Workspaces**: Create independent workspaces to partition team members, board sections, documentation, sprints, and tasks with strict context boundaries.
- **📅 Sprints & Sprint-Level Boards**: Beyond traditional task boards, Zeta supports direct retrospective feeds and shared folder repositories linked to active Sprints, enabling **Sprint-level activity comments and attachments**.
- **🌳 Tasks & Infinite Subtasks**: Standardize requirements with tasks supporting points, assignees, dates, and nested hierarchies of infinite depth.
- **📎 Context-Isolated Storage**: Project attachments are securely partitioned and isolated, binding directly to task cards, specific sprints, or individual comment lines.
- **🏷️ Real-Time Mentions & File Tagging**: Mention teammates or reference attachments directly within descriptions or comments with `@` and `@file:` autocomplete lookups. Hovering badges launches high-end preview tooltips for inline images and interactive PDF embeds.
- **💬 Audit Discussion Threads**: Every task metadata change (date, title, estimate, assignee) is logged automatically.zeta goes beyond basic history, allowing team members to **comment directly on specific audit log adjustments** to discuss reasons behind resource reallocations.

---

## 🏗️ Stack Architecture

- **Frontend & App Engine**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS
- **Database & Model ORM**: Prisma Client with PostgreSQL
- **Security & Session**: Auth.js (v5)

---

## 🐳 Quick Start (Docker Compose)

Launch the Zeta suite with its database and real-time logs dashboard in minutes:

### Prerequisites
Make sure you have **Docker** and **Docker Compose** installed.

### Steps

1. **Configure Environment Secrets**:
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@db:5432/zeta?schema=public"
   NEXTAUTH_SECRET="your-32-character-secret-key-goes-here"
   NEXTAUTH_URL="http://localhost:3000"
   ```

2. **Boot the Orchestration Suite**:
   ```bash
   docker compose up -d --build
   ```

3. **Establish Database Schema**:
   ```bash
   npx prisma db push
   ```

* **Zeta Workspace Application**: [http://localhost:3000](http://localhost:3000)
* **Dozzle Logs Console**: [http://localhost:8888](http://localhost:8888)

---

## 🗺️ Roadmap & Upcoming Features

We are actively developing Zeta to expand its collaborative power. The following features are planned for upcoming releases:

1. **⚡ Real-time Updates**: Real-time synchronization and alerts for each activity, comment, and card movement. (more than 70% done)
2. **📁 Folder Storage Arrangements**: Nesting directory arrangements and custom file/folder management structures inside projects.
3. **💬 Team Chat Rooms**: In-app group channels equipped with file mentions, user tagging, and channel mute controls.
4. **🔔 Chrome Push Notifications**: Native browser push alerts for immediate mention notifications.
5. **📧 Email Notifications**: Automated update alerts and task assignment digests sent straight to team mailboxes.
6. **✍️ Native Markdown Support**: Direct keyboard Markdown input shortcuts parsing inside our rich-text editor canvas.

---

## 🤝 Open Source Contributions

We warmly welcome open-source contributions! Whether you want to build custom visual templates, expand agile metrics dashboard charts, or add new automation rules:

1. Fork this repository.
2. Spin up a new branch: `git checkout -b feature/your-feature-name`.
3. Commit and push your changes.
4. Open a **Pull Request** and let's build the future of agile together!
