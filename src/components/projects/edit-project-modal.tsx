"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X, Edit2 } from "lucide-react"
import { updateProject } from "@/actions/project"
import { useRouter } from "next/navigation"

export function EditProjectModal({ project, isAdmin }: { project: any, isAdmin: boolean }) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const name = formData.get("name") as string
    const description = formData.get("description") as string

    const res = await updateProject(project.id, name, description)
    setLoading(false)

    if (res.error) {
      setError(res.error)
    } else {
      setIsOpen(false)
      router.refresh()
    }
  }

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      <DialogPrimitive.Trigger asChild>
        <button 
          onClick={(e) => {
            e.preventDefault() // Prevent the Link wrap from triggering
            if (isAdmin) setIsOpen(true)
          }}
          disabled={!isAdmin}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm pointer-events-auto duration-300 ${
            isAdmin 
              ? "bg-secondary/50 text-muted-foreground hover:bg-primary hover:text-primary-foreground group-hover:scale-110" 
              : "bg-secondary/20 text-muted-foreground/30 cursor-not-allowed"
          }`}
          title={isAdmin ? "Edit Project" : "Only project admin can edit"}
        >
          <Edit2 className="w-5 h-5" />
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content 
          onClick={(e) => e.stopPropagation()} // Stop propagation from dialog
          className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-border/60 bg-card p-8 shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 sm:rounded-3xl"
        >

          <div className="flex items-center justify-between">
            <div>
              <DialogPrimitive.Title className="text-2xl font-black">
                Edit project
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-sm font-medium text-muted-foreground mt-1">
                Update the project's name and description.
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close className="rounded-full bg-secondary/50 p-2 opacity-70 ring-offset-background transition-all hover:opacity-100 hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 mt-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm font-medium p-4 rounded-xl border border-destructive/20">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-black uppercase tracking-widest text-muted-foreground">Project Name <span className="text-destructive">*</span></label>
              <input
                name="name"
                required
                defaultValue={project.name}
                placeholder="e.g. Platform Engineering"
                className="w-full bg-secondary/30 border border-border/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium placeholder:text-muted-foreground/60"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-black uppercase tracking-widest text-muted-foreground">Description</label>
              <textarea
                name="description"
                defaultValue={project.description || ""}
                placeholder="Describe what this project is for..."
                className="w-full bg-secondary/30 border border-border/50 rounded-xl px-4 py-3 text-sm min-h-[120px] resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium placeholder:text-muted-foreground/60"
              />
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-border/40 mt-8">
              <DialogPrimitive.Close asChild>
                <button type="button" className="px-6 py-3 rounded-2xl text-sm font-bold hover:bg-secondary transition-colors">
                  Cancel
                </button>
              </DialogPrimitive.Close>
              <button
                type="submit"
                disabled={loading}
                className="bg-primary text-primary-foreground px-8 py-3 rounded-2xl text-sm font-black hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>

        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
