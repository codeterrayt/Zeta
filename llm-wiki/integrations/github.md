# GitHub Integration

OpenJira integrates with GitHub by parsing and storing commit and Pull Request URLs directly on tasks.

## 🔗 URL Parsing Logic

The system automatically identifies the following patterns when a URL is pasted into the "GitHub Link" field:

| Type | Pattern | Parsed Metadata |
| :--- | :--- | :--- |
| **Commit** | `github.com/.../commit/[id]` | `repoName`, `commitId` |
| **Pull Request** | `github.com/.../pull/[id]` | `repoName`, `prId` |
| **Branch** | `github.com/.../tree/[name]` | `repoName`, `branchName` |

## 💾 Data Storage
The raw `githubUrl` is stored in the `Task` model, ensuring persistence. Parsed metadata is used for UI badges and deep links.

## 🚀 Usage in UI
- **Badges**: Tasks with GitHub links show a "Git" icon or a branch name badge.
- **Deep Linking**: Clicking the GitHub section in the Task Modal opens the external link in a new tab.
