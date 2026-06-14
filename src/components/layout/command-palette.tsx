"use client"

import { useEffect, useState } from "react"
import { Command } from "cmdk"
import { 
  Search, Folder, Settings, User, BookOpen, 
  Activity, ListTodo, Loader2, Users, MessageSquare, Bell, Paperclip 
} from "lucide-react"
import { useRouter } from "next/navigation"
import { globalSearch } from "@/actions/search"
import { createChatGroup } from "@/actions/chat"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface SearchResults {
  projects: any[]
  tasks: any[]
  sprints: any[]
  documents: any[]
  users: any[]
  chatGroups: any[]
  chatMessages: any[]
  storage: any[]
  notifications: any[]
}

const FILTERS = [
  { id: "all", label: "All Results" },
  { id: "projects", label: "Projects" },
  { id: "tasks", label: "Tasks" },
  { id: "sprints", label: "Sprints" },
  { id: "docs", label: "Docs" },
  { id: "people", label: "People" },
  { id: "chats", label: "Chats" },
  { id: "storage", label: "Storage" },
  { id: "notifications", label: "Notifications" }
] as const

type FilterType = typeof FILTERS[number]["id"]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<FilterType>("all")
  const [loading, setLoading] = useState(false)
  const [isMac, setIsMac] = useState(false)
  const [results, setResults] = useState<SearchResults>({
    projects: [],
    tasks: [],
    sprints: [],
    documents: [],
    users: [],
    chatGroups: [],
    chatMessages: [],
    storage: [],
    notifications: []
  })

  const router = useRouter()

  // Detect OS for shortcut wording
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMac(navigator.userAgent.toLowerCase().includes("mac"))
    }
  }, [])

  // Listen to open shortcuts, Esc close, and global events
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
      if (e.key === "Escape") {
        setOpen(false)
        setQuery("")
      }
    }

    const openPalette = () => {
      setOpen(true)
    }

    document.addEventListener("keydown", down)
    window.addEventListener("command-palette:open", openPalette)

    return () => {
      document.removeEventListener("keydown", down)
      window.removeEventListener("command-palette:open", openPalette)
    }
  }, [])

  // Debounced search logic
  useEffect(() => {
    if (!query.trim()) {
      setResults({
        projects: [],
        tasks: [],
        sprints: [],
        documents: [],
        users: [],
        chatGroups: [],
        chatMessages: [],
        storage: [],
        notifications: []
      })
      setLoading(false)
      return
    }

    setLoading(true)
    const timer = setTimeout(async () => {
      const res = await globalSearch(query, filter)
      if (res.success && res.results) {
        setResults(res.results)
      }
      setLoading(false)
    }, 300) // 300ms debounce delay

    return () => clearTimeout(timer)
  }, [query, filter])

  const runCommand = (command: () => void) => {
    setOpen(false)
    setQuery("")
    command()
  }

  const handleStartChat = async (targetUserId: string) => {
    setLoading(true)
    const res = await createChatGroup(null, [targetUserId], false)
    setLoading(false)
    if (res.success && res.group) {
      runCommand(() => {
        router.push(`/chat?chatGroupId=${res.group.id}`)
      })
    } else {
      toast.error(res.error || "Failed to start direct chat")
    }
  }

  const handleAttachmentOpen = (url: string) => {
    runCommand(() => {
      window.open(url, "_blank")
    })
  }

  const stripHtml = (htmlString: string) => {
    return (htmlString || "").replace(/<[^>]*>/g, "")
  }

  const truncateText = (text: string, max: number) => {
    if (text.length <= max) return text
    return text.slice(0, max) + "..."
  }

  const formatSearchDate = (dateVal: string | Date) => {
    const date = new Date(dateVal)
    const month = date.toLocaleString("en-US", { month: "short" })
    const day = date.getDate()
    let hours = date.getHours()
    const minutes = date.getMinutes().toString().padStart(2, "0")
    const ampm = hours >= 12 ? "PM" : "AM"
    hours = hours % 12
    hours = hours ? hours : 12
    return `${month} ${day}, ${hours}:${minutes} ${ampm}`
  }

  if (!open) return null

  const hasResults =
    results.projects.length > 0 ||
    results.tasks.length > 0 ||
    results.sprints.length > 0 ||
    results.documents.length > 0 ||
    results.users.length > 0 ||
    results.chatGroups.length > 0 ||
    results.chatMessages.length > 0 ||
    results.storage.length > 0 ||
    results.notifications.length > 0

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-start justify-center pt-[15vh] p-4">
      {/* Inject styling to hide scrollbars cleanly */}
      <style dangerouslySetInnerHTML={{__html: `
        .no-scrollbar::-webkit-scrollbar {
          display: none !important;
        }
      `}} />

      <Command
        className="w-full max-w-2xl bg-card border border-border/70 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh] transition-all"
        label="Global Search and Commands"
        shouldFilter={false} // Disable cmdk's client-side filtering for server-side dynamic search
      >
        {/* Input Header */}
        <div className="flex items-center border-b border-border/50 px-4 py-3.5 relative">
          <Search className="w-5 h-5 text-muted-foreground mr-3 shrink-0" />
          <Command.Input
            autoFocus
            value={query}
            onValueChange={setQuery}
            placeholder={
              isMac
                ? "Search projects, tasks, sprints, files, chat messages... (Esc to close)"
                : "Search projects, tasks, sprints, files, chat messages... (Esc to close)"
            }
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-base font-medium"
          />
          {loading && (
            <Loader2 className="w-4 h-4 animate-spin text-primary absolute right-4 top-1/2 -translate-y-1/2" />
          )}
        </div>

        {/* Filter Pills wrapping onto multiple rows if they don't fit */}
        <div className="border-b border-border/40 bg-secondary/5 w-full">
          <div className="flex flex-wrap items-center gap-1.5 px-4 py-2.5 select-none">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "px-3.5 py-1 rounded-full text-[11px] font-black border transition-all cursor-pointer whitespace-nowrap",
                  filter === f.id
                    ? "bg-primary border-primary text-primary-foreground shadow-sm"
                    : "bg-secondary/40 border-border/60 hover:bg-secondary/80 text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results List */}
        <Command.List className="overflow-y-auto p-3 custom-scrollbar space-y-4">
          {!query.trim() && (
            <Command.Group heading="Quick Navigation" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2 mb-1">
              <Command.Item
                onSelect={() => runCommand(() => router.push("/"))}
                value="quick-nav-dashboard"
                className="flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl hover:bg-secondary/60 cursor-pointer text-foreground data-[selected=true]:bg-secondary data-[selected=true]:text-primary transition-colors"
              >
                <Activity className="w-4.5 h-4.5 text-primary" />
                Go to Dashboard
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push("/projects"))}
                value="quick-nav-projects"
                className="flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl hover:bg-secondary/60 cursor-pointer text-foreground data-[selected=true]:bg-secondary data-[selected=true]:text-primary transition-colors"
              >
                <Folder className="w-4.5 h-4.5 text-blue-500" />
                Browse Projects
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push("/tasks"))}
                value="quick-nav-tasks"
                className="flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl hover:bg-secondary/60 cursor-pointer text-foreground data-[selected=true]:bg-secondary data-[selected=true]:text-primary transition-colors"
              >
                <ListTodo className="w-4.5 h-4.5 text-purple-500" />
                View My Tasks
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push("/documentation"))}
                value="quick-nav-documentation"
                className="flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl hover:bg-secondary/60 cursor-pointer text-foreground data-[selected=true]:bg-secondary data-[selected=true]:text-primary transition-colors"
              >
                <BookOpen className="w-4.5 h-4.5 text-emerald-500" />
                Zeta Documentation
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push("/settings"))}
                value="quick-nav-settings"
                className="flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl hover:bg-secondary/60 cursor-pointer text-foreground data-[selected=true]:bg-secondary data-[selected=true]:text-primary transition-colors"
              >
                <Settings className="w-4.5 h-4.5 text-muted-foreground" />
                Application Settings
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push("/profile"))}
                value="quick-nav-profile"
                className="flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl hover:bg-secondary/60 cursor-pointer text-foreground data-[selected=true]:bg-secondary data-[selected=true]:text-primary transition-colors"
              >
                <User className="w-4.5 h-4.5 text-muted-foreground" />
                My Profile
              </Command.Item>
            </Command.Group>
          )}

          {query.trim() && !loading && !hasResults && (
            <Command.Empty className="py-12 text-center text-muted-foreground font-medium text-sm">
              No results found for &ldquo;{query}&rdquo; under this filter.
            </Command.Empty>
          )}

          {query.trim() && !loading && hasResults && (
            <>
              {/* Projects */}
              {results.projects.length > 0 && (
                <Command.Group heading="Projects" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2 mb-1">
                  {results.projects.map((project) => (
                    <Command.Item
                      key={project.id}
                      value={`project-${project.id}`.toLowerCase()}
                      onSelect={() => runCommand(() => router.push(`/projects/${project.id}`)) }
                      className="flex items-center justify-between px-4 py-3 text-sm font-bold rounded-xl hover:bg-secondary/60 cursor-pointer text-foreground data-[selected=true]:bg-secondary data-[selected=true]:text-primary transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Folder className="w-4.5 h-4.5 text-blue-500 shrink-0" />
                        <span>{project.name}</span>
                      </div>
                      <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-md text-muted-foreground font-bold tracking-wider">Project</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {/* Tasks */}
              {results.tasks.length > 0 && (
                <Command.Group heading="Tasks" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2 mb-1">
                  {results.tasks.map((task) => (
                    <Command.Item
                      key={task.id}
                      value={`task-${task.id}`.toLowerCase()}
                      onSelect={() => runCommand(() => router.push(`/tasks/${task.id}`)) }
                      className="flex items-center justify-between px-4 py-3 text-sm font-bold rounded-xl hover:bg-secondary/60 cursor-pointer text-foreground data-[selected=true]:bg-secondary data-[selected=true]:text-primary transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <ListTodo className="w-4.5 h-4.5 text-purple-500 shrink-0" />
                        <span className="truncate">{task.title}</span>
                      </div>
                      <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-md text-muted-foreground font-bold tracking-wider shrink-0 ml-4">Task</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {/* Sprints */}
              {results.sprints.length > 0 && (
                <Command.Group heading="Sprints" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2 mb-1">
                  {results.sprints.map((sprint) => (
                    <Command.Item
                      key={sprint.id}
                      value={`sprint-${sprint.id}`.toLowerCase()}
                      onSelect={() => runCommand(() => router.push(`/projects/${sprint.projectId}/sprints/${sprint.id}`)) }
                      className="flex items-center justify-between px-4 py-3 text-sm font-bold rounded-xl hover:bg-secondary/60 cursor-pointer text-foreground data-[selected=true]:bg-secondary data-[selected=true]:text-primary transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Activity className="w-4.5 h-4.5 text-amber-500 shrink-0" />
                        <span>{sprint.name}</span>
                      </div>
                      <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-md text-muted-foreground font-bold tracking-wider">Sprint</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {/* Documents */}
              {results.documents.length > 0 && (
                <Command.Group heading="Documentation" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2 mb-1">
                  {results.documents.map((doc) => (
                    <Command.Item
                      key={doc.id}
                      value={`doc-${doc.id}`.toLowerCase()}
                      onSelect={() => runCommand(() => router.push(`/documentation/${doc.id}`)) }
                      className="flex items-center justify-between px-4 py-3 text-sm font-bold rounded-xl hover:bg-secondary/60 cursor-pointer text-foreground data-[selected=true]:bg-secondary data-[selected=true]:text-primary transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <BookOpen className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
                        <span className="truncate">{doc.title}</span>
                      </div>
                      <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-md text-muted-foreground font-bold tracking-wider shrink-0 ml-4">Doc</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {/* People */}
              {results.users.length > 0 && (
                <Command.Group heading="People" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2 mb-1">
                  {results.users.map((user) => (
                    <Command.Item
                      key={user.id}
                      value={`people-${user.id}`.toLowerCase()}
                      onSelect={() => handleStartChat(user.id)}
                      className="flex items-center justify-between px-4 py-3 text-sm font-bold rounded-xl hover:bg-secondary/60 cursor-pointer text-foreground data-[selected=true]:bg-secondary data-[selected=true]:text-primary transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <User className="w-4.5 h-4.5 text-indigo-500 shrink-0" />
                        <div className="flex flex-col">
                          <span>{user.name || "Unnamed User"}</span>
                          <span className="text-[10px] text-muted-foreground font-medium">{user.email}</span>
                        </div>
                      </div>
                      <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-md text-muted-foreground font-bold tracking-wider">Start Chat</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {/* Chat Groups */}
              {results.chatGroups.length > 0 && (
                <Command.Group heading="Group Chats" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2 mb-1">
                  {results.chatGroups.map((group) => (
                    <Command.Item
                      key={group.id}
                      value={`chat-${group.id}`.toLowerCase()}
                      onSelect={() => runCommand(() => router.push(`/chat?chatGroupId=${group.id}`)) }
                      className="flex items-center justify-between px-4 py-3 text-sm font-bold rounded-xl hover:bg-secondary/60 cursor-pointer text-foreground data-[selected=true]:bg-secondary data-[selected=true]:text-primary transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Users className="w-4.5 h-4.5 text-sky-500 shrink-0" />
                        <span>{group.name}</span>
                      </div>
                      <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-md text-muted-foreground font-bold tracking-wider">Open Group</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {/* Chat Messages */}
              {results.chatMessages.length > 0 && (
                <Command.Group heading="Chat Message History" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2 mb-1">
                  {results.chatMessages.map((msg) => {
                    const chatLabel = msg.chatGroup.isGroup 
                      ? msg.chatGroup.name 
                      : `Direct Chat with ${msg.chatGroup.members[0]?.user?.name || "Member"}`

                    const cleanMsgContent = truncateText(stripHtml(msg.content), 120)

                    return (
                      <Command.Item
                        key={msg.id}
                        value={`message-${msg.id}`.toLowerCase()}
                        onSelect={() => runCommand(() => router.push(`/chat?chatGroupId=${msg.chatGroupId}&messageId=${msg.id}#message-${msg.id}`)) }
                        className="flex items-center justify-between px-4 py-3 text-sm font-bold rounded-xl hover:bg-secondary/60 cursor-pointer text-foreground data-[selected=true]:bg-secondary data-[selected=true]:text-primary transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <MessageSquare className="w-4.5 h-4.5 text-blue-400 shrink-0" />
                          <div className="flex flex-col min-w-0">
                            <span className="truncate text-foreground font-semibold">{cleanMsgContent}</span>
                            <span className="text-[10px] text-muted-foreground font-medium">
                              Sent by {msg.sender.name} in &ldquo;{chatLabel}&rdquo; &bull; {formatSearchDate(msg.createdAt)}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-md text-muted-foreground font-bold tracking-wider shrink-0 ml-4">Message</span>
                      </Command.Item>
                    )
                  })}
                </Command.Group>
              )}

              {/* Storage */}
              {results.storage.length > 0 && (
                <Command.Group heading="Shared Files & Storage" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2 mb-1">
                  {results.storage.map((file) => (
                    <Command.Item
                      key={file.id}
                      value={`storage-${file.id}`.toLowerCase()}
                      onSelect={() => handleAttachmentOpen(file.url)}
                      className="flex items-center justify-between px-4 py-3 text-sm font-bold rounded-xl hover:bg-secondary/60 cursor-pointer text-foreground data-[selected=true]:bg-secondary data-[selected=true]:text-primary transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Paperclip className="w-4.5 h-4.5 text-muted-foreground shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="truncate text-foreground font-semibold">{file.name}</span>
                          <span className="text-[10px] text-muted-foreground font-medium">
                            Type: {file.type.toUpperCase()} &bull; {(file.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-md text-muted-foreground font-bold tracking-wider shrink-0 ml-4 uppercase">
                        Open File
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}

              {/* Notifications */}
              {results.notifications.length > 0 && (
                <Command.Group heading="Notifications" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2 mb-1">
                  {results.notifications.map((notif) => (
                    <Command.Item
                      key={notif.id}
                      value={`notif-${notif.id}`.toLowerCase()}
                      onSelect={() => runCommand(() => {
                        if (notif.link) router.push(notif.link)
                      }) }
                      className="flex items-center justify-between px-4 py-3 text-sm font-bold rounded-xl hover:bg-secondary/60 cursor-pointer text-foreground data-[selected=true]:bg-secondary data-[selected=true]:text-primary transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Bell className={cn("w-4.5 h-4.5 shrink-0", notif.isViewed ? "text-muted-foreground/60" : "text-red-500 animate-pulse")} />
                        <div className="flex flex-col min-w-0">
                          <span className="truncate">{notif.title}</span>
                          <span className="text-[10px] text-muted-foreground font-medium truncate">{notif.content}</span>
                        </div>
                      </div>
                      <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-md text-muted-foreground font-bold tracking-wider shrink-0 ml-4 uppercase">
                        {notif.type}
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
            </>
          )}
        </Command.List>
      </Command>

      {/* Click outside to close */}
      <div className="fixed inset-0 -z-10" onClick={() => {
        setOpen(false)
        setQuery("")
      }} />
    </div>
  )
}
