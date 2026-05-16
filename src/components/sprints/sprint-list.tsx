"use client"

import * as React from "react"
import { ChevronDown, ChevronRight, Calendar, User, MoreVertical, Trash2 } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { deleteSprint } from "@/actions/sprint"
import { useRouter } from "next/navigation"

type Sprint = {
  id: string
  name: string
  startDate: Date | null
  endDate: Date | null
  tasks: any[]
}

export function SprintList({ sprints, projectId }: { sprints: Sprint[], projectId: string }) {
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({})
  const router = useRouter()

  const toggle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm("Delete this sprint?")) return
    const res = await deleteSprint(id, projectId)
    if (res.success) router.refresh()
  }

  const getStatus = (start: Date | null, end: Date | null) => {
    if (!start || !end) return { label: "Draft", color: "bg-secondary text-muted-foreground" }
    const now = new Date()
    const startDate = new Date(start)
    const endDate = new Date(end)

    if (now < startDate) return { label: "Planned", color: "bg-sky-500/15 text-sky-600 border-sky-500/20" }
    if (now > endDate) return { label: "Completed", color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20" }
    return { label: "Active", color: "bg-indigo-500/15 text-indigo-600 border-indigo-500/20" }
  }

  return (
    <div className="space-y-4">
      {sprints.length === 0 && (
        <div className="p-12 text-center border-2 border-dashed border-border rounded-xl bg-secondary/10">
          <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-lg">No sprints yet</h3>
          <p className="text-sm text-muted-foreground">Create your first sprint to start organizing tasks.</p>
        </div>
      )}

      {sprints.map(sprint => {
        const status = getStatus(sprint.startDate, sprint.endDate)
        return (
          <div key={sprint.id} className="group bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 transition-all shadow-sm">
            <div 
              onClick={() => router.push(`/projects/${projectId}/sprints/${sprint.id}`)}
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/20 transition-colors"
            >
              <div className="flex items-center gap-4 min-w-0">
                <button 
                  onClick={(e) => toggle(sprint.id, e)}
                  className="p-1 rounded-md hover:bg-secondary transition-colors"
                >
                  {expanded[sprint.id] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </button>
                <div>
                  <h3 className="font-bold text-lg group-hover:text-primary transition-colors truncate">{sprint.name}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {sprint.startDate ? new Date(sprint.startDate).toLocaleDateString("en-GB", { day: 'numeric', month: 'short' }) : "—"} to {sprint.endDate ? new Date(sprint.endDate).toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric' }) : "—"}
                    </span>
                    <span>•</span>
                    <span>{sprint.tasks.length} tasks</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={(e) => handleDelete(sprint.id, e)}
                  className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border", status.color)}>
                  {status.label}
                </div>
              </div>
            </div>

          {expanded[sprint.id] && (
            <div className="border-t border-border bg-secondary/5 divide-y divide-border">
              {sprint.tasks.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground italic">
                  No tasks in this sprint.
                </div>
              ) : (
                sprint.tasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between px-6 py-3 hover:bg-secondary/10 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded shrink-0">
                        OPEN-{task.id.slice(0, 6).toUpperCase()}
                      </span>
                      <span className="text-sm font-medium truncate">{task.title}</span>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      {task.assignee && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <User className="w-3 h-3" />
                          <span>{task.assignee.name}</span>
                        </div>
                      )}
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                        task.status === "DONE" ? "bg-emerald-500/10 text-emerald-500" : "bg-primary/10 text-primary"
                      )}>
                        {task.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
