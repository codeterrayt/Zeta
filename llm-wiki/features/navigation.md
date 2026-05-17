# Command Palette & Global Navigation

Zeta prioritizes keyboard-driven speed and dynamic lookup across large-scale workspaces. The platform features an automated Command Palette modal and high-end sidebar navigation models to streamline daily development workflows.

---

## 🔍 Command Palette (`Ctrl + K` / `Cmd + K`)

- **Trigger**: Activated globally via key combinations `Ctrl + K` or `Cmd + K`, or by clicking the Search button in the header bar.
- **Component**: `<CommandPalette />` utilizing the lightweight, highly accessible `cmdk` primitive.
- **Scope & Features**:
  - **Fuzzy Search**: Live-queries all tasks, projects, wiki documents, and users in active memory.
  - **Quick Commands**: Permits one-click operations such as "Create New Task", "Jump to Workspace Settings", or "Open Profile".
  - **Visual Style**: Encased in a beautiful, backdrop-blurred glassmorphic container (`fixed inset-0 z-50 bg-background/80 backdrop-blur-sm`).

---

## 🗺️ Navigation Architecture

- **Context Preservation**: Sidebars and navigation links automatically resolve parameters such as `[projectId]` and `[sprintId]` dynamically from the active URL path.
- **Mobile Responsive**: Sidebar slides out smoothly as a drawer utilizing a specialized mobile sidebar wrapper built with custom slide-in animations.
- **Active States**: Navigation items check current pathnames to display high-end gradient active states, indicating the current tab/section cleanly.
