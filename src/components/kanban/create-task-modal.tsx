"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X, Plus, AlignLeft, User, Calendar, Shield, GitBranch, Eye, Users } from "lucide-react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { createTask } from "@/actions/task"
import { TiptapEditor } from "@/components/editor/tiptap-editor"
import { TaskAssignmentRole } from "@prisma/client"
import { cn } from "@/lib/utils"

interface ProjectMember {
  id: string
  name: string | null
  email: string | null
}

interface CreateTaskModalProps {
  projectId: string
  projectMembers?: ProjectMember[]
  boardSections?: { id: string; name: string }[]
  sprints?: { id: string; name: string }[]
  defaultSprintId?: string
}

const COMPLEXITY_OPTIONS = [
  { value: 1, label: "1 — Very Low" },
  { value: 2, label: "2 — Low" },
  { value: 3, label: "3 — Medium" },
  { value: 4, label: "4 — High" },
  { value: 5, label: "5 — Very High" },
]

const ROLE_CONFIG: Record<TaskAssignmentRole, { label: string; icon: any; color: string; bg: string }> = {
  OWNER: { label: "Primary Owner", icon: Shield, color: "text-amber-600", bg: "bg-amber-500/10" },
  SECONDARY_OWNER: { label: "Secondary Owner", icon: GitBranch, color: "text-blue-600", bg: "bg-blue-500/10" },
  POC: { label: "Point of Contact", icon: Eye, color: "text-emerald-600", bg: "bg-emerald-500/10" },
  ASSIGNEE: { label: "Assignee", icon: Users, color: "text-primary", bg: "bg-primary/10" },
}

