"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X, AlignLeft, MessageSquare, Clock, User, GitCommit, Link as LinkIcon, Loader2, ExternalLink, Pencil, Trash2, Plus, ShieldCheck, UserCheck, PhoneCall, Users } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { TiptapEditor } from "@/components/editor/tiptap-editor"
import { cn } from "@/lib/utils"
import { TaskAssignmentRole } from "@prisma/client"
import { isPast, isToday } from "date-fns"

const COMPLEXITY_LABELS: Record<number, string> = {
  1: "Very Low",
  2: "Low",
  3: "Medium",
  4: "High",
  5: "Very High",
}

const ROLE_CONFIG: Record<TaskAssignmentRole, { label: string; icon: any; color: string; bg: string }> = {
  OWNER: { label: "Primary Owner", icon: ShieldCheck, color: "text-amber-600", bg: "bg-amber-500/10" },
  SECONDARY_OWNER: { label: "Secondary Owner", icon: UserCheck, color: "text-blue-600", bg: "bg-blue-500/10" },
  POC: { label: "Point of Contact", icon: PhoneCall, color: "text-emerald-600", bg: "bg-emerald-500/10" },
  ASSIGNEE: { label: "Assignee", icon: Users, color: "text-primary", bg: "bg-primary/10" },
}

export function TaskModal({
  isOpen,
  onClose,
  task,
  projectMembers = [],
  boardSections = [],
  standalone = false,
  sprints = []
}: {
  isOpen: boolean
  onClose?: () => void
  task: any
  projectMembers?: Array<{ id: string; name: string | null; email: string | null }>
  boardSections?: Array<{ id: string; name: string }>
  standalone?: boolean
  sprints?: Array<{ id: string; name: string; startDate: Date | null; endDate: Date | null }>
}) {
  const { data: session } = useSession()
  const router = useRouter()
  const [status, setStatus] = React.useState(task?.status ?? "BACKLOG")
  const [assignments, setAssignments] = React.useState<Array<{ userId: string; role: TaskAssignmentRole }>>(
    task?.assignments?.map((a: any) => ({ userId: a.userId, role: a.role })) ?? []
  )
  const [reporterId, setReporterId] = React.useState(task?.creatorId || task?.reporter?.id || "")
  const [sprintId, setSprintId] = React.useState(task?.sprintId || "")
  const [points, setPoints] = React.useState<number | "">(task?.points ?? "")
  const [githubUrl, setGithubUrl] = React.useState(task?.githubUrl ?? "")
  const [devMeta, setDevMeta] = React.useState({
    repo: task?.repoName ?? "",
    branch: task?.branchName ?? "",
    commit: task?.commitIds ?? ""
  })
  const [comment, setComment] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [title, setTitle] = React.useState(task?.title ?? "")
  const [description, setDescription] = React.useState(task?.description ?? "")
  const [dueDate, setDueDate] = React.useState<string>(task?.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "")

  // Permissions check
  const currentUserId = (session?.user as any)?.id
  const isReporter = currentUserId === (task?.creatorId || task?.reporter?.id)
  const isAssigned = assignments.some(a => a.userId === currentUserId)
  const canEdit = isReporter || isAssigned

  React.useEffect(() => {
    if (task) {
      setStatus(task.status ?? "BACKLOG")
      setAssignments(task.assignments?.map((a: any) => ({ userId: a.userId, role: a.role })) ?? [])
      setReporterId(task.creatorId || task.reporter?.id || "")
      setSprintId(task.sprintId || "")
      setPoints(task.points ?? "")
      setGithubUrl(task.githubUrl ?? "")
      setDevMeta({
        repo: task.repoName ?? "",
        branch: task.branchName ?? "",
        commit: task.commitIds ?? ""
      })
      setTitle(task.title ?? "")
      setDescription(task.description ?? "")
      setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "")
    }
  }, [task?.id])

  if (!task) return null

  const parseGithubUrl = (url: string) => {
    setGithubUrl(url)
    try {
      const commitMatch = url.match(/github\.com\/([^\/]+\/[^\/]+)\/commit\/([a-f0-9]+)/)
      const prMatch = url.match(/github\.com\/([^\/]+\/[^\/]+)\/pull\/(\d+)/)

      if (commitMatch) {
        setDevMeta(prev => ({ ...prev, repo: commitMatch[1], commit: commitMatch[2].slice(0, 7) }))
      } else if (prMatch) {
        setDevMeta(prev => ({ ...prev, repo: prMatch[1], branch: `PR #${prMatch[2]}` }))
      }
    } catch (e) {
      console.error("Failed to parse GitHub URL", e)
    }
  }

  const handleSave = async () => {
    if (!canEdit) return
    setSaving(true)
    try {
      const payload: any = {
        title,
        description,
        status,
        points: points === "" ? null : Number(points),
        githubUrl: githubUrl || null,
        repoName: devMeta.repo || null,
        branchName: devMeta.branch || null,
        commitIds: devMeta.commit || null,
        dueDate: dueDate || null,
        sprintId: sprintId || null,
        assignments
      }

      if (reporterId) payload.creatorId = reporterId

      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        router.refresh()
        if (!standalone) onClose?.()
      } else {
        const error = await res.json()
        alert(`Failed to save: ${error.error || "Unknown error"}`)
      }
    } catch (err) {
      console.error("Save error:", err)
      alert("An error occurred while saving the task.")
    } finally {
      setSaving(false)
    }
  }

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

  const modalContent = (
    <div className={cn(
      "flex flex-col transition-all w-full",
      standalone ? "min-h-screen" : "bg-card border border-border shadow-2xl sm:rounded-2xl h-full overflow-hidden outline-none"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          {canEdit ? (
            <span className="text-[10px] bg-emerald-500 text-white px-2 py-1 rounded-md font-bold uppercase tracking-wider">Editable</span>
          ) : (
            <span className="text-[10px] bg-red-500 text-white px-2 py-1 rounded-md font-bold uppercase tracking-wider">Read Only</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!standalone && (
            <Link
              href={`/tasks/${task.id}`}
              target="_blank"
              className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-all shrink-0 group relative"
              title="Open in new tab"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[10px] px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity border border-border">Open in new tab</span>
            </Link>
          )}

          {!standalone && (
            <DialogPrimitive.Close className="rounded-xl p-2 hover:bg-secondary transition-all shrink-0">
              <X className="w-5 h-5" />
            </DialogPrimitive.Close>
          )}
        </div>
      </div>

      {/* Body */}
      <div className={cn(
        "flex-1",
        standalone ? "" : "overflow-y-auto custom-scrollbar"
      )}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">

          {/* Left Column (Main Content) */}
          <div className="lg:col-span-8 p-8 space-y-8 border-r border-border">
            <section>
              <div className="flex items-center gap-2 mb-4 text-muted-foreground">
                <GitCommit className="w-4 h-4" />
                <h3 className="text-sm font-bold uppercase tracking-widest">Title</h3>
              </div>
              {canEdit ? (
                <div className="group relative">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="text-3xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 w-full hover:bg-secondary/20 rounded-lg px-2 py-1 transition-all"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              ) : (
                <h1 className="text-3xl font-bold px-2">
                  {title}
                </h1>
              )}
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4 text-muted-foreground">
                <AlignLeft className="w-4 h-4" />
                <h3 className="text-sm font-bold uppercase tracking-widest">Description</h3>
              </div>
              {canEdit ? (
                <TiptapEditor
                  key={task.id}
                  content={task.description || ""}
                  onChange={setDescription}
                  placeholder="Add a more detailed description..."
                  minHeight="150px"
                />
              ) : task.description ? (
                <div
                  className="prose max-w-none bg-secondary/10 rounded-2xl p-6 border border-border/50 text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: task.description }}
                />
              ) : (
                <div className="bg-secondary/10 rounded-2xl p-8 border border-dashed border-border/50 text-sm text-muted-foreground italic text-center">
                  No description provided for this task.
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4 text-muted-foreground">
                <MessageSquare className="w-4 h-4" />
                <h3 className="text-sm font-bold uppercase tracking-widest">Activity</h3>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold shadow-lg shadow-primary/20">
                  {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
                </div>
                <div className="flex-1 space-y-3">
                  <textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="w-full bg-background border border-border rounded-xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[100px] resize-none transition-all placeholder:text-muted-foreground/50"
                  />
                  <div className="flex justify-end">
                    <button
                      disabled={!comment.trim()}
                      className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-bold hover:bg-primary/90 transition-all disabled:opacity-40 shadow-md shadow-primary/10"
                    >
                      Comment
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column (Sidebar) */}
          <div className="lg:col-span-4 p-8 bg-secondary/5 space-y-6">
            <div className="space-y-5">
              {/* Task ID */}
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] block mb-2">Task ID</label>
                <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-3 py-1 rounded-full shrink-0 border border-primary/20 uppercase">
                  OPEN-{task.id.slice(0, 6).toUpperCase()}
                </span>
              </div>

              {/* Status */}
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] block mb-2">Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  disabled={!canEdit}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-70"
                >
                  {boardSections.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                  {boardSections.length === 0 && (
                    <>
                      <option value="BACKLOG">Backlog</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="REVIEW">In Review</option>
                      <option value="DONE">Done</option>
                    </>
                  )}
                </select>
              </div>

              {/* Multiple Assignees Section */}
              <div className="pt-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] block mb-3 flex items-center justify-between">
                  Assignments
                  <span className="bg-secondary px-1.5 py-0.5 rounded text-[8px]">{assignments.length}</span>
                </label>

                <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                  {assignments.map((assignment) => {
                    const member = projectMembers.find(m => m.id === assignment.userId)
                    const config = ROLE_CONFIG[assignment.role]
                    const RoleIcon = config.icon

                    return (
                      <div key={assignment.userId} className="p-3 bg-background border border-border rounded-xl shadow-sm space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                              {member?.name?.[0] ?? member?.email?.[0] ?? "?"}
                            </div>
                            <span className="text-xs font-bold truncate max-w-[120px]">{member?.name ?? member?.email}</span>
                          </div>
                          {canEdit && (
                            <button
                              onClick={() => toggleAssignment(assignment.userId)}
                              className="p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {canEdit ? (
                            <select
                              value={assignment.role}
                              onChange={(e) => updateRole(assignment.userId, e.target.value as TaskAssignmentRole)}
                              className={cn(
                                "text-[10px] font-black uppercase tracking-wider rounded px-2 py-1 outline-none w-full border-none appearance-none cursor-pointer",
                                config.bg, config.color
                              )}
                            >
                              {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
                                <option key={key} value={key}>{cfg.label}</option>
                              ))}
                            </select>
                          ) : (
                            <div className={cn("text-[10px] font-black uppercase tracking-wider rounded px-2 py-1 flex items-center gap-1.5", config.bg, config.color)}>
                              <RoleIcon className="w-3 h-3" />
                              {config.label}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}

                  {assignments.length === 0 && (
                    <div className="text-[10px] text-muted-foreground italic text-center py-4 bg-secondary/20 rounded-xl border border-dashed border-border/50">
                      No one assigned yet.
                    </div>
                  )}
                </div>

                {canEdit && (
                  <div className="relative">
                    <select
                      onChange={(e) => {
                        if (e.target.value) toggleAssignment(e.target.value)
                        e.target.value = ""
                      }}
                      className="w-full bg-secondary/50 hover:bg-secondary border border-border rounded-xl px-4 py-2 text-xs font-bold transition-all outline-none cursor-pointer"
                    >
                      <option value="">+ Add Assignee</option>
                      {projectMembers.filter(m => !assignments.some(a => a.userId === m.id)).map(m => (
                        <option key={m.id} value={m.id}>{m.name ?? m.email}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Reporter */}
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] block mb-2">Reporter</label>
                <select
                  value={reporterId}
                  onChange={e => setReporterId(e.target.value)}
                  disabled={!canEdit}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-70"
                >
                  {projectMembers.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name ?? m.email} {m.id === currentUserId ? "(You)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sprint */}
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] block mb-2">Sprint</label>
                <select
                  value={sprintId}
                  onChange={e => {
                    setSprintId(e.target.value)
                    setDueDate("") // Clear due date if sprint changes to avoid invalid state
                  }}
                  disabled={!canEdit}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-70"
                >
                  <option value="">— Backlog —</option>
                  {sprints.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Due Date */}
              <div>
                <label className={`text-[10px] font-bold uppercase tracking-[0.2em] block mb-2 ${dueDate && isPast(new Date(dueDate)) && !isToday(new Date(dueDate)) ? "text-destructive" : "text-muted-foreground"}`}>
                  Due Date
                  &nbsp;{dueDate && isPast(new Date(dueDate)) && !isToday(new Date(dueDate)) && (
                    <span className="text-[10px] text-destructive font-black mt-1 uppercase">(Overdue)</span>
                  )}
                </label>
                {(() => {
                  const selectedSprint = sprints.find(s => s.id === sprintId)
                  const minDate = selectedSprint?.startDate
                    ? new Date(selectedSprint.startDate).toISOString().split('T')[0]
                    : new Date().toISOString().split('T')[0]
                  const maxDate = selectedSprint?.endDate
                    ? new Date(selectedSprint.endDate).toISOString().split('T')[0]
                    : undefined

                  return (
                    <div className="relative">
                      <input
                        type="date"
                        value={dueDate}
                        min={minDate}
                        max={maxDate}
                        onChange={e => setDueDate(e.target.value)}
                        disabled={!canEdit}
                        className={cn(
                          "w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-70",
                          dueDate && isPast(new Date(dueDate)) && !isToday(new Date(dueDate)) && "border-2 border-destructive text-destructive"
                        )}
                      />
                    </div>
                  )
                })()}
              </div>

              {/* Complexity */}
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] block mb-2">Complexity (1–5)</label>
                <select
                  value={points}
                  onChange={e => setPoints(e.target.value === "" ? "" : Number(e.target.value))}
                  disabled={!canEdit}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-70"
                >
                  <option value="">— None —</option>
                  {[1, 2, 3, 4, 5].map(v => (
                    <option key={v} value={v}>{v} — {COMPLEXITY_LABELS[v]}</option>
                  ))}
                </select>
              </div>

              {/* Development */}
              <div className="pt-4 border-t border-border/50">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] block mb-3 flex items-center gap-2">
                  <GitCommit className="w-3 h-3" /> Development
                </label>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={githubUrl}
                    onChange={e => parseGithubUrl(e.target.value)}
                    disabled={!canEdit}
                    placeholder="Paste GitHub URL..."
                    className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-70"
                  />
                  {(devMeta.repo || devMeta.commit) && (
                    <div className="bg-background border border-border rounded-xl p-3 space-y-1 shadow-sm">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">{devMeta.repo}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-primary">{devMeta.commit || devMeta.branch}</span>
                        <a
                          href={githubUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-bold text-primary hover:underline"
                        >
                          Open in GitHub
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Doc Link */}
              <div className="pt-4 border-t border-border/50">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] block mb-2 flex items-center gap-2">
                  <LinkIcon className="w-3 h-3" /> Doc Link
                </label>
                <p className="text-xs text-primary font-bold cursor-pointer hover:underline">Create documentation</p>
              </div>
            </div>

            {canEdit && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-2xl text-sm font-bold hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 disabled:opacity-50 mt-4"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {saving ? "Updating..." : "Save Changes"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  if (standalone) return modalContent

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm" />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 lg:p-4 pointer-events-none">
          <DialogPrimitive.Content
            className="w-[94vw] max-w-8xl h-[94vh] outline-none resize both overflow-auto pointer-events-auto shadow-2xl"
            style={{ minWidth: "20rem", minHeight: "20rem" }}
          >
            {modalContent}
          </DialogPrimitive.Content>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
