# Task System

Tasks are the atomic work items in Zeta.

## 🏗️ Kanban Board
- **Drag & Drop**: Uses `@hello-pangea/dnd`.
- **Columns**: Dynamic based on `project.boardSections`.
- **Persistence**: Moving a task triggers a `PATCH` request to update the `status` field.

## 📝 Task Modal
The task details modal uses an **8:4 layout**:
- **Main Area (8/12)**: Title, Description (editable), and Comments feed.
- **Sidebar (4/12)**: Metadata (Status, Assignee, Reporter, Points, GitHub Link).

### 🔐 Permissions
Only the **Assignee** or the **Reporter** (creator) can edit core task fields (Title, Description). Other users can only view and comment.

## 🌳 Subtasks (Hierarchy)
Implemented via a closure table (`TaskClosure`).
- **Infinite Depth**: Support for nested subtasks.
- **Subtree Fetching**: Handled by `getTaskSubtree` in `src/actions/task.ts`.

##  Fibonacci Complexity
Points are restricted to the Fibonacci sequence (1, 2, 3, 5, 8, 13) to encourage relative sizing over time estimates.
