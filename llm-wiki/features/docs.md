# Confluence-Style Shared Documentation

Zeta integrates a robust document sharing, editing, and task-linking wiki system (analogous to Atlassian Confluence) that allows teams to manage product requirements documents (PRDs), system design guides, and process documentation directly alongside their agile boards.

---

## 💾 Database Schema

The documentation workspace is powered by three main prisma entities:

### 1. `Document`
- **Fields**:
  - `id`: Unique cuid.
  - `title` / `content`: Rich-text content stored in the database.
  - `projectId` / `project`: Direct relation binding the document to a specific workspace.
  - `authorId` / `author`: User relation identifying the document creator.
- **Cascading**: Deleting a project or an author automatically cascades and cleans up linked documentation.

### 2. `DocLink`
Represents a many-to-many join table connecting `Document` to `Task` entities.
- **Fields**:
  - `documentId` / `document`: Reference link to the parent document.
  - `taskId` / `task`: Reference link to the task ticket.
- **Unique Constraints**: `@@unique([documentId, taskId])` prevents duplicate link references.

---

## 🎨 Workspace Integration

- **Route Structure**: `/documentation`
- **Creation**: `/documentation/new` provides a clean distraction-free workspace using the interactive `TiptapEditor`.
- **Dynamic Previews**: Clicking on a document presents a rendered layout utilizing the standard `ContentRenderer` component, which automatically handles inline mention badges, styles, and headers.
- **Agile Linking**: While viewing a document, creators can cross-reference specific tasks. The linked task will show a dynamic badge and connection in its `TaskModal` details sidebar, bridging the gap between requirements and active execution.
