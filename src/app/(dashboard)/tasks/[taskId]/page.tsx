import { getTaskById } from "@/actions/task"
import { getProjectSprints } from "@/actions/sprint"
import { notFound } from "next/navigation"
import { TaskModal } from "@/components/kanban/task-modal"

export default async function DedicatedTaskPage({
  params,
}: {
  params: Promise<{ taskId: string }>
}) {
  const { taskId } = await params
  const { task } = await getTaskById(taskId)

  if (!task) return notFound()

  const { sprints } = await getProjectSprints(task.projectId)
  const projectMembers = task.project.members.map((m: any) => m.user)
  const boardSections = task.project.boardSections

  return (
    <div className="flex-1 bg-background overflow-y-auto">
      <div className="w-full min-h-screen">
        {/* We use the TaskModal logic but as a static view */}
        {/* For now, I'll just use a special version of the modal that is always open and has no overlay */}
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
