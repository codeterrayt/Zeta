"use client"

import * as React from "react"
import { User, Layers, Info, Calendar, Search, Filter, X, ChevronDown, Shield, GitBranch, Eye, Users, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { format, isPast, isToday, differenceInDays } from "date-fns"

interface BacklogTask {
  id: string
  title: string
  status: string
  points: number | null
  assignments: Array<{
    role: string
    userId: string
    user: { name: string | null; email: string | null; image: string | null }
  }>
  sprint: { id: string; name: string } | null
  dueDate?: string | null
}

interface BacklogViewProps {
  tasks?: BacklogTask[]
  projectMembers?: Array<{ id: string; name: string | null; email: string | null }>
  sprints?: Array<{ id: string; name: string }>
  boardSections?: Array<{ id: string; name: string }>
}

const ROLE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  OWNER: { label: "Owner", icon: Shield, color: "text-amber-600", bg: "bg-amber-500/10" },
  SECONDARY_OWNER: { label: "Secondary", icon: GitBranch, color: "text-blue-600", bg: "bg-blue-500/10" },
  POC: { label: "POC", icon: Eye, color: "text-emerald-600", bg: "bg-emerald-500/10" },
  ASSIGNEE: { label: "Assignee", icon: Users, color: "text-primary", bg: "bg-primary/10" },
}

