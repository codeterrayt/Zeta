"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X, AlignLeft, MessageSquare, Clock, User, GitCommit, Link as LinkIcon, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { TiptapEditor } from "@/components/editor/tiptap-editor"

const COMPLEXITY_LABELS: Record<number, string> = {
  1: "Very Low",
  2: "Low",
  3: "Medium",
  4: "High",
  5: "Very High",
}

export function TaskModal({
  isOpen,
  onClose,
  task,
  projectMembers = [],
  boardSections = [],
}: {
  isOpen: boolean
  onClose: () => void
  task: any
  projectMembers?: Array<{ id: string; name: string | null; email: string | null }>
  boardSections?: Array<{ id: string; name: string }>
}) {
  const { data: session } = useSession()
  const router = useRouter()
  const [status, setStatus] = React.useState(task?.status ?? "BACKLOG")
  const [assigneeId, setAssigneeId] = React.useState(task?.assigneeId ?? "")
  const [reporterId, setReporterId] = React.useState(task?.creatorId || task?.reporter?.id || "")
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

  // Permissions check
  const currentUserId = (session?.user as any)?.id
  const canEdit = currentUserId === (task?.creatorId || task?.reporter?.id) || currentUserId === task?.assigneeId

  React.useEffect(() => {
    if (task) {
      setStatus(task.status ?? "BACKLOG")
      setAssigneeId(task.assigneeId ?? "")
      setReporterId(task.creatorId || task.reporter?.id || "")
      setPoints(task.points ?? "")
      setGithubUrl(task.githubUrl ?? "")
      setDevMeta({
        repo: task.repoName ?? "",
        branch: task.branchName ?? "",
        commit: task.commitIds ?? ""
      })
      setTitle(task.title ?? "")
      setDescription(task.description ?? "")
    }
  }, [task?.id])

  if (!task) return null

  const parseGithubUrl = (url: string) => {
    setGithubUrl(url)
    try {
      // Regex for commit: github.com/owner/repo/commit/hash
      // Regex for PR: github.com/owner/repo/pull/id
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
        commitIds: devMeta.commit || null
      }

      if (assigneeId) payload.assigneeId = assigneeId
      else payload.assigneeId = null

      if (reporterId) payload.creatorId = reporterId

      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        router.refresh()
        onClose()
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

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-5xl -translate-x-1/2 -translate-y-1/2 border border-border bg-card shadow-2xl sm:rounded-2xl max-h-[92vh] flex flex-col overflow-hidden outline-none">

          {/* Header */}
          <div className="flex items-center justify-between px-8 py-5 border-b border-border bg-card shrink-0">
            <div className="flex items-center gap-4 min-w-0">
              <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-3 py-1 rounded-full shrink-0 border border-primary/20 uppercase">
                OPEN-{task.id.slice(0, 6).toUpperCase()}
              </span>
              {canEdit ? (
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 w-full hover:bg-secondary/20 rounded px-1 transition-colors"
                />
              ) : (
                <DialogPrimitive.Title className="text-xl font-bold truncate tracking-tight">
                  {title}
                </DialogPrimitive.Title>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!canEdit && (
                <span className="text-[10px] bg-red-500 text-white px-2 py-1 rounded-md font-bold uppercase tracking-wider">Read Only</span>
              )}
              <DialogPrimitive.Close className="rounded-xl p-2 hover:bg-secondary transition-all shrink-0">
                <X className="w-5 h-5" />
              </DialogPrimitive.Close>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">

              {/* Left Column (Main Content) */}
              <div className="lg:col-span-8 p-8 space-y-8 border-r border-border">
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
                      className="prose prose-jira max-w-none bg-secondary/10 rounded-2xl p-6 border border-border/50 text-sm leading-relaxed"
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

                  {/* Assignee */}
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] block mb-2">Assignee</label>
                    <select
                      value={assigneeId}
                      onChange={e => setAssigneeId(e.target.value)}
                      disabled={!canEdit}
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-70"
                    >
                      <option value="">— Unassigned —</option>
                      {projectMembers.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name ?? m.email} {m.id === currentUserId ? "(You)" : ""}
                        </option>
                      ))}
                    </select>
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
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
