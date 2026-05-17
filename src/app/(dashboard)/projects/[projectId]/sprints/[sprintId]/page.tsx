import Link from "next/link"
import { ChevronLeft, LayoutDashboard, BarChart3, Users, Calendar, MessageSquare } from "lucide-react"
import { getSprintById, getProjectSprints } from "@/actions/sprint"
import { getProjectMembersForAssign } from "@/actions/project-members"
import { KanbanBoard } from "@/components/kanban/board"
import { WorkloadView } from "@/components/projects/workload-view"
import { ActiveUsersView } from "@/components/sprints/active-users-view"
import { CreateTaskModal } from "@/components/kanban/create-task-modal"
import { CommentSection } from "@/components/kanban/comment-section"
import { notFound } from "next/navigation"
import { cn } from "@/lib/utils"

import { isPast, isToday } from "date-fns"

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

  const [sprintRes, projectMembers, sprintsRes] = await Promise.all([
    getSprintById(sprintId),
    getProjectMembersForAssign(projectId),
    getProjectSprints(projectId),
  ])

  const sprint = sprintRes.success ? sprintRes.sprint : null
  const sprints = sprintsRes.success ? sprintsRes.sprints : []

  if (!sprint) return notFound()

  // Status Logic
  const now = new Date()
  const startDate = sprint.startDate ? new Date(sprint.startDate) : null
  const endDate = sprint.endDate ? new Date(sprint.endDate) : null
  
  const hasOverdue = (sprint.tasks || []).some((t: any) => 
    t.status !== "DONE" && 
    t.dueDate && 
    isPast(new Date(t.dueDate)) && 
    !isToday(new Date(t.dueDate))
  )

  let status = { label: "Active Sprint", color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20", ping: "bg-indigo-500" }
  if (hasOverdue) {
    status = { label: "At Risk", color: "bg-destructive/10 text-destructive border-destructive/20", ping: "bg-destructive" }
  } else if (!startDate || !endDate) {
    status = { label: "Draft", color: "bg-secondary text-muted-foreground border-border", ping: "bg-muted-foreground" }
  } else if (now < startDate) {
    status = { label: "Planned", color: "bg-sky-500/10 text-sky-500 border-sky-500/20", ping: "bg-sky-500" }
  } else if (now > endDate) {
    status = { label: "Completed", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", ping: "bg-emerald-500" }
  }

  // Prepare Kanban data
  const boardSections = sprint.project.boardSections || []
  const columns = boardSections.map((section: any) => ({
    id: section.name,
    title: section.name,
    tasks: sprint.tasks
      .filter((t: any) => t.status === section.name),
  }))

  const tabs = [
    { id: "kanban", label: "Kanban", icon: LayoutDashboard },
    { id: "workload", label: "Workload", icon: BarChart3 },
    { id: "users", label: "Active Users", icon: Users },
    { id: "activity", label: "Activity", icon: MessageSquare },
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
              <div className={cn("flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border", status.color)}>
                <span className="relative flex h-2 w-2">
                  <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", status.ping)}></span>
                  <span className={cn("relative inline-flex rounded-full h-2 w-2", status.ping)}></span>
                </span>
                {status.label}
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
            className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-all ${activeTab === id
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
            initialData={columns as any}
            projectMembers={projectMembers}
            projectId={projectId}
            boardSections={boardSections}
            sprints={sprints as any}
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
        {activeTab === "activity" && (
          <div className="h-full overflow-y-auto px-8">
            <CommentSection 
              sprintId={sprintId}
              initialComments={sprint.comments || []}
              projectMembers={projectMembers as any}
            />
          </div>
        )}
      </div>
    </div>
  )
}
