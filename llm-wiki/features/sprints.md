# Sprint Lifecycle

Sprints in Zeta are the primary container for work during an iteration.

## 🔄 Automatic Status Logic

The status of a sprint is calculated dynamically based on the current system date:

| Status | Condition |
| :--- | :--- |
| **Draft** | No `startDate` or `endDate` assigned. |
| **Planned** | `now < startDate` |
| **Active** | `now >= startDate` AND `now <= endDate` |
| **Completed** | `now > endDate` |

*Implementation: See `getStatus` function in `src/components/sprints/sprint-list.tsx`.*

## 📂 Backlog vs Sprints

1. **Backlog Tab**: Shows all tasks where `status = 'BACKLOG'`. Tasks can be assigned to a sprint from here but remain in the backlog until the sprint is started (or they are moved to a TODO state).
2. **Sprints Tab**: Shows all created sprints. Clicking a sprint navigates to its dedicated Kanban board.

## 🛠️ Management Actions
- **Create**: Via `CreateSprintModal`.
- **Delete**: Available in the `SprintList` for non-active sprints.
- **Update**: Adjusting dates automatically shifts the lifecycle status.
