"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X, Plus, Calendar as CalendarIcon } from "lucide-react"
import { createSprint } from "@/actions/sprint"
import { useRouter } from "next/navigation"

export function CreateSprintModal({ projectId }: { projectId: string }) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")
  
  // Default start date to today's date string (YYYY-MM-DD)
  const today = new Date().toISOString().split("T")[0]
  const [startDate, setStartDate] = React.useState(today)
  const [endDate, setEndDate] = React.useState("")
  const [duration, setDuration] = React.useState("7") // Default to 7 days
  const router = useRouter()

  // Calculate dates whenever duration or start date changes
  React.useEffect(() => {
    if (duration !== "custom") {
      const start = new Date(startDate)
      if (!isNaN(start.getTime())) {
        const end = new Date(start)
        end.setDate(start.getDate() + parseInt(duration))
        setEndDate(end.toISOString().split("T")[0])
      }
    }
  }, [duration, startDate])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const title = formData.get("title") as string

    // Validate dates
    const res = await createSprint({
      projectId,
      title,
      startDate,
      endDate,
    })

    setLoading(false)
    if (!res.success) {
      setError(res.error || "Failed to create sprint")
    } else {
      setIsOpen(false)
      setStartDate(today)
      setEndDate("")
      setDuration("7")
      router.refresh()
    }
  }

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      <DialogPrimitive.Trigger asChild>
        <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create Sprint
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 border border-border bg-card p-6 shadow-xl rounded-xl">
          <div className="flex items-center justify-between mb-6">
            <DialogPrimitive.Title className="text-xl font-bold">New Sprint</DialogPrimitive.Title>
            <DialogPrimitive.Close className="rounded-md p-1 hover:bg-secondary transition-colors">
              <X className="w-5 h-5" />
            </DialogPrimitive.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <p className="text-destructive text-sm bg-destructive/10 p-3 rounded-md border border-destructive/20">{error}</p>}

            <div>
              <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Sprint Title</label>
              <input 
                name="title" 
                required 
                placeholder="e.g. Q3 Performance Sprint" 
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none transition-all" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Duration</label>
              <select 
                value={duration} 
                onChange={e => setDuration(e.target.value)} 
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none cursor-pointer"
              >
                <option value="7">7 Days</option>
                <option value="10">10 Days</option>
                <option value="14">14 Days</option>
                <option value="custom">Custom Duration</option>
              </select>
            </div>

            {duration === "custom" && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Start Date</label>
                  <input 
                    type="date" 
                    value={startDate} 
                    onChange={e => setStartDate(e.target.value)} 
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-muted-foreground">End Date</label>
                  <input 
                    type="date" 
                    value={endDate} 
                    onChange={e => setEndDate(e.target.value)} 
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" 
                  />
                </div>
              </div>
            )}

            {duration !== "custom" && (
              <div className="bg-secondary/20 p-3 rounded-lg border border-border flex items-center gap-3">
                <CalendarIcon className="w-4 h-4 text-primary" />
                <div className="text-sm">
                  <span className="text-muted-foreground">Timeline: </span>
                  <span className="font-semibold">
                    {new Date(startDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                  <span className="mx-2 text-muted-foreground">→</span>
                  <span className="font-semibold">
                    {new Date(endDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
              <DialogPrimitive.Close asChild>
                <button type="button" className="px-4 py-2 rounded-md text-sm font-medium hover:bg-secondary transition-colors">Cancel</button>
              </DialogPrimitive.Close>
              <button 
                type="submit" 
                disabled={loading} 
                className="bg-primary text-primary-foreground px-6 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Sprint"}
              </button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
