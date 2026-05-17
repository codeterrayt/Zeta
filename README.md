# Zeta 🚀

### *The Next-Gen Agile Workspace*

Zeta is a modern, high-performance, and visually stunning project management platform designed as a state-of-the-art alternative to Jira. Built with a sleek glassmorphic design system and powerful productivity shortcuts, Zeta equips agile teams to plan, collaborate, track, and ship code faster—all within a single integrated workspace.

---

## ✨ Product Features

Zeta redefines agile management with several next-generation capabilities:

- **🏗️ Dynamic Kanban Board**: Smooth drag-and-drop workspace using visual status boards, instantly persisting card status updates.
- **📅 Date-Driven Sprints**: Effortless sprint grooming, with date-driven categorizations that automatically transition sprints through *Planned*, *Active*, and *Completed* states.
- **📝 Tiptap Rich-Text Editor**: Clean rich-text editor for descriptions and comments, featuring headers, highlighting, blockquotes, and lists.
- **📎 Smart Attachments & Previews**: Drag-and-drop file uploader with secure dynamically authorized file serving, original name preservation, and instant hover preview tooltips for images and PDF documents.
- **📚 Integrated Wiki (Zeta Docs)**: Share team requirements, system architecture briefs, and documentation directly alongside tasks for seamless cross-referencing.
- **🔍 Global Command Palette (`Cmd / Ctrl + K`)**: Instantly query across tasks, projects, wiki documents, and navigation commands.
- **🧵 Threaded Commenting Engine**: Rich nested conversation threads to keep communication structured.
- **🔔 Real-Time Notification Center**: Interactive header bell widget and a resizeable, filterable manager dashboard showing unread triggers and task mentions.
- **🎨 Visual Themes**: Toggle between high-contrast light and Monaco-inspired developer dark modes.
- **🪵 Automated Audit Logs**: Transparent track record of title adjustments, date updates, point estimates, and status movements.

---

## 🏗️ Architecture & Tech Stack

Zeta is built on a clean, modern, and highly scalable stack:

- **Frontend & App Engine**: Next.js 15 (App Router)
- **Styling & Presentation**: Tailwind CSS
- **Database ORM**: Prisma Client
- **Storage Database**: PostgreSQL
- **Security & Session**: Auth.js (v5)

---

## 🐳 Quick Start (Docker Compose)

The easiest way to boot Zeta, along with its database and a real-time logs dashboard, is via Docker:

### Prerequisites
Ensure you have **Docker** and **Docker Compose** installed on your system.

### Steps

1. **Configure Secrets**:
   Create a `.env` file in the root directory and configure your keys:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@db:5432/zeta?schema=public"
   NEXTAUTH_SECRET="your-32-character-secret-key-goes-here"
   NEXTAUTH_URL="http://localhost:3000"
   ```

2. **Boot Container Services**:
   Start the application, database, and logs console:
   ```bash
   docker compose up -d --build
   ```

3. **Deploy Schema**:
   Push the database schema directly to your PostgreSQL container:
   ```bash
   npx prisma db push
   ```

Once deployed, the following services will be available:
- **Zeta Application**: [http://localhost:3000](http://localhost:3000)
- **Dozzle (Log Viewer Console)**: [http://localhost:8888](http://localhost:8888)

---

## 🤝 Contributing

We welcome open-source contributions! Whether you are fixing bugs, optimizing UI performance, adding advanced sprint tools, or improving our developer docs:

1. Fork the repository.
2. Create a new branch: `git checkout -b feature/your-awesome-feature`.
3. Commit your changes: `git commit -m 'Add some awesome feature'`.
4. Push to your branch: `git push origin feature/your-awesome-feature`.
5. Open a **Pull Request** and let's collaborate!
