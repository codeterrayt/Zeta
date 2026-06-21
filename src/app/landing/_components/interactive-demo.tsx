"use client"

import { useState } from "react"
import {
  Plus, Folder, Activity, ChevronRight, Calendar, Users, CheckCircle2,
  Circle, Clock, AlertCircle, GripVertical, X
} from "lucide-react"
import { cn } from "@/lib/utils"

// ---- Static demo data ----
const DEMO_PROJECTS = [
  { id: "p1", name: "Platform Engineering", description: "Core infrastructure & DevOps pipelines", color: "bg-blue-500" },
  { id: "p2", name: "Mobile App v3", description: "iOS & Android redesign", color: "bg-purple-500" },
  { id: "p3", name: "Marketing Site", description: "Website overhaul & SEO", color: "bg-emerald-500" },
]

const DEMO_SPRINTS = {
  p1: [
    { id: "s1", name: "Sprint 12 – CI/CD", status: "ACTIVE", start: "Jun 10", end: "Jun 24", tasks: 14, done: 9 },
    { id: "s2", name: "Sprint 13 – Observability", status: "PLANNED", start: "Jun 24", end: "Jul 8", tasks: 8, done: 0 },
    { id: "s3", name: "Sprint 11 – Database", status: "COMPLETED", start: "May 27", end: "Jun 10", tasks: 12, done: 12 },
  ],
  p2: [
    { id: "s4", name: "Sprint 4 – Onboarding", status: "ACTIVE", start: "Jun 15", end: "Jun 29", tasks: 10, done: 6 },
  ],
  p3: [
    { id: "s5", name: "Sprint 2 – Homepage", status: "ACTIVE", start: "Jun 12", end: "Jun 26", tasks: 7, done: 5 },
  ],
}

const DEMO_COLUMNS = [
  {
    id: "TODO",
    title: "To Do",
    tasks: [
      { id: "t1", title: "Set up Prometheus metrics endpoint", points: 3, assignee: "RK", due: null },
      { id: "t2", title: "Write E2E tests for auth flow", points: 2, assignee: "AS", due: "Jun 22" },
    ],
  },
  {
    id: "IN_PROGRESS",
    title: "In Progress",
    tasks: [
      { id: "t3", title: "Migrate CI pipeline to GitHub Actions", points: 5, assignee: "RK", due: "Jun 21" },
      { id: "t4", title: "Configure Grafana dashboards", points: 3, assignee: "PM", due: "Jun 23" },
    ],
  },
  {
    id: "IN_REVIEW",
    title: "In Review",
    tasks: [
      { id: "t5", title: "Update Docker Compose for staging", points: 2, assignee: "AS", due: "Jun 20" },
    ],
  },
  {
    id: "DONE",
    title: "Done",
    tasks: [
      { id: "t6", title: "Set up Terraform for AWS EKS", points: 8, assignee: "RK", due: null },
      { id: "t7", title: "Configure ALB load balancer", points: 3, assignee: "PM", due: null },
    ],
  },
]

type Step = "projects" | "sprints" | "kanban"

