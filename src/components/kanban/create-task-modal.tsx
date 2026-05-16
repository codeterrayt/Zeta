"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { createTask } from "@/actions/task"
import { TiptapEditor } from "@/components/editor/tiptap-editor"

interface ProjectMember {
  id: string
  name: string | null
  email: string | null
}

interface CreateTaskModalProps {
  projectId: string
  projectMembers?: ProjectMember[]
  boardSections?: { id: string; name: string }[]
}

const COMPLEXITY_OPTIONS = [
  { value: 1, label: "1 — Very Low" },
  { value: 2, label: "2 — Low" },
  { value: 3, label: "3 — Medium" },
  { value: 4, label: "4 — High" },
  { value: 5, label: "5 — Very High" },
]

export function CreateTaskModal({ 
  projectId, 
  projectMembers = [], 
  boardSections = [] 
}: CreateTaskModalProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")
  const [description, setDescription] = React.useState("")
  const router = useRouter()
  const { data: session } = useSession()

  // Default assignee to current user if they're a project member
  const currentUserId = session?.user?.id
  const defaultAssignee = projectMembers.find(m => m.id === currentUserId)?.id ?? ""
  
  // Default status to the first board section
  const defaultStatus = boardSections[0]?.name || "BACKLOG"

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
      assigneeId: formData.get("assigneeId") as string || undefined,
      creatorId: currentUserId,
    })

    setLoading(false)
    if (!res.success) {
      setError(res.error || "Failed to create task")
    } else {
      setIsOpen(false)
      setDescription("")
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
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 border border-border bg-card rounded-xl shadow-2xl max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
            <DialogPrimitive.Title className="text-lg font-semibold">Create Task</DialogPrimitive.Title>
            <DialogPrimitive.Close className="rounded-md p-1 hover:bg-secondary transition-colors">
              <X className="w-5 h-5" />
            </DialogPrimitive.Close>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {error && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md border border-destructive/20">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Title <span className="text-destructive">*</span>
                </label>
                <input
                  name="title"
                  required
                  placeholder="e.g. Implement user authentication"
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Description</label>
                <TiptapEditor
                  onChange={setDescription}
                  placeholder="Add more context, steps to reproduce, acceptance criteria..."
                  minHeight="120px"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Status</label>
                  <select 
                    name="status" 
                    defaultValue={defaultStatus}
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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

                <div>
                  <label className="block text-sm font-medium mb-1.5">Complexity</label>
                  <select name="points" className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="">— None —</option>
                    {COMPLEXITY_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Assign To</label>
                <select
                  name="assigneeId"
                  defaultValue={defaultAssignee}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">— Unassigned —</option>
                  {projectMembers.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name ?? m.email ?? m.id}{m.id === currentUserId ? " (you)" : ""}
                    </option>
                  ))}
                </select>
                {projectMembers.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Add members in Project Settings to enable assignment.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
              <DialogPrimitive.Close asChild>
                <button type="button" className="px-4 py-2 rounded-md text-sm font-medium hover:bg-secondary transition-colors">
                  Cancel
                </button>
              </DialogPrimitive.Close>
              <button
                type="submit"
                disabled={loading}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
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