export function BacklogView({
  tasks = [],
  projectMembers = [],
  sprints = [],
  boardSections = []
}: BacklogViewProps) {
  const [search, setSearch] = React.useState("")
  const [selectedAssignee, setSelectedAssignee] = React.useState("all")
  const [selectedSprint, setSelectedSprint] = React.useState("all")
  const [selectedComplexity, setSelectedComplexity] = React.useState("all")
  const [selectedStatus, setSelectedStatus] = React.useState("all")
  const [selectedDueDate, setSelectedDueDate] = React.useState("all")

  // Pagination State
  const [currentPage, setCurrentPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(5)

  const filteredTasks = tasks.filter(task => {
    const matchesSearch =
      task.title.toLowerCase().includes(search.toLowerCase()) ||
      task.id.toLowerCase().includes(search.toLowerCase()) ||
      `OPEN-${task.id.slice(0, 6)}`.toLowerCase().includes(search.toLowerCase())

    const matchesAssignee = selectedAssignee === "all" ||
      task.assignments.some(a => a.userId === selectedAssignee)

    const matchesSprint = selectedSprint === "all" ||
      (selectedSprint === "none" ? !task.sprint : task.sprint?.id === selectedSprint)

    const matchesComplexity = selectedComplexity === "all" ||
      task.points === Number(selectedComplexity)

    const matchesStatus = selectedStatus === "all" ||
      task.status === selectedStatus

    const matchesDueDate = (() => {
      if (selectedDueDate === "all") return true
      if (!task.dueDate) return false
      const date = new Date(task.dueDate)
      if (selectedDueDate === "overdue") return isPast(date) && !isToday(date)
      if (selectedDueDate === "today") return isToday(date)
      if (selectedDueDate === "week") return differenceInDays(date, new Date()) <= 7
      return true
    })()

    return matchesSearch && matchesAssignee && matchesSprint && matchesComplexity && matchesStatus && matchesDueDate
  })

  // Pagination Logic
  const totalPages = Math.ceil(filteredTasks.length / pageSize)
  const paginatedTasks = filteredTasks.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  React.useEffect(() => {
    setCurrentPage(1)
  }, [search, selectedAssignee, selectedSprint, selectedComplexity, selectedStatus, selectedDueDate, pageSize])

  const resetFilters = () => {
    setSearch("")
    setSelectedAssignee("all")
    setSelectedSprint("all")
    setSelectedComplexity("all")
    setSelectedStatus("all")
    setSelectedDueDate("all")
  }

  const hasActiveFilters = search !== "" || selectedAssignee !== "all" || selectedSprint !== "all" || selectedComplexity !== "all" || selectedStatus !== "all" || selectedDueDate !== "all"

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search title or task ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-secondary/50 border border-border rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-secondary/50 border border-border rounded-lg px-3 py-2 text-xs font-bold outline-none cursor-pointer h-10 min-w-[120px]"
            >
              <option value="all">All Statuses</option>
              {boardSections.map(s => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>

            {/* Assignee Filter */}
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="bg-secondary/50 border border-border rounded-lg px-3 py-2 text-xs font-bold outline-none cursor-pointer h-10 min-w-[120px]"
            >
              <option value="all">All Assignees</option>
              {projectMembers.map(m => (
                <option key={m.id} value={m.id}>{m.name || m.email}</option>
              ))}
            </select>

            {/* Sprint Filter */}
            <select
              value={selectedSprint}
              onChange={(e) => setSelectedSprint(e.target.value)}
              className="bg-secondary/50 border border-border rounded-lg px-3 py-2 text-xs font-bold outline-none cursor-pointer h-10 min-w-[120px]"
            >
              <option value="all">All Sprints</option>
              <option value="none">No Sprint</option>
              {sprints.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            {/* Due Date Filter */}
            <select
              value={selectedDueDate}
              onChange={(e) => setSelectedDueDate(e.target.value)}
              className="bg-secondary/50 border border-border rounded-lg px-3 py-2 text-xs font-bold outline-none cursor-pointer h-10 min-w-[120px]"
            >
              <option value="all">Any Date</option>
              <option value="overdue">Overdue</option>
              <option value="today">Due Today</option>
              <option value="week">Due This Week</option>
            </select>

            {/* Complexity Filter */}
            <select
              value={selectedComplexity}
              onChange={(e) => setSelectedComplexity(e.target.value)}
              className="bg-secondary/50 border border-border rounded-lg px-3 py-2 text-xs font-bold outline-none cursor-pointer h-10 min-w-[120px]"
            >
              <option value="all">Any Complexity</option>
              {[1, 2, 3, 4, 5].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            {/* Clear Button - Fixed Space to avoid shift */}
            <div className="w-20 flex justify-center">
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-destructive hover:bg-destructive/10 rounded-lg transition-all animate-in fade-in zoom-in duration-200"
                >
                  <X className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-secondary/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">Backlog Tasks</h2>
          </div>
          <span className="text-xs font-medium text-muted-foreground bg-background px-2 py-1 rounded-md border border-border">
            {filteredTasks.length} items
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs font-bold uppercase tracking-wider text-muted-foreground bg-secondary/5">
                <th className="px-6 py-3 border-b border-border">Task ID</th>
                <th className="px-6 py-3 border-b border-border w-full">Title</th>
                <th className="px-6 py-3 border-b border-border">Status</th>
                <th className="px-6 py-3 border-b border-border">Sprint</th>
                <th className="px-6 py-3 border-b border-border whitespace-nowrap">Due Date</th>
                <th className="px-6 py-3 border-b border-border">Assignees</th>
                <th className="px-6 py-3 border-b border-border text-center">Pts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground italic">
                    <div className="flex flex-col items-center gap-2">
                      <Info className="w-8 h-8 opacity-20" />
                      <span>No tasks match your filters.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-secondary/10 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                        OPEN-{task.id.slice(0, 6).toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <a
                        href={`/tasks/${task.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 group/title w-fit"
                      >
                        <span className="text-sm font-semibold group-hover/title:text-primary transition-colors line-clamp-1">{task.title}</span>
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover/title:opacity-100 transition-all text-muted-foreground" />
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        "text-[10px] font-black px-2 py-1 rounded-md uppercase border",
                        task.status === "DONE" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-primary/10 text-primary border-primary/20"
                      )}>
                        {task.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {task.sprint ? (
                        <span className="text-xs bg-secondary/80 text-foreground px-2 py-1 rounded-md font-bold border border-border">
                          {task.sprint.name}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {task.dueDate ? (
                        <div className={cn(
                          "inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-md border shadow-sm",
                          isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate))
                            ? "bg-destructive/10 text-destructive border-destructive/20"
                            : differenceInDays(new Date(task.dueDate), new Date()) <= 2
                              ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        )}>
                          <Calendar className="w-3 h-3" />
                          {isToday(new Date(task.dueDate)) ? "Today" : format(new Date(task.dueDate), "MMM d, yyyy")}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex overflow-hidden">
                        {task.assignments.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          task.assignments.map((assignment, idx) => {
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
                                    <img src={assignment.user.image} className="w-full h-full object-cover" />
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
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {task.points ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-500 text-[10px] font-black border border-emerald-500/20">
                          {task.points}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {filteredTasks.length > 0 && (
          <div className="px-6 py-4 border-t border-border bg-secondary/5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Show</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-background border border-border rounded px-2 py-1 text-xs font-bold outline-none cursor-pointer"
                >
                  {[5, 10, 20, 50].map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
                <span className="text-xs text-muted-foreground">per page</span>
              </div>
              <span className="text-xs text-muted-foreground">
                Showing {Math.min(filteredTasks.length, (currentPage - 1) * pageSize + 1)} to {Math.min(filteredTasks.length, currentPage * pageSize)} of {filteredTasks.length}
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
    </div>
  )
}
