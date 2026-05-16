"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X, AlignLeft, MessageSquare, Clock, User, GitCommit, Link as LinkIcon, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

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
}: {
  isOpen: boolean
  onClose: () => void
  task: any
  projectMembers?: Array<{ id: string; name: string | null; email: string | null }>
}) {
  const router = useRouter()
  const [status, setStatus] = React.useState(task?.status ?? "BACKLOG")
  const [assigneeId, setAssigneeId] = React.useState(task?.assigneeId ?? "")
  const [points, setPoints] = React.useState<number | "">(task?.points ?? "")
  const [comment, setComment] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  // Sync when task changes (new task selected)
  React.useEffect(() => {
    if (task) {
      setStatus(task.status ?? "BACKLOG")
      setAssigneeId(task.assigneeId ?? "")
      setPoints(task.points ?? "")
    }
  }, [task?.id])

  if (!task) return null

  const assigneeName =
    projectMembers.find(m => m.id === task.assigneeId)?.name ??
    task.assignee?.name ??
    null

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          assigneeId: assigneeId || null,
          points: points === "" ? null : Number(points),
        }),
      })
      if (res.ok) {
        router.refresh()
        onClose()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-4xl -translate-x-1/2 -translate-y-1/2 border border-border bg-card shadow-2xl sm:rounded-xl max-h-[90vh] flex flex-col overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xs font-mono font-semibold text-muted-foreground bg-secondary px-2.5 py-1 rounded-md shrink-0">
                OPEN-{task.id.slice(0, 6).toUpperCase()}
              </span>
              <DialogPrimitive.Title className="text-lg font-bold truncate">
                {task.title}
              </DialogPrimitive.Title>
            </div>
            <DialogPrimitive.Close className="ml-4 rounded-md p-1 hover:bg-secondary transition-colors shrink-0">
              <X className="w-5 h-5" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">

              {/* Left: Description + Activity */}
              <div className="md:col-span-2 space-y-6">
                <section>
                  <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 mb-3">
                    <AlignLeft className="w-4 h-4" /> Description
                  </h3>
                  {task.description ? (
                    <div
                      className="prose prose-sm max-w-none bg-secondary/20 rounded-lg p-4 border border-border text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: task.description }}
                    />
                  ) : (
                    <div className="bg-secondary/20 rounded-lg p-4 border border-dashed border-border text-sm text-muted-foreground italic">
                      No description provided.
                    </div>
                  )}
                </section>

                <section>
                  <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 mb-3">
                    <MessageSquare className="w-4 h-4" /> Activity
                  </h3>
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-primary text-xs font-bold">
                      {assigneeName?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1">
                      <textarea
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        placeholder="Add a comment... (use @ to mention)"
                        className="w-full bg-background border border-border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px] resize-none"
                      />
                      <div className="flex justify-end mt-2">
                        <button
                          disabled={!comment.trim()}
                          className="bg-primary text-primary-foreground px-4 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              {/* Right: Metadata */}
              <div className="space-y-4">
                <div className="bg-secondary/20 rounded-xl border border-border divide-y divide-border overflow-hidden">
                  {/* Status */}
                  <div className="p-3">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Status</h4>
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value)}
                      className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-sm"
                    >
                      <option value="BACKLOG">Backlog</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="REVIEW">In Review</option>
                      <option value="DONE">Done</option>
                    </select>
                  </div>

                  {/* Assignee */}
                  <div className="p-3">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <User className="w-3 h-3" /> Assignee
                    </h4>
                    {projectMembers.length > 0 ? (
                      <select
                        value={assigneeId}
                        onChange={e => setAssigneeId(e.target.value)}
                        className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-sm"
                      >
                        <option value="">— Unassigned —</option>
                        {projectMembers.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name ?? m.email ?? m.id}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
                        <div className="w-5 h-5 rounded-full bg-secondary border border-border flex items-center justify-center text-[10px] font-bold">
                          {assigneeName?.[0]?.toUpperCase() ?? "?"}
                        </div>
                        <span>{assigneeName ?? "Unassigned"}</span>
                      </div>
                    )}
                  </div>

                  {/* Complexity */}
                  <div className="p-3">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Complexity (1–5)
                    </h4>
                    <div className="flex items-center gap-2">
                      <select
                        value={points}
                        onChange={e => setPoints(e.target.value === "" ? "" : Number(e.target.value))}
                        className="w-full bg-background border border-border rounded-md px-2 py-1.5 text-sm"
                      >
                        <option value="">— None —</option>
                        {[1, 2, 3, 4, 5].map(v => (
                          <option key={v} value={v}>{v} — {COMPLEXITY_LABELS[v]}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Dev */}
                  <div className="p-3">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                      <GitCommit className="w-3 h-3" /> Development
                    </h4>
                    <p className="text-xs text-muted-foreground">No commits linked.</p>
                  </div>

                  {/* Confluence */}
                  <div className="p-3">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                      <LinkIcon className="w-3 h-3" /> Doc Link
                    </h4>
                    <p className="text-xs text-primary cursor-pointer hover:underline">Create documentation</p>
                  </div>
                </div>

                {/* Save Button */}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