export function InteractiveDemo() {
  const [step, setStep] = useState<Step>("projects")
  const [selectedProject, setSelectedProject] = useState<typeof DEMO_PROJECTS[0] | null>(null)
  const [selectedSprint, setSelectedSprint] = useState<typeof DEMO_SPRINTS["p1"][0] | null>(null)
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState("")
  const [columns, setColumns] = useState(DEMO_COLUMNS)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  const goToSprints = (project: typeof DEMO_PROJECTS[0]) => {
    setSelectedProject(project)
    setStep("sprints")
    setSelectedSprint(null)
  }

  const goToKanban = (sprint: typeof DEMO_SPRINTS["p1"][0]) => {
    setSelectedSprint(sprint)
    setStep("kanban")
  }

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return
    setShowCreateProject(false)
    setNewProjectName("")
  }

  const handleDragStart = (taskId: string) => setDragging(taskId)
  const handleDragOver = (colId: string, e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(colId)
  }
  const handleDrop = (targetColId: string) => {
    if (!dragging) return
    setColumns(prev => {
      const srcCol = prev.find(c => c.tasks.some(t => t.id === dragging))
      if (!srcCol || srcCol.id === targetColId) return prev
      const task = srcCol.tasks.find(t => t.id === dragging)!
      return prev.map(c => {
        if (c.id === srcCol.id) return { ...c, tasks: c.tasks.filter(t => t.id !== dragging) }
        if (c.id === targetColId) return { ...c, tasks: [...c.tasks, task] }
        return c
      })
    })
    setDragging(null)
    setDragOver(null)
  }

  const sprints = selectedProject ? (DEMO_SPRINTS as any)[selectedProject.id] || [] : []

  const statusIcon = (status: string) => {
    if (status === "ACTIVE") return <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
    if (status === "COMPLETED") return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
    return <Circle className="w-3.5 h-3.5 text-muted-foreground" />
  }

  const colIcon = (id: string) => {
    if (id === "TODO") return <Circle className="w-3 h-3 text-muted-foreground" />
    if (id === "IN_PROGRESS") return <Clock className="w-3 h-3 text-primary" />
    if (id === "IN_REVIEW") return <AlertCircle className="w-3 h-3 text-amber-500" />
    return <CheckCircle2 className="w-3 h-3 text-emerald-500" />
  }

  return (
    <section id="how-it-works" className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-widest mb-4">
            Interactive Demo
          </div>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-foreground mb-4">
            See how it works
          </h2>
          <p className="text-muted-foreground text-lg font-medium max-w-xl mx-auto">
            Click through — create a project, plan sprints, drag tasks on the Kanban board.
          </p>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-sm font-bold text-muted-foreground">
          <button
            onClick={() => { setStep("projects"); setSelectedProject(null); setSelectedSprint(null) }}
            className={cn("hover:text-foreground transition-colors", step === "projects" && "text-foreground")}
          >
            Projects
          </button>
          {selectedProject && (
            <>
              <ChevronRight className="w-4 h-4" />
              <button
                onClick={() => { setStep("sprints"); setSelectedSprint(null) }}
                className={cn("hover:text-foreground transition-colors", step === "sprints" && "text-foreground")}
              >
                {selectedProject.name}
              </button>
            </>
          )}
          {selectedSprint && (
            <>
              <ChevronRight className="w-4 h-4" />
              <span className="text-foreground">{selectedSprint.name}</span>
            </>
          )}
        </div>

        {/* Demo panel */}
        <div className="bg-card border border-border rounded-3xl shadow-2xl overflow-hidden min-h-[540px]">
          {/* Fake window chrome */}
          <div className="bg-secondary/40 border-b border-border px-5 py-3 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive/60" />
            <div className="w-3 h-3 rounded-full bg-amber-400/60" />
            <div className="w-3 h-3 rounded-full bg-emerald-400/60" />
            <div className="flex items-center gap-2 ml-3 text-xs font-bold text-muted-foreground">
              <Activity className="w-3.5 h-3.5 text-primary" />
              Zeta
            </div>
          </div>

          <div className="flex h-full">
            {/* Mini sidebar */}
            <div className="w-52 shrink-0 border-r border-border bg-card p-4 hidden md:block">
              <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3 px-2">Menu</div>
              {[
                { label: "Dashboard", active: false },
                { label: "Projects", active: true },
                { label: "My Tasks", active: false },
                { label: "Documentation", active: false },
                { label: "Chat", active: false },
              ].map(item => (
                <div
                  key={item.label}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold mb-1 transition-all",
                    item.active
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                      : "text-muted-foreground hover:bg-secondary cursor-pointer"
                  )}
                >
                  <Folder className="w-4 h-4" />
                  {item.label}
                </div>
              ))}
            </div>

            {/* Main content */}
            <div className="flex-1 p-6 overflow-auto min-h-[480px]">
              {/* ===== PROJECTS VIEW ===== */}
              {step === "projects" && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-black text-foreground">Projects</h2>
                    <button
                      onClick={() => setShowCreateProject(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black hover:bg-primary/90 transition-all shadow-sm shadow-primary/20"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      New Project
                    </button>
                  </div>

                  {/* Create project modal inline */}
                  {showCreateProject && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm" onClick={() => setShowCreateProject(false)}>
                      <div
                        className="bg-card border border-border rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <h3 className="text-xl font-black text-foreground">Create new project</h3>
                            <p className="text-sm text-muted-foreground font-medium mt-1">A container for all your tasks & sprints.</p>
                          </div>
                          <button onClick={() => setShowCreateProject(false)} className="p-2 rounded-full hover:bg-secondary transition-all">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">
                              Project Name <span className="text-destructive">*</span>
                            </label>
                            <input
                              autoFocus
                              value={newProjectName}
                              onChange={e => setNewProjectName(e.target.value)}
                              placeholder="e.g. Platform Engineering"
                              className="w-full bg-secondary/30 border border-border/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium placeholder:text-muted-foreground/60"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-black uppercase tracking-widest text-muted-foreground mb-2">Description</label>
                            <textarea
                              placeholder="What is this project about?"
                              className="w-full bg-secondary/30 border border-border/50 rounded-xl px-4 py-3 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium placeholder:text-muted-foreground/60"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-border/40">
                          <button onClick={() => setShowCreateProject(false)} className="px-6 py-2.5 rounded-2xl text-sm font-bold hover:bg-secondary transition-colors">
                            Cancel
                          </button>
                          <button
                            onClick={handleCreateProject}
                            className="px-8 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-black hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
                          >
                            Create Project
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {DEMO_PROJECTS.map(project => (
                      <button
                        key={project.id}
                        onClick={() => goToSprints(project)}
                        className="text-left bg-card border border-border rounded-2xl p-5 hover:border-primary/50 hover:shadow-md transition-all group"
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", project.color)}>
                            <Folder className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <h3 className="font-black text-sm text-foreground group-hover:text-primary transition-colors">{project.name}</h3>
                            <p className="text-xs text-muted-foreground font-medium mt-0.5">{project.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-bold">
                          <Users className="w-3 h-3" />
                          <span>3 members</span>
                          <span className="ml-auto text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            View sprints <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ===== SPRINTS VIEW ===== */}
              {step === "sprints" && selectedProject && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-black text-foreground">{selectedProject.name}</h2>
                      <p className="text-sm text-muted-foreground font-medium">Sprints &amp; backlog</p>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black hover:bg-primary/90 transition-all shadow-sm shadow-primary/20">
                      <Plus className="w-3.5 h-3.5" />
                      New Sprint
                    </button>
                  </div>

                  <div className="space-y-3">
                    {sprints.map((sprint: typeof DEMO_SPRINTS["p1"][0]) => (
                      <button
                        key={sprint.id}
                        onClick={() => goToKanban(sprint)}
                        className="w-full text-left bg-card border border-border rounded-2xl p-5 hover:border-primary/50 hover:shadow-md transition-all group"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {statusIcon(sprint.status)}
                            <h3 className="font-black text-sm text-foreground group-hover:text-primary transition-colors">{sprint.name}</h3>
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                              sprint.status === "ACTIVE" ? "bg-primary/10 text-primary border border-primary/20" :
                              sprint.status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" :
                              "bg-secondary text-muted-foreground border border-border"
                            )}>
                              {sprint.status}
                            </span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                            <Calendar className="w-3 h-3" />
                            {sprint.start} – {sprint.end}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between text-xs font-bold text-muted-foreground mb-1.5">
                              <span>{sprint.done}/{sprint.tasks} tasks</span>
                              <span>{sprint.tasks > 0 ? Math.round((sprint.done / sprint.tasks) * 100) : 0}%</span>
                            </div>
                            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${sprint.tasks > 0 ? (sprint.done / sprint.tasks) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ===== KANBAN VIEW ===== */}
              {step === "kanban" && selectedSprint && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-black text-foreground">{selectedSprint.name}</h2>
                      <p className="text-sm text-muted-foreground font-medium">Drag tasks between columns</p>
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black hover:bg-primary/90 transition-all shadow-sm shadow-primary/20">
                      <Plus className="w-3.5 h-3.5" />
                      Add Task
                    </button>
                  </div>

                  <div className="flex gap-4 overflow-x-auto pb-4">
                    {columns.map(col => (
                      <div
                        key={col.id}
                        className={cn(
                          "flex flex-col w-60 shrink-0 rounded-2xl p-3 border transition-all",
                          dragOver === col.id
                            ? "bg-primary/5 border-primary/30 ring-2 ring-primary/10"
                            : "bg-secondary/20 border-transparent"
                        )}
                        onDragOver={e => handleDragOver(col.id, e)}
                        onDrop={() => handleDrop(col.id)}
                        onDragLeave={() => setDragOver(null)}
                      >
                        <div className="flex items-center gap-2 mb-3 px-1">
                          {colIcon(col.id)}
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{col.title}</span>
                          <span className="ml-auto text-[9px] font-black bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-full">{col.tasks.length}</span>
                        </div>

                        <div className="flex flex-col gap-2 min-h-[160px]">
                          {col.tasks.map(task => (
                            <div
                              key={task.id}
                              draggable
                              onDragStart={() => handleDragStart(task.id)}
                              onDragEnd={() => setDragging(null)}
                              className={cn(
                                "bg-card border border-border rounded-xl p-3 cursor-grab active:cursor-grabbing hover:border-primary/40 hover:shadow-sm transition-all group",
                                dragging === task.id && "opacity-40 rotate-2 scale-95"
                              )}
                            >
                              <div className="flex items-start gap-2 mb-2">
                                <GripVertical className="w-3 h-3 text-muted-foreground/40 shrink-0 mt-0.5 group-hover:text-muted-foreground transition-colors" />
                                <p className="text-xs font-bold text-foreground/90 leading-snug">{task.title}</p>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-bold text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded">
                                  OPEN-{task.id.toUpperCase()}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  {task.due && (
                                    <span className="text-[9px] font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20">
                                      {task.due}
                                    </span>
                                  )}
                                  <div className="w-5 h-5 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-[8px] font-black">
                                    {task.assignee}
                                  </div>
                                  {task.points && (
                                    <div className="w-5 h-5 rounded bg-primary/5 border border-primary/10 flex items-center justify-center text-[9px] font-bold text-primary">
                                      {task.points}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Step guide */}
        <div className="flex flex-wrap justify-center gap-6 mt-8">
          {[
            { key: "projects", label: "1. Select or create a project", active: step === "projects" },
            { key: "sprints", label: "2. Open a sprint", active: step === "sprints" },
            { key: "kanban", label: "3. Drag tasks on the board", active: step === "kanban" },
          ].map(s => (
            <div key={s.key} className={cn(
              "flex items-center gap-2 text-sm font-bold transition-all",
              s.active ? "text-primary" : "text-muted-foreground"
            )}>
              <div className={cn(
                "w-2 h-2 rounded-full transition-all",
                s.active ? "bg-primary scale-125" : "bg-muted-foreground/40"
              )} />
              {s.label}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
