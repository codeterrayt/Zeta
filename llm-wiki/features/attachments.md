# File Attachments & Mentions System

Zeta incorporates a robust, secure, and highly interactive file attachment and autocomplete mention system (`@file:filename`) allowing members to share and preview documents, images, and other assets directly inside their tasks, descriptions, and comments.

---

## 🚀 File Upload Pipeline

- **Endpoint**: `POST /api/upload`
- **Storage Target**: `/app/uploads` (securely mapped to `./uploads` on host via Docker volumes for persistence).
- **Conflict Prevention**: Filenames are dynamically generated using a secure hashing scheme: `${uniqueId}-${Date.now()}.${ext}` to prevent namespace collisions.
- **Auto-Linking**: When a file is uploaded using the toolbar paperclip 📎 button, it is saved in the database as an `Attachment` and automatically inserted into the editor buffer as a live `fileMention` node.

---

## 🔒 Secure File Serving & Authentication

To prevent unauthorized downloads of uploaded attachments, Zeta routes all requests dynamically through:
- **Endpoint**: `GET /uploads/[...path]`
- **Authorization**: The route performs session validations via NextAuth before reading/serving any files. If not logged in, it throws a `401 Unauthorized` or `404 Not Found`.
- **MIME & Headers**: Safely detects file MIME types and returns standard content headers, permitting direct inline loading or secure attachment downloads.

---

## 🏷️ File Autocomplete Mentions (`@file:`)

- **Autocomplete Trigger**: Typing `@file:` in any text area or comment field summons the attachment dropdown suggestions menu.
- **Scope**: Pre-filters and matches uploaded attachments by filename in real-time.
- **Insertion**: Selecting a suggestion inserts a custom `fileMention` inline node.

---

## 🖼️ Tippy.js Hover Portal Previews

- **Component**: `FileMentionBadge`
- **Logic**: Integrates Tippy.js to mount floating tooltip preview cards on mouse hover/focus.
- **MIME Detection**: 
  - **Images**: Renders the image directly inside a scaled preview frame.
  - **PDFs**: Renders an interactive embedded iframe view.
  - **Other Files**: Renders a rich download metadata card with original file size and uploader details.

---

## ⚡ Real-Time NodeView Synchronization

- **Sync Mechanism**: Custom Tiptap React Node Views are normally static. Zeta implements a dynamic state sync using **Tiptap Custom Storage** and transactional dispatch listeners.
- **Event Loop**:
  1. File is uploaded inside the TiptapEditor.
  2. Local state updates the `attachments` collection and copies it to `editor.storage.fileMention.attachments`.
  3. A mock transaction `editor.view.dispatch(editor.state.tr)` is fired.
  4. All mounted `FileMentionNodeView` instances receive the transaction event, pull from storage, and hydrate their previews instantly without page refreshes!
