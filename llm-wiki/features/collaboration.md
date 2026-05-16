# Collaboration Features

OpenJira supports threaded discussions and user mentions to facilitate team communication.

## 🧵 Threaded Comments
- **Structure**: Comments can have a `parentId`, allowing for one level of indentation (replies).
- **Infinite Threading (UI)**: While the DB supports infinite depth, the UI currently optimizes for 1-2 levels for readability.
- **Actions**: Users can post new comments or reply to existing ones.

## 🏷️ User Mentions
- **Trigger**: Typing `@` in any comment field.
- **Search**: Live-filters project members as the user types.
- **UI**: Mentions are highlighted and show user details (Avatar/Name) on hover.

## 👤 Reporter vs Assignee
- **Assignee**: The user currently responsible for the work.
- **Reporter**: The user who created the task (or is designated as the primary stakeholder).
- **Edit Rights**: Both roles share administrative control over the specific task.
