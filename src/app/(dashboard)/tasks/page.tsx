"use client"

import * as React from "react"
import { ListTodo, Search, Filter, Calendar, Tag, ChevronDown, Layout, Milestone, Clock, CheckCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { getMyTasks } from "@/actions/task"
import { getProjects } from "@/actions/project"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { CustomDropdown } from "@/components/ui/custom-dropdown"

const STATUS_COLORS: Record<string, string> = {
  BACKLOG: "bg-secondary text-muted-foreground",
  IN_PROGRESS: "bg-blue-500/10 text-blue-500",
  REVIEW: "bg-yellow-500/10 text-yellow-500",
  DONE: "bg-emerald-500/10 text-emerald-500",
}

const STATUS_ICONS: Record<string, any> = {
  BACKLOG: Clock,
  IN_PROGRESS: Clock,
  REVIEW: AlertCircle,
  DONE: CheckCircle2,
}

export default function MyTasksPage() {
  const { data: session } = useSession()
  const userId = (session?.user as any)?.id

  const [tasks, setTasks] = React.useState<any[]>([])
  const [projects, setProjects] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  
  const [search, setSearch] = React.useState("")
  const [selectedProjectId, setSelectedProjectId] = React.useState("ALL")
  const [selectedStatus, setSelectedStatus] = React.useState("ALL")
  const [currentPage, setCurrentPage] = React.useState(1)
  const itemsPerPage = 8

  React.useEffect(() => {
    async function load() {
      const [tasksRes, projectsRes] = await Promise.all([
        getMyTasks(),
        getProjects()
      ])
      if (tasksRes.success) setTasks(tasksRes.tasks || [])
      if (projectsRes.success) setProjects(projectsRes.projects || [])
      setLoading(false)
    }
    load()
  }, [])

  const filteredTasksAll = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(search.toLowerCase()) ||
      task.id.toLowerCase().includes(search.toLowerCase())
    
    const matchesProject = selectedProjectId === "ALL" || task.projectId === selectedProjectId
    const matchesStatus = selectedStatus === "ALL" || task.status === selectedStatus
    
    return matchesSearch && matchesProject && matchesStatus
  })

  const totalPages = Math.ceil(filteredTasksAll.length / itemsPerPage)
  const filteredTasks = filteredTasksAll.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  React.useEffect(() => {
    setCurrentPage(1)
  }, [search, selectedProjectId, selectedStatus])

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 lg:p-10 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
          <ListTodo className="w-10 h-10 text-primary" />
          My Tasks
        </h1>
        <p className="text-muted-foreground mt-1 font-medium">All tasks assigned to you across all projects.</p>
      </div>

      {/* Filters Bar */}
      <div className="bg-card border border-border rounded-[2rem] p-4 lg:p-6 shadow-sm flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by title or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-secondary/30 border border-border/50 rounded-2xl pl-12 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <CustomDropdown
            value={selectedStatus}
            onChange={setSelectedStatus}
            icon={Filter}
            label="All Status"
            options={[
              { value: "ALL", label: "All Status" },
              { value: "BACKLOG", label: "Backlog" },
              { value: "IN_PROGRESS", label: "In Progress" },
              { value: "REVIEW", label: "Review" },
              { value: "DONE", label: "Done" }
            ]}
          />

          <CustomDropdown
            value={selectedProjectId}
            onChange={setSelectedProjectId}
            icon={Layout}
            label="All Projects"
            options={[
              { value: "ALL", label: "All Projects" },
              ...projects.map(p => ({ value: p.id, label: p.name }))
            ]}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-20 bg-secondary/20 rounded-2xl animate-pulse border border-border/50" />
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center space-y-6">
            <div className="w-24 h-24 bg-secondary/50 rounded-full flex items-center justify-center border border-border">
              <ListTodo className="w-12 h-12 text-muted-foreground/30" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black tracking-tight">No tasks found</h3>
              <p className="text-muted-foreground max-w-sm">You're all caught up! No tasks match your current filters.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 pb-20">
            <div className="grid grid-cols-1 gap-4">
              {filteredTasks.map((task) => {
                const StatusIcon = STATUS_ICONS[task.status] || Clock
                return (
                  <Link
                    key={task.id}
                    href={`/tasks/${task.id}`}
                    className="group bg-card border border-border/60 rounded-2xl p-5 hover:border-primary/40 transition-all shadow-sm hover:shadow-xl hover:-translate-y-1 duration-300 flex flex-col md:flex-row md:items-center justify-between gap-6"
                  >
                    <div className="flex items-center gap-5 flex-1 min-w-0">
                      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", STATUS_COLORS[task.status])}>
                        <StatusIcon className="w-6 h-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 bg-secondary/50 px-2 py-0.5 rounded">
                            OPEN-{task.id.slice(0, 6).toUpperCase()}
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded flex items-center gap-1">
                            <Tag className="w-3 h-3" /> {task.project.name}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold group-hover:text-primary transition-colors truncate">{task.title}</h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-8 shrink-0">
                      {task.points && (
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-tighter">Points</span>
                          <span className="text-sm font-black text-primary">{task.points}</span>
                        </div>
                      )}
                      
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-tighter">Due Date</span>
                        <div className="flex items-center gap-1.5 text-sm font-bold">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          {task.dueDate ? format(new Date(task.dueDate), "MMM d") : "No date"}
                        </div>
                      </div>

                      <div className={cn("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border", STATUS_COLORS[task.status])}>
                        {task.status.replace("_", " ")}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-xl border border-border bg-card text-xs font-bold hover:bg-secondary disabled:opacity-50 transition-all"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={cn(
                        "w-10 h-10 rounded-xl text-xs font-bold transition-all border",
                        currentPage === i + 1 
                          ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" 
                          : "bg-card border-border hover:bg-secondary text-muted-foreground"
                      )}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 rounded-xl border border-border bg-card text-xs font-bold hover:bg-secondary disabled:opacity-50 transition-all"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
