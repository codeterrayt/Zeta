"use client"

import { useEffect, useState } from "react"
import { Command } from "cmdk"
import { Search, Folder, PlusCircle, Settings, User } from "lucide-react"
import { useRouter } from "next/navigation"

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const runCommand = (command: () => void) => {
    setOpen(false)
    command()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-start justify-center pt-[20vh]">
      <Command
        className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
        label="Global Command Menu"
        loop
      >
        <div className="flex items-center border-b border-border px-4 py-3">
          <Search className="w-5 h-5 text-muted-foreground mr-3" />
          <Command.Input
            autoFocus
            placeholder="Search tasks, projects, or commands... (in Dev)"
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-lg"
          />
        </div>

        <Command.List className="max-h-[300px] overflow-y-auto p-2">
          <Command.Empty className="py-6 text-center text-muted-foreground">
            No results found.
          </Command.Empty>

          {/* <Command.Group heading="Suggestions" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
            <Command.Item
              onSelect={() => runCommand(() => router.push("/projects/1"))}
              className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md hover:bg-secondary cursor-pointer text-foreground data-[selected=true]:bg-secondary data-[selected=true]:text-primary"
            >
              <Folder className="w-4 h-4 text-primary" />
              Go to Active Sprint
            </Command.Item>
            <Command.Item
              onSelect={() => runCommand(() => console.log("Create task modal"))}
              className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md hover:bg-secondary cursor-pointer text-foreground data-[selected=true]:bg-secondary data-[selected=true]:text-primary"
            >
              <PlusCircle className="w-4 h-4 text-emerald-500" />
              Create New Task
            </Command.Item>
          </Command.Group> */}

          <Command.Separator className="h-px bg-border my-2" />

          <Command.Group heading="Settings" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
            <Command.Item
              onSelect={() => runCommand(() => router.push("/settings"))}
              className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md hover:bg-secondary cursor-pointer text-foreground data-[selected=true]:bg-secondary data-[selected=true]:text-primary"
            >
              <Settings className="w-4 h-4 text-muted-foreground" />
              Application Settings
            </Command.Item>
            <Command.Item
              onSelect={() => runCommand(() => router.push("/profile"))}
              className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md hover:bg-secondary cursor-pointer text-foreground data-[selected=true]:bg-secondary data-[selected=true]:text-primary"
            >
              <User className="w-4 h-4 text-muted-foreground" />
              My Profile
            </Command.Item>
          </Command.Group>
        </Command.List>
      </Command>

      {/* Click outside to close */}
      <div className="fixed inset-0 -z-10" onClick={() => setOpen(false)} />
    </div>
  )
}
