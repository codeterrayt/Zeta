"use client"

import * as React from "react"
import { ChevronDown, ChevronRight, Calendar, User, MoreVertical, Trash2, ChevronLeft } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { deleteSprint } from "@/actions/sprint"
import { useRouter } from "next/navigation"
import { format, isPast, isToday, differenceInDays } from "date-fns"

type Sprint = {
  id: string
  name: string
  startDate: Date | null
  endDate: Date | null
  tasks: Array<{
    id: string
    title: string
    status: string
    points: number | null
    dueDate?: string | null
    assignments: Array<{
      role: string
      user: { id: string; name: string | null }
    }>
  }>
}

export function SprintList({ sprints = [], projectId }: { sprints?: Sprint[], projectId: string }) {
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({})
  const router = useRouter()

  // Pagination State
  const [currentPage, setCurrentPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(5)

  const totalPages = Math.ceil(sprints.length / pageSize)
  const paginatedSprints = sprints.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  React.useEffect(() => {
    setCurrentPage(1)
  }, [sprints.length, pageSize])

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

      <div className="space-y-4">
        {paginatedSprints.map(sprint => {
          const status = getStatus(sprint.startDate, sprint.endDate)
          return (
            <div key={sprint.id} className="group bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 transition-all shadow-sm">
              <div 
                onClick={() => router.push(`/projects/${projectId}/sprints/${sprint.id}`)}
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/20 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <button 
                    onClick={(e) => toggle(sprint.id, e)}
                    className="p-1 rounded-md hover:bg-secondary transition-colors"
                  >
                    {expanded[sprint.id] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </button>
                  <div className="min-w-0 flex-1">
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

                  {/* Progress Section */}
                  <div className="hidden md:flex flex-col items-end gap-1.5 px-6 min-w-[180px]">
                    {(() => {
                      const totalPoints = sprint.tasks.reduce((acc, t) => acc + (t.points || 0), 0)
                      const donePoints = sprint.tasks.filter(t => t.status === "DONE").reduce((acc, t) => acc + (t.points || 0), 0)
                      const progress = totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : (sprint.tasks.length > 0 && sprint.tasks.every(t => t.status === "DONE") ? 100 : 0)
                      
                      const getProgressColor = (p: number) => {
                        if (p < 30) return "bg-red-500"
                        if (p < 70) return "bg-amber-500"
                        return "bg-emerald-500"
                      }

                      return (
                        <>
                          <div className="flex justify-between w-full text-[10px] font-bold uppercase tracking-wider">
                            <span className="text-muted-foreground">{donePoints} / {totalPoints} pts</span>
                            <span className={cn(
                              progress < 30 ? "text-red-500" : progress < 70 ? "text-amber-500" : "text-emerald-500"
                            )}>{progress}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden shadow-inner">
                            <div 
                              className={cn("h-full transition-all duration-500 ease-out", getProgressColor(progress))}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </>
                      )
                    })()}
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
                        {(() => {
                          const owner = task.assignments?.find(a => a.role === "OWNER") || task.assignments?.[0]
                          if (!owner) return null
                          return (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <User className="w-3 h-3" />
                              <span>{owner.user.name ?? "Unknown"}</span>
                            </div>
                          )
                        })()}
                        {task.dueDate && (
                          <div className={cn(
                            "flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border",
                            isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate))
                              ? "bg-destructive/10 text-destructive border-destructive/20"
                              : differenceInDays(new Date(task.dueDate), new Date()) <= 2
                              ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          )}>
                            {isToday(new Date(task.dueDate)) ? "Today" : format(new Date(task.dueDate), "MMM d")}
                          </div>
                        )}
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                          task.status === "DONE" ? "bg-emerald-500/10 text-emerald-500" : "bg-primary/10 text-primary"
                        )}>
                          {task.status?.replace("_", " ") ?? "Backlog"}
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

      {/* Pagination Controls */}
      {sprints.length > 0 && (
        <div className="flex items-center justify-between bg-card border border-border p-4 rounded-xl shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Show</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-background border border-border rounded px-2 py-1 text-xs font-bold outline-none cursor-pointer"
              >
                {[5, 10, 20].map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              <span className="text-xs text-muted-foreground">per page</span>
            </div>
            <span className="text-xs text-muted-foreground">
              Showing {Math.min(sprints.length, (currentPage - 1) * pageSize + 1)} to {Math.min(sprints.length, currentPage * pageSize)} of {sprints.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-border rounded-lg hover:bg-secondary disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="flex items-center gap-1">
              {(() => {
                const maxVisible = 5
                let start = Math.max(1, currentPage - Math.floor(maxVisible / 2))
                let end = Math.min(totalPages, start + maxVisible - 1)
                
                if (end - start + 1 < maxVisible) {
                  start = Math.max(1, end - maxVisible + 1)
                }

                return Array.from({ length: end - start + 1 }, (_, i) => start + i).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      "w-8 h-8 rounded-lg text-xs font-bold transition-all",
                      currentPage === page 
                        ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20" 
                        : "hover:bg-secondary text-muted-foreground"
                    )}
                  >
                    {page}
                  </button>
                ))
              })()}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border border-border rounded-lg hover:bg-secondary disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
