import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { ListTodo, Calendar, Tag } from "lucide-react"
import Link from "next/link"

const STATUS_COLORS: Record<string, string> = {
  BACKLOG: "bg-secondary text-muted-foreground",
  IN_PROGRESS: "bg-blue-500/10 text-blue-500",
  REVIEW: "bg-yellow-500/10 text-yellow-500",
  DONE: "bg-emerald-500/10 text-emerald-500",
}

const COMPLEXITY_LABELS: Record<number, string> = {
  1: "Very Low", 2: "Low", 3: "Medium", 4: "High", 5: "Very High"
}

export default async function MyTasksPage() {
  const session = await auth()
  const userId = session?.user?.id

  const tasks = userId
    ? await prisma.task.findMany({
        where: { assigneeId: userId },
        include: { project: { select: { id: true, name: true } } },
        orderBy: { updatedAt: "desc" },
      })
    : []

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">My Tasks</h1>
        <p className="text-muted-foreground mt-1">
          All tasks assigned to you across all projects.
        </p>
      </header>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {tasks.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center mx-auto text-muted-foreground">
              <ListTodo className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg">No tasks assigned to you</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Tasks assigned to you will appear here across all your projects.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {tasks.map(task => (
              <Link
                key={task.id}
                href={`/projects/${task.project.id}?tab=kanban`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-secondary/20 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                      OPEN-{task.id.slice(0, 6).toUpperCase()}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Tag className="w-3 h-3" /> {task.project.name}
                    </span>
                  </div>
                  <p className="font-medium text-sm truncate">{task.title}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {task.points && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                      {task.points} — {COMPLEXITY_LABELS[task.points]}
                    </span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[task.status] ?? ""}`}>
                    {task.status.replace("_", " ")}
                  </span>
                  {task.updatedAt && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(task.updatedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
