"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X, AlignLeft, MessageSquare, Clock, User, GitCommit, Link as LinkIcon, Loader2, ExternalLink, Pencil, Trash2, Plus, ShieldCheck, UserCheck, PhoneCall, Users, BookOpen, FileText, Eye, Edit3, Paperclip, Download } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { TiptapEditor } from "@/components/editor/tiptap-editor"
import { cn } from "@/lib/utils"
import { TaskAssignmentRole } from "@prisma/client"
import { isPast, isToday } from "date-fns"
import { CommentSection } from "./comment-section"
import { ContentRenderer } from "@/components/editor/content-renderer"
import { getAttachmentsForContext } from "@/actions/get-attachments"
import { deleteAttachment } from "@/actions/attachment"
import { toast } from "sonner"
import tippy, { Instance } from "tippy.js"
import "tippy.js/dist/tippy.css"
import "tippy.js/animations/shift-away.css"
import { createPortal } from "react-dom"
import { TaskTimeline } from "./task-timeline"

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

  const projectId = task?.projectId

  // Permissions check
  const currentUserId = (session?.user as any)?.id
  const isReporter = currentUserId === (task?.creatorId || task?.reporter?.id)
  const isAssigned = assignments.some(a => a.userId === currentUserId)
  const canEdit = isReporter || isAssigned

  const [fullTask, setFullTask] = React.useState(task)
  const [loading, setLoading] = React.useState(false)
  const [projectAttachments, setProjectAttachments] = React.useState<any[]>([])

  React.useEffect(() => {
    if (task?.id) {
      // Set initial data
      setFullTask(task)
      setTitle(task.title ?? "")
      setDescription(task.description ?? "")
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
      setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "")

      // Fetch fresh data with comments
      const fetchFullTask = async () => {
        setLoading(true)
        const { getTaskById } = await import("@/actions/task")
        const res = await getTaskById(task.id)
        if (res.success && res.task) {
          setFullTask(res.task)
        }
        setLoading(false)
      }
      fetchFullTask()

      // Load project-level attachments for file mention badges
      if (task.projectId) {
        getAttachmentsForContext({ projectId: task.projectId }).then(res => {
          setProjectAttachments(res || [])
        })
      }
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
          <TaskTimeline taskId={task.id} taskTitle={task.title} />
          
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
                  projectId={projectId}
                />
              ) : task.description ? (
                <ContentRenderer
                  html={task.description}
                  attachments={projectAttachments}
                  className="prose max-w-none bg-secondary/10 rounded-2xl p-6 border border-border/50 text-sm leading-relaxed"
                />
              ) : (
                <div className="bg-secondary/10 rounded-2xl p-8 border border-dashed border-border/50 text-sm text-muted-foreground italic text-center">
                  No description provided for this task.
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center gap-2 mb-6 text-muted-foreground">
                <MessageSquare className="w-4 h-4" />
                <h3 className="text-sm font-bold uppercase tracking-widest">Activity & Discussion</h3>
              </div>
              <CommentSection
                taskId={task.id}
                projectId={task.projectId}
                initialComments={fullTask?.comments || []}
                projectMembers={projectMembers as any}
              />
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

              {/* Documentation Section */}
              <div className="pt-4 border-t border-border/50">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] block mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-3 h-3" /> Documentation
                  </div>
                  <span className="bg-secondary px-1.5 py-0.5 rounded text-[8px]">{(task as any).documents?.length || 0}</span>
                </label>
                
                <div className="space-y-2 mb-3">
                  {(task as any).documents?.map((link: any) => (
                    <div key={link.document.id} className="flex items-center justify-between p-2 bg-secondary/30 rounded-lg group/doc">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="text-xs font-medium truncate">{link.document.title}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover/doc:opacity-100 transition-all">
                        <a 
                          href={`/documentation/${link.document.id}?mode=view`} 
                          target="_blank"
                          className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-primary transition-colors"
                          title="View Document"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </a>
                        {canEdit && (
                          <a 
                            href={`/documentation/${link.document.id}?mode=edit`} 
                            target="_blank"
                            className="p-1.5 hover:bg-secondary rounded text-muted-foreground hover:text-amber-600 transition-colors"
                            title="Edit Document"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {(!(task as any).documents || (task as any).documents.length === 0) && (
                    <p className="text-[10px] text-muted-foreground italic px-1">No documentation linked yet.</p>
                  )}
                </div>

                <a 
                  href={`/projects/${projectId}/tasks/${task.id}/docs/new`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary font-bold hover:underline flex items-center gap-1 w-fit"
                >
                  <Plus className="w-3 h-3" />
                  Create documentation
                </a>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border/50">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Paperclip className="w-4 h-4" />
                <h3 className="text-[10px] font-black uppercase tracking-widest">Project Attachments</h3>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-1 gap-2">
                  {projectAttachments.map((file) => (
                    <div key={file.id} className="flex items-center gap-2 p-2 rounded-xl bg-background border border-border/60 hover:border-primary/30 transition-all group">
                      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0 text-base">
                        {getFileEmoji(file.type, file.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold truncate" title={file.name}>{file.name}</p>
                        <p className="text-[8px] text-muted-foreground">{formatBytes(file.size)}</p>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <AttachmentEyePreview file={file} />
                        <a href={file.url} download className="p-1.5 hover:bg-secondary rounded-lg transition-colors" title="Download">
                          <Download className="w-3 h-3" />
                        </a>
                        {session?.user?.id === file.userId && (
                          <button 
                            onClick={async () => {
                              if (!confirm("Delete attachment?")) return
                              const res = await deleteAttachment(file.id)
                              if (res.success) {
                                setProjectAttachments(prev => prev.filter(a => a.id !== file.id))
                                toast.success("Attachment deleted")
                              } else {
                                toast.error(res.error)
                              }
                            }}
                            className="p-1.5 hover:bg-destructive/10 text-destructive rounded-lg transition-colors" 
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {projectAttachments.length === 0 && (
                    <p className="text-[10px] text-muted-foreground italic px-1">No attachments uploaded yet.</p>
                  )}
                </div>
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
            <DialogPrimitive.Title className="sr-only">
              {task.title || "Task Details"}
            </DialogPrimitive.Title>
            {modalContent}
          </DialogPrimitive.Content>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function AttachmentEyePreview({ file }: { file: any }) {
  const iconRef = React.useRef<HTMLButtonElement>(null)
  const tippyInstance = React.useRef<Instance | null>(null)
  const [tippyContainer, setTippyContainer] = React.useState<HTMLElement | null>(null)
  
  const isImage = file.type?.startsWith("image/")
  const isPdf = file.type === "application/pdf"
  const canPreview = isImage || isPdf
  const emoji = getFileEmoji(file.type, file.name)

  React.useEffect(() => {
    if (!iconRef.current || !canPreview || !file.url) return

    const container = document.createElement("div")
    container.style.display = "flex"
    setTippyContainer(container)

    tippyInstance.current = tippy(iconRef.current, {
      content: container,
      interactive: true,
      trigger: "mouseenter focus",
      placement: "top",
      animation: "shift-away",
      theme: "light",
      maxWidth: "none",
      appendTo: () => document.body,
    })

    return () => {
      tippyInstance.current?.destroy()
    }
  }, [file.url, canPreview])

  if (!canPreview) return null

  return (
    <>
      <button 
        ref={iconRef}
        type="button"
        className="p-1.5 hover:bg-secondary rounded-lg transition-colors text-amber-600"
        title="Preview"
        onClick={(e) => {
          e.preventDefault()
          window.open(file.url, "_blank")
        }}
      >
        <Eye className="w-3 h-3" />
      </button>

      {tippyContainer && createPortal(
        <div className="flex flex-col bg-popover text-popover-foreground border border-border/50 rounded-xl shadow-2xl overflow-hidden min-w-[240px] max-w-[320px] pointer-events-auto">
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border/50 bg-secondary/30">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base">{emoji}</span>
              <span className="text-[11px] font-bold truncate">{file.name}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <a href={file.url} download className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold hover:bg-primary/90 transition-colors">
                <Download className="w-3 h-3" />
              </a>
              <a href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary border border-border/50 text-[10px] font-bold hover:bg-secondary/80 text-amber-600 transition-colors">
                <Eye className="w-3 h-3" />
              </a>
            </div>
          </div>
          <div className="overflow-hidden flex items-center justify-center bg-secondary/20 relative group/preview" style={{ minHeight: 120 }}>
            {isImage ? (
              <img src={file.url} alt={file.name} className="max-w-full max-h-48 object-contain transition-transform duration-300 group-hover/preview:scale-[1.02]" />
            ) : isPdf ? (
              <iframe src={file.url} className="w-full border-none bg-white pointer-events-none" style={{ height: 250 }} title={file.name} />
            ) : null}
          </div>
        </div>,
        tippyContainer
      )}
    </>
  )
}

function getFileEmoji(type: string, name: string) {
  if (type.startsWith("image/")) return "🖼️"
  if (type === "application/pdf") return "📄"
  if (type.includes("word") || name.endsWith(".doc") || name.endsWith(".docx")) return "📝"
  if (type.includes("sheet") || name.endsWith(".xls") || name.endsWith(".xlsx") || name.endsWith(".csv")) return "📊"
  if (type.includes("presentation") || name.endsWith(".ppt") || name.endsWith(".pptx")) return "📑"
  if (type.includes("zip") || name.endsWith(".zip") || name.endsWith(".rar")) return "🗜️"
  if (type.startsWith("video/")) return "🎬"
  if (type.startsWith("audio/")) return "🎵"
  if (type.includes("javascript") || type.includes("typescript") || name.match(/\.(ts|js|py|go|rs|java|c|cpp)$/)) return "💻"
  return "📎"
}

function formatBytes(bytes: number) {
  if (!bytes) return "–"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