export function CreateTaskModal({ 
  projectId, 
  projectMembers = [], 
  boardSections = [],
  sprints = [],
  defaultSprintId
}: CreateTaskModalProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [assignments, setAssignments] = React.useState<Array<{ userId: string; role: TaskAssignmentRole }>>([])
  const [reporterId, setReporterId] = React.useState("")
  const [dueDate, setDueDate] = React.useState("")
  
  const router = useRouter()
  const { data: session } = useSession()
  const currentUserId = session?.user?.id

  // Reset state when opening
  React.useEffect(() => {
    if (isOpen) {
      setDescription("")
      setAssignments(currentUserId ? [{ userId: currentUserId, role: "OWNER" }] : [])
      setReporterId(currentUserId ?? "")
      setDueDate("")
      setError("")
    }
  }, [isOpen, currentUserId])
  
  const defaultStatus = boardSections[0]?.name || "BACKLOG"

  const toggleAssignment = (userId: string) => {
    setAssignments(prev => {
      const exists = prev.find(a => a.userId === userId)
      if (exists) return prev.filter(a => a.userId !== userId)
      return [...prev, { userId, role: "ASSIGNEE" }]
    })
  }

  const updateRole = (userId: string, role: TaskAssignmentRole) => {
    setAssignments(prev => prev.map(a => a.userId === userId ? { ...a, role } : a))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    
    const res = await createTask({
      title: formData.get("title") as string,
      description,
      projectId,
      status: formData.get("status") as string || defaultStatus,
      points: formData.get("points") ? Number(formData.get("points")) : undefined,
      assignments,
      sprintId: formData.get("sprintId") as string || undefined,
      creatorId: reporterId || currentUserId,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    })

    setLoading(false)
    if (!res.success) {
      setError(res.error || "Failed to create task")
    } else {
      setIsOpen(false)
      router.refresh()
    }
  }

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      <DialogPrimitive.Trigger asChild>
        <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create Task
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-4xl -translate-x-1/2 -translate-y-1/2 border border-border bg-card rounded-xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
            <DialogPrimitive.Title className="text-lg font-semibold">Create Task</DialogPrimitive.Title>
            <DialogPrimitive.Close className="rounded-md p-1 hover:bg-secondary transition-colors">
              <X className="w-5 h-5" />
            </DialogPrimitive.Close>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 lg:grid-cols-12 h-full">
                {/* Main Content */}
                <div className="lg:col-span-8 p-6 space-y-6 border-r border-border">
                  {error && (
                    <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-2">
                      Title <span className="text-destructive">*</span>
                    </label>
                    <input
                      name="title"
                      required
                      placeholder="e.g. Implement user authentication"
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-2">Description</label>
                    <TiptapEditor
                      onChange={setDescription}
                      placeholder="Add more context, steps to reproduce, acceptance criteria..."
                      minHeight="300px"
                    />
                  </div>
                </div>

                {/* Sidebar */}
                <div className="lg:col-span-4 p-6 bg-secondary/5 space-y-6">
                  <div className="space-y-4">
                    {/* Status */}
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] block mb-2">Status</label>
                      <select 
                        name="status" 
                        defaultValue={defaultStatus}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        {boardSections.map(s => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Sprint */}
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] block mb-2">Sprint</label>
                      <select
                        name="sprintId"
                        defaultValue={defaultSprintId}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="">— Backlog —</option>
                        {sprints.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Assignments */}
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] block mb-2">Assignments</label>
                      <div className="space-y-2 mb-3 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                        {assignments.map((assignment) => {
                          const member = projectMembers.find(m => m.id === assignment.userId)
                          const config = ROLE_CONFIG[assignment.role]
                          return (
                            <div key={assignment.userId} className="p-2 bg-background border border-border rounded-lg space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[8px] font-bold shrink-0">
                                    {member?.name?.[0] ?? "?"}
                                  </div>
                                  <span className="text-xs font-bold truncate">{member?.name ?? member?.email}</span>
                                </div>
                                <button type="button" onClick={() => toggleAssignment(assignment.userId)} className="text-muted-foreground hover:text-destructive">
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                              <select
                                value={assignment.role}
                                onChange={(e) => updateRole(assignment.userId, e.target.value as TaskAssignmentRole)}
                                className={cn("w-full text-[10px] font-black uppercase tracking-wider rounded px-2 py-1 outline-none", config.bg, config.color)}
                              >
                                {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
                                  <option key={key} value={key}>{cfg.label}</option>
                                ))}
                              </select>
                            </div>
                          )
                        })}
                      </div>
                      <select
                        onChange={(e) => {
                          if (e.target.value) toggleAssignment(e.target.value)
                          e.target.value = ""
                        }}
                        className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2 text-xs font-bold outline-none"
                      >
                        <option value="">+ Add Assignee</option>
                        {projectMembers.filter(m => !assignments.some(a => a.userId === m.id)).map(m => (
                          <option key={m.id} value={m.id}>{m.name ?? m.email}</option>
                        ))}
                      </select>
                    </div>

                    {/* Reporter */}
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] block mb-2">Reporter</label>
                      <select
                        value={reporterId}
                        onChange={e => setReporterId(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        {projectMembers.map(m => (
                          <option key={m.id} value={m.id}>{m.name ?? m.email} {m.id === currentUserId ? "(You)" : ""}</option>
                        ))}
                      </select>
                    </div>

                    {/* Due Date */}
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] block mb-2">Due Date</label>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={e => setDueDate(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    {/* Complexity */}
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] block mb-2">Complexity</label>
                      <select name="points" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20">
                        <option value="">— None —</option>
                        {COMPLEXITY_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border shrink-0 bg-background">
              <DialogPrimitive.Close asChild>
                <button type="button" className="px-4 py-2 rounded-md text-sm font-medium hover:bg-secondary transition-colors">
                  Cancel
                </button>
              </DialogPrimitive.Close>
              <button
                type="submit"
                disabled={loading}
                className="bg-primary text-primary-foreground px-6 py-2 rounded-xl text-sm font-bold hover:bg-primary/90 transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
              >
                {loading ? "Creating..." : "Create Task"}
              </button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
