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

## 🤝 Open Source Contributions

We warmly welcome open-source contributions! Whether you want to build custom visual templates, expand agile metrics dashboard charts, or add new automation rules:

1. Fork this repository.
2. Spin up a new branch: `git checkout -b feature/your-feature-name`.
3. Commit and push your changes.
4. Open a **Pull Request** and let's build the future of agile together!
