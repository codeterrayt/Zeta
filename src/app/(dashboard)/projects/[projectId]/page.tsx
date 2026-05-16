import Link from "next/link"
import { LayoutDashboard, BarChart3, Settings2 } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { KanbanBoard } from "@/components/kanban/board"
import { WorkloadView } from "@/components/projects/workload-view"
import { CreateTaskModal } from "@/components/kanban/create-task-modal"
import { getProjectMembersForAssign } from "@/actions/project-members"

async function getProjectData(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  })

  const tasks = await prisma.task.findMany({
    where: { projectId },
    include: { assignee: { select: { name: true, image: true } } },
    orderBy: { createdAt: "asc" },
  })

  return { project, tasks }
}

const STATUS_ORDER = ["BACKLOG", "IN_PROGRESS", "REVIEW", "DONE"]
const STATUS_LABELS: Record<string, string> = {
  BACKLOG: "Backlog",
  IN_PROGRESS: "In Progress",
  REVIEW: "In Review",
  DONE: "Done",
}

export default async function ProjectBoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { projectId } = await params
  const { tab } = await searchParams
  const activeTab = tab || "kanban"

  const [{ project, tasks }, projectMembers] = await Promise.all([
    getProjectData(projectId),
    getProjectMembersForAssign(projectId),
  ])

  // Build Kanban columns from real DB tasks
  const columns = STATUS_ORDER.map((status) => ({
    id: status,
    title: STATUS_LABELS[status],
    tasks: tasks
      .filter((t) => t.status === status)
      .map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        points: t.points,
        description: t.description,
        assigneeId: t.assigneeId,
        assignee: t.assignee ? { name: t.assignee.name ?? "?" } : null,
      })),
  }))

  const tabs = [
    { id: "kanban", label: "Kanban", icon: LayoutDashboard },
    { id: "workload", label: "Workload", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: Settings2 },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{project?.name ?? "Project Board"}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{project?.description ?? "Manage your tasks here."}</p>
        </div>
        {activeTab !== "settings" && (
          <CreateTaskModal projectId={projectId} projectMembers={projectMembers} />
        )}
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 border-b border-border shrink-0 mb-4">
        {tabs.map(({ id, label, icon: Icon }) => (
          <Link
            key={id}
            href={`/projects/${projectId}?tab=${id}`}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0">
        {activeTab === "kanban" && <KanbanBoard initialData={columns} projectMembers={projectMembers} />}
        {activeTab === "workload" && (
          <div className="h-full overflow-y-auto">
            <WorkloadView tasks={tasks} />
          </div>
        )}
        {activeTab === "settings" && (
          <div className="h-full overflow-y-auto">
            {/* Settings content is a separate page rendered here via children would need slot — 
                instead we import it inline */}
            <SettingsInline projectId={projectId} />
          </div>
        )}
      </div>
    </div>
  )
}

// Inline Settings — avoids a full page navigation while keeping code simple
async function SettingsInline({ projectId }: { projectId: string }) {
  const { ProjectSettingsView } = await import("@/components/projects/project-settings-view")
  const { getProjectMembers } = await import("@/actions/project-members")
  const { members } = await getProjectMembers(projectId)
  return <ProjectSettingsView projectId={projectId} initialMembers={(members ?? []) as any} />
}
