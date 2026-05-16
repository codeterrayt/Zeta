"use client"

import * as React from "react"
import { ChevronDown, ChevronRight, Calendar, User, Trash2, ChevronLeft, ExternalLink, Shield, GitBranch, Eye, Users, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { deleteSprint, getSprintTasks } from "@/actions/sprint"
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
    assignments?: Array<{
      role: string
      userId: string
      user: { id: string; name: string | null; email: string | null; image: string | null }
    }>
  }>
}

const ROLE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  OWNER: { label: "Owner", icon: Shield, color: "text-amber-600", bg: "bg-amber-500/10" },
  SECONDARY_OWNER: { label: "Secondary", icon: GitBranch, color: "text-blue-600", bg: "bg-blue-500/10" },
  POC: { label: "POC", icon: Eye, color: "text-emerald-600", bg: "bg-emerald-500/10" },
  ASSIGNEE: { label: "Assignee", icon: Users, color: "text-primary", bg: "bg-primary/10" },
}

export function SprintList({ sprints = [], projectId }: { sprints?: Sprint[], projectId: string }) {
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({})
  const [sprintTasks, setSprintTasks] = React.useState<Record<string, any[]>>({})
  const [loadingTasks, setLoadingTasks] = React.useState<Record<string, boolean>>({})
  
  const router = useRouter()

  // Pagination State
  const [currentPage, setCurrentPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(5)

  const totalPages = Math.ceil(sprints.length / pageSize)
  const paginatedSprints = sprints.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  React.useEffect(() => {
    setCurrentPage(1)
  }, [sprints.length, pageSize])

  const toggle = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const isExpanding = !expanded[id]
    setExpanded(prev => ({ ...prev, [id]: isExpanding }))

    if (isExpanding && !sprintTasks[id]) {
      setLoadingTasks(prev => ({ ...prev, [id]: true }))
      try {
        const res = await getSprintTasks(id)
        if (res.success) {
          setSprintTasks(prev => ({ ...prev, [id]: res.tasks }))
        }
      } catch (error) {
        console.error("Failed to fetch tasks:", error)
      } finally {
        setLoadingTasks(prev => ({ ...prev, [id]: false }))
      }
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm("Delete this sprint?")) return
    const res = await deleteSprint(id, projectId)
    if (res.success) router.refresh()
  }

  const getStatus = (start: Date | null, end: Date | null, tasks: any[]) => {
    if (!start || !end) return { label: "Draft", color: "bg-secondary text-muted-foreground border-border" }
    
    const now = new Date()
    const startDate = new Date(start)
    const endDate = new Date(end)
    
    const hasOverdue = tasks.some(t => 
      t.status !== "DONE" && 
      t.dueDate && 
      isPast(new Date(t.dueDate)) && 
      !isToday(new Date(t.dueDate))
    )

    if (hasOverdue) return { label: "At Risk", color: "bg-destructive/15 text-destructive border-destructive/20 shadow-sm" }
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
          const status = getStatus(sprint.startDate, sprint.endDate, sprint.tasks)
          const tasks = sprintTasks[sprint.id] || []
          const isLoading = loadingTasks[sprint.id]

          return (
            <div key={sprint.id} className="group bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 transition-all shadow-sm">
              <div 
                onClick={() => router.push(`/projects/${projectId}/sprints/${sprint.id}`)}
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/20 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <button 
                    onClick={(e) => toggle(sprint.id, e)}
                    className="p-1 rounded-md hover:bg-secondary transition-colors shrink-0"
                  >
                    {expanded[sprint.id] ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </button>
                  <div className="min-w-0 flex-1 max-w-md">
                    <h3 className="font-bold text-lg group-hover:text-primary transition-colors truncate">{sprint.name}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {sprint.startDate ? new Date(sprint.startDate).toLocaleDateString("en-GB", { day: 'numeric', month: 'short' }) : "—"} to {sprint.endDate ? new Date(sprint.endDate).toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric' }) : "—"}
                      </span>
                      <span>•</span>
                      <span className="font-bold text-foreground">{sprint.tasks.length} tasks</span>
                    </div>
                  </div>

                  {/* Progress Section */}
                  <div className="hidden lg:flex flex-col gap-1.5 px-8 flex-1 max-w-[300px]">
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
                          <div className="flex justify-between w-full text-[10px] font-black uppercase tracking-wider">
                            <span className="text-muted-foreground">{donePoints} / {totalPoints} pts</span>
                            <span className={cn(
                              progress < 30 ? "text-red-500" : progress < 70 ? "text-amber-500" : "text-emerald-500"
                            )}>{progress}%</span>
                          </div>
                          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden shadow-inner ring-1 ring-border/5">
                            <div 
                              className={cn("h-full transition-all duration-700 ease-in-out", getProgressColor(progress))}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </div>

                <div className="flex items-center gap-6 shrink-0">
                  <div className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm min-w-[100px] text-center", status.color)}>
                    {status.label}
                  </div>
                  <button 
                    onClick={(e) => handleDelete(sprint.id, e)}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

            {expanded[sprint.id] && (
              <div className="border-t border-border bg-secondary/5 divide-y divide-border min-h-[100px] flex flex-col">
                {isLoading ? (
                  <div className="flex-1 flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground italic">
                    No tasks assigned to this sprint.
                  </div>
                ) : (
                  tasks.map(task => (
                    <div key={task.id} className="flex items-center justify-between px-6 py-4 hover:bg-secondary/10 transition-colors">
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-1 rounded-md shrink-0 border border-border">
                          OPEN-{task.id.slice(0, 6).toUpperCase()}
                        </span>
                        <div className="flex items-center gap-2 group/title min-w-0">
                          <a 
                            href={`/tasks/${task.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-2"
                          >
                            <span className="text-sm font-semibold truncate group-hover/title:text-primary transition-colors">{task.title}</span>
                            <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover/title:opacity-100 transition-all text-muted-foreground" />
                          </a>
                        </div>
                      </div>

                      <div className="flex items-center gap-8 shrink-0">
                        {/* Multiple Assignees - Stack Layout */}
                        <div className="w-32 hidden md:flex items-center justify-end -space-x-2">
                          {task.assignments?.length === 0 ? (
                            <span className="text-[10px] text-muted-foreground italic uppercase">Unassigned</span>
                          ) : (
                            task.assignments?.map((assignment: any, idx: number) => {
                              const config = ROLE_CONFIG[assignment.role] || ROLE_CONFIG.ASSIGNEE
                              return (
                                <div 
                                  key={assignment.userId} 
                                  className="relative group/avatar"
                                  title={`${assignment.user.name || assignment.user.email} (${config.label})`}
                                >
                                  <div className={cn(
                                    "w-7 h-7 rounded-full border-2 border-background bg-secondary flex items-center justify-center overflow-hidden ring-1 ring-border shadow-sm transition-transform hover:scale-110 hover:z-10 cursor-pointer",
                                  )}>
                                    {assignment.user.image ? (
                                      <img src={assignment.user.image} className="w-full h-full object-cover" alt="" />
                                    ) : (
                                      <span className="text-[10px] font-bold uppercase">{assignment.user.name?.[0] || assignment.user.email?.[0] || "?"}</span>
                                    )}
                                  </div>
                                  <div className={cn(
                                    "absolute -top-1 -right-1 w-3 h-3 rounded-full border border-background flex items-center justify-center z-20",
                                    config.bg, config.color
                                  )}>
                                    <config.icon className="w-2 h-2" />
                                  </div>
                                </div>
                              )
                            })
                          )}
                        </div>

                        {/* Due Date - Fixed Width Column */}
                        <div className="w-24 hidden sm:block">
                          {task.dueDate ? (
                            <div className={cn(
                              "inline-flex items-center gap-1.5 text-[9px] font-black px-2 py-1 rounded-md border shadow-sm uppercase tracking-tighter",
                              isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate))
                                ? "bg-destructive/10 text-destructive border-destructive/20"
                                : differenceInDays(new Date(task.dueDate), new Date()) <= 2
                                ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            )}>
                              {isToday(new Date(task.dueDate)) ? "Today" : format(new Date(task.dueDate), "MMM d")}
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground opacity-30">—</span>
                          )}
                        </div>

                        {/* Status - Fixed Width Column */}
                        <div className="w-24 text-right">
                          <span className={cn(
                            "text-[10px] font-black px-2 py-1 rounded-md uppercase border whitespace-nowrap",
                            task.status === "DONE" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-primary/10 text-primary border-primary/20"
                          )}>
                            {task.status?.replace("_", " ") ?? "Backlog"}
                          </span>
                        </div>
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
              <span className="text-xs text-muted-foreground font-medium">Show</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-background border border-border rounded px-2 py-1.5 text-xs font-bold outline-none cursor-pointer focus:ring-2 focus:ring-primary/20"
              >
                {[5, 10, 20].map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              <span className="text-xs text-muted-foreground font-medium">per page</span>
            </div>
            <div className="h-4 w-px bg-border mx-2" />
            <span className="text-xs text-muted-foreground font-semibold">
              Showing {Math.min(sprints.length, (currentPage - 1) * pageSize + 1)}–{Math.min(sprints.length, currentPage * pageSize)} of {sprints.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-border rounded-lg hover:bg-secondary disabled:opacity-30 disabled:hover:bg-transparent transition-all shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="flex items-center gap-1">
              {(() => {
                const totalPages = Math.ceil(sprints.length / pageSize)
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
                      "w-8 h-8 rounded-lg text-xs font-black transition-all",
                      currentPage === page 
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                        : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {page}
                  </button>
                ))
              })()}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(Math.ceil(sprints.length / pageSize), prev + 1))}
              disabled={currentPage === Math.ceil(sprints.length / pageSize)}
              className="p-2 border border-border rounded-lg hover:bg-secondary disabled:opacity-30 disabled:hover:bg-transparent transition-all shadow-sm"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
