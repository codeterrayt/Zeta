import Link from "next/link"
import { LayoutDashboard, BarChart3, Settings2, CalendarRange } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { getProjectMembersForAssign } from "@/actions/project-members"
import { getProjectSprints } from "@/actions/sprint"
import { getProjectBacklog } from "@/actions/task"
import { CreateSprintModal } from "@/components/sprints/create-sprint-modal"
import { SprintList } from "@/components/sprints/sprint-list"
import { CreateTaskModal } from "@/components/kanban/create-task-modal"
import { BacklogView } from "@/components/projects/backlog-view"

async function getProjectData(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { boardSections: { orderBy: { order: "asc" } } }
  })
  return project
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
  const activeTab = tab || "sprints"

  const [project, { sprints }, projectMembers, { tasks: backlogTasks }] = await Promise.all([
    getProjectData(projectId),
    getProjectSprints(projectId),
    getProjectMembersForAssign(projectId),
    getProjectBacklog(projectId),
  ])

  const tabs = [
    { id: "sprints", label: "Sprints", icon: CalendarRange },
    { id: "backlog", label: "Backlog", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: Settings2 },
  ]

  const boardSections = project?.boardSections || []

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top Header with Project Settings access */}
      <div className="flex items-center justify-between mb-6 shrink-0 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{project?.name ?? "Project Board"}</h1>
            <span className="text-xs bg-secondary px-2 py-0.5 rounded text-muted-foreground font-mono uppercase tracking-tighter">
              Project
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">{project?.description ?? "Manage your project sprints and settings."}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* <Link 
            href={`/projects/${projectId}?tab=settings`}
            className={`p-2 rounded-md transition-colors ${activeTab === 'settings' ? 'bg-primary/10 text-primary' : 'hover:bg-secondary text-muted-foreground'}`}
            title="Project Settings"
          >
            <Settings2 className="w-5 h-5" />
          </Link> */}
          <CreateTaskModal
            projectId={projectId}
            projectMembers={projectMembers}
            boardSections={boardSections}
            sprints={sprints as any}
          />
          <CreateSprintModal projectId={projectId} />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 shrink-0 mb-6">
        {tabs.map(({ id, label, icon: Icon }) => (
          <Link
            key={id}
            href={`/projects/${projectId}?tab=${id}`}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === id
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === "sprints" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Project Sprints</h2>
            </div>
            <SprintList sprints={sprints as any} projectId={projectId} />
          </div>
        )}

        {activeTab === "backlog" && (
          <div className="space-y-6">
            <BacklogView tasks={backlogTasks as any} />
          </div>
        )}
        
        {activeTab === "settings" && (
          <SettingsInline projectId={projectId} />
        )}
      </div>
    </div>
  )
}

async function SettingsInline({ projectId }: { projectId: string }) {
  const { ProjectSettingsView } = await import("@/components/projects/project-settings-view")
  const { getProjectMembers } = await import("@/actions/project-members")
  const { getBoardSections } = await import("@/actions/board-section")

  const [{ members }, { sections }] = await Promise.all([
    getProjectMembers(projectId),
    getBoardSections(projectId),
  ])

  return (
    <ProjectSettingsView
      projectId={projectId}
      initialMembers={(members ?? []) as any}
      initialSections={sections ?? []}
    />
  )
}
