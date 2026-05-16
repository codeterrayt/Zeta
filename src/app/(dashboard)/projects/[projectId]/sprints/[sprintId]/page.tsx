import Link from "next/link"
import { ChevronLeft, LayoutDashboard, BarChart3, Users, Calendar } from "lucide-react"
import { getSprintById, getProjectSprints } from "@/actions/sprint"
import { getProjectMembersForAssign } from "@/actions/project-members"
import { KanbanBoard } from "@/components/kanban/board"
import { WorkloadView } from "@/components/projects/workload-view"
import { ActiveUsersView } from "@/components/sprints/active-users-view"
import { CreateTaskModal } from "@/components/kanban/create-task-modal"
import { notFound } from "next/navigation"

export default async function SprintDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string; sprintId: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { projectId, sprintId } = await params
  const { tab } = await searchParams
  const activeTab = tab || "kanban"

  const [{ sprint }, projectMembers, { sprints }] = await Promise.all([
    getSprintById(sprintId),
    getProjectMembersForAssign(projectId),
    getProjectSprints(projectId),
  ])

  if (!sprint) return notFound()

  // Prepare Kanban data
  const boardSections = sprint.project.boardSections || []
  const columns = boardSections.map((section: any) => ({
    id: section.name,
    title: section.name,
    tasks: sprint.tasks
      .filter((t: any) => t.status === section.name)
      .map((t: any) => ({
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
    { id: "users", label: "Active Users", icon: Users },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sprint Header */}
      <div className="flex flex-col gap-4 mb-6 shrink-0">
        <Link 
          href={`/projects/${projectId}`}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary w-fit transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Project Sprints
        </Link>
        
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{sprint.name}</h1>
              <div className="flex items-center gap-1.5 text-xs font-bold bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full uppercase tracking-wider">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Active Sprint
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>
                {sprint.startDate ? new Date(sprint.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"} 
                {" — "}
                {sprint.endDate ? new Date(sprint.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
              </span>
            </div>
          </div>

          <CreateTaskModal 
            projectId={projectId} 
            projectMembers={projectMembers}
            boardSections={boardSections}
            sprints={sprints as any}
            defaultSprintId={sprintId}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border mb-6 shrink-0">
        {tabs.map(({ id, label, icon: Icon }) => (
          <Link
            key={id}
            href={`/projects/${projectId}/sprints/${sprintId}?tab=${id}`}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0">
        {activeTab === "kanban" && (
          <KanbanBoard 
            initialData={columns} 
            projectMembers={projectMembers} 
            projectId={projectId} 
            boardSections={boardSections}
          />
        )}
        {activeTab === "workload" && (
          <div className="h-full overflow-y-auto">
            <WorkloadView tasks={sprint.tasks} />
          </div>
        )}
        {activeTab === "users" && (
          <div className="h-full overflow-y-auto">
            <ActiveUsersView tasks={sprint.tasks} />
          </div>
        )}
      </div>
    </div>
  )
}
