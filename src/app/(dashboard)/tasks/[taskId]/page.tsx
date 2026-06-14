import { getTaskById } from "@/actions/task"
import { getProjectSprints } from "@/actions/sprint"
import { TaskModal } from "@/components/kanban/task-modal"
import { AlertTriangle, Trash2, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default async function DedicatedTaskPage({
  params,
  searchParams,
}: {
  params: Promise<{ taskId: string }>
  searchParams: Promise<{ deleted?: string; deletedBy?: string; taskTitle?: string }>
}) {
  const { taskId } = await params
  const sp = await searchParams

  // If the task was just deleted and we have ?deleted=true, show the deletion screen
  if (sp?.deleted === "true") {
    const deletedBy = sp?.deletedBy ? decodeURIComponent(sp.deletedBy) : "a team member"
    const taskTitle = sp?.taskTitle ? decodeURIComponent(sp.taskTitle) : "This task"
    return (
      <div className="flex items-center justify-center min-h-screen px-6">
        <div className="flex flex-col items-center text-center gap-6 max-w-lg">
          <div className="w-24 h-24 rounded-3xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
            <Trash2 className="w-12 h-12 text-destructive" />
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-black text-foreground tracking-tight">Task Deleted</h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              <span className="font-bold text-foreground">"{taskTitle}"</span> was permanently deleted by{" "}
              <span className="font-bold text-foreground">{deletedBy}</span>.
            </p>
          </div>
          <Link
            href="/tasks"
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-2xl font-bold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to My Tasks
          </Link>
        </div>
      </div>
    )
  }

  const { task } = await getTaskById(taskId)

  // Task not found (deleted by someone else without redirect params)
  if (!task) {
    return (
      <div className="flex items-center justify-center min-h-screen px-6">
        <div className="flex flex-col items-center text-center gap-6 max-w-lg">
          <div className="w-24 h-24 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <AlertTriangle className="w-12 h-12 text-amber-500" />
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl font-black text-foreground tracking-tight">Task Not Found</h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              This task may have been deleted by a team member or you may not have access to it.
            </p>
          </div>
          <Link
            href="/tasks"
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-2xl font-bold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to My Tasks
          </Link>
        </div>
      </div>
    )
  }

  const { sprints } = await getProjectSprints(task.projectId)
  const projectMembers = task.project.members.map((m: any) => m.user)
  const boardSections = task.project.boardSections

  return (
    <div className="p-6 lg:p-10">
      <div className="w-full">
        <TaskModal
          isOpen={true}
          task={task}
          projectMembers={projectMembers}
          boardSections={boardSections}
          sprints={sprints as any}
          standalone={true}
        />
      </div>
    </div>
  )
}
