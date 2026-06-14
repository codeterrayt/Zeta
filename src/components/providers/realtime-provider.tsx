"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { useParams, useRouter, usePathname, useSearchParams } from "next/navigation"
import { io, Socket } from "socket.io-client"
import { toast } from "sonner"
import { getUserSettings } from "@/actions/settings"

type RealtimeContextType = {
  socket: Socket | null
  activeCursors: any[]
}

const RealtimeContext = React.createContext<RealtimeContextType>({
  socket: null,
  activeCursors: [],
})

export const useRealtime = () => React.useContext(RealtimeContext)

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [socket, setSocket] = React.useState<Socket | null>(null)
  const [activeCursors, setActiveCursors] = React.useState<any[]>([])
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true)

  const notificationsEnabledRef = React.useRef(notificationsEnabled)
  React.useEffect(() => {
    notificationsEnabledRef.current = notificationsEnabled
  }, [notificationsEnabled])

  // Track room parameters dynamically from url
  const projectId = params?.projectId as string
  const sprintId = params?.sprintId as string
  const docId = params?.docId as string
  const taskId = searchParams?.get("taskId") as string

  // Fetch settings to respect user-specific popup preferences
  React.useEffect(() => {
    if (session?.user?.id) {
      getUserSettings().then((res) => {
        if (res.success && res.settings) {
          setNotificationsEnabled(res.settings.notificationsEnabled ?? true)
        }
      })
    }
  }, [session])

  // Listen to Settings updates globally
  React.useEffect(() => {
    const handleSettingsUpdate = () => {
      getUserSettings().then((res) => {
        if (res.success && res.settings) {
          setNotificationsEnabled(res.settings.notificationsEnabled ?? true)
        }
      })
    }
    window.addEventListener("settings:updated", handleSettingsUpdate)
    return () => window.removeEventListener("settings:updated", handleSettingsUpdate)
  }, [])

  // Establish Socket.io connection on session mount
  React.useEffect(() => {
    if (!session?.user?.id) {
      if (socket) {
        socket.disconnect()
        setSocket(null)
      }
      return
    }

    const socketUrl = window.location.origin
    const socketClient = io(socketUrl, {
      transports: ["websocket", "polling"],
      autoConnect: true,
    })

    socketClient.on("connect", () => {
      console.log("⚡ Real-time workspace connected.")
      socketClient.emit("join_user", session.user.id)

      // Join rooms if parameters already exist on load
      if (projectId) socketClient.emit("join_project", projectId)
      if (sprintId) socketClient.emit("join_sprint", sprintId)
      if (taskId) socketClient.emit("join_task", taskId)
      if (docId) {
        socketClient.emit("join_doc", {
          docId,
          user: {
            id: session.user.id,
            name: session.user.name,
            image: session.user.image,
          },
        })
      }
    })

    // 1. Live Notification received
    socketClient.on("notification_received", (notif) => {
      // Trigger notifications counts reload event globally
      window.dispatchEvent(new CustomEvent("notification:refresh"))

      if (notificationsEnabledRef.current) {
        toast(notif.title, {
          description: notif.content,
          action: notif.link
            ? {
                label: "View",
                onClick: () => router.push(notif.link),
              }
            : undefined,
        })
      }
    })

    // 2. Live Task triggers
    socketClient.on("task_created", (task) => {
      window.dispatchEvent(new CustomEvent("task:created", { detail: task }))
      router.refresh()
    })

    socketClient.on("task_updated", (task) => {
      window.dispatchEvent(new CustomEvent(`task:updated:${task.id}`, { detail: task }))
      window.dispatchEvent(new CustomEvent("task:updated", { detail: task }))
      router.refresh()
    })

    socketClient.on("task_deleted", (data) => {
      window.dispatchEvent(new CustomEvent(`task:deleted:${data.id}`))
      window.dispatchEvent(new CustomEvent("task:deleted", { detail: data }))
      router.refresh()
    })

    // 3. Live Sprints triggers
    socketClient.on("sprint_created", (sprint) => {
      window.dispatchEvent(new CustomEvent("sprint:created", { detail: sprint }))
      router.refresh()
    })

    socketClient.on("sprint_updated", (sprint) => {
      window.dispatchEvent(new CustomEvent("sprint:updated", { detail: sprint }))
      router.refresh()
    })

    socketClient.on("sprint_deleted", (data) => {
      window.dispatchEvent(new CustomEvent("sprint:deleted", { detail: data }))
      router.refresh()
    })

    // 4. Live Comments & Replies
    socketClient.on("comment_created", (comment) => {
      window.dispatchEvent(new CustomEvent("comment:refresh", { detail: comment }))
    })

    socketClient.on("comment_deleted", (data) => {
      window.dispatchEvent(new CustomEvent("comment:refresh", { detail: data }))
    })

    socketClient.on("sprint_comment_created", (comment) => {
      window.dispatchEvent(new CustomEvent("sprint_comment:refresh", { detail: comment }))
    })

    // 5. Live Attachments triggers
    socketClient.on("attachment_created", (attachment) => {
      window.dispatchEvent(new CustomEvent("attachment:refresh", { detail: attachment }))
      router.refresh()
    })

    socketClient.on("attachment_deleted", (data) => {
      window.dispatchEvent(new CustomEvent("attachment:refresh", { detail: data }))
      router.refresh()
    })

    // 6. Live Project Member additions/deletions (revoked access kicks)
    socketClient.on("added_to_project", ({ projectId: targetProjId }) => {
      toast.success("You were added to a new project workspace!")
      router.refresh()
    })

    socketClient.on("removed_from_project", ({ projectId: targetProjId, projectName }) => {
      const currentPathProjectMatch = window.location.pathname.match(/^\/projects\/([^\/]+)/)
      const activeProjId = currentPathProjectMatch ? currentPathProjectMatch[1] : null

      if (activeProjId === targetProjId) {
        toast.error(`Your access to "${projectName || 'the project'}" has been revoked.`)
        router.push("/projects?modalAlert=removed")
      } else {
        router.refresh()
      }
    })

    socketClient.on("project_deleted", ({ projectId: targetProjId, projectName }) => {
      if (typeof window !== "undefined" && (window as any).__deletingProject === targetProjId) {
        return
      }

      const currentPathProjectMatch = window.location.pathname.match(/^\/projects\/([^\/]+)/)
      const activeProjId = currentPathProjectMatch ? currentPathProjectMatch[1] : null

      if (activeProjId === targetProjId) {
        toast.error(`The project "${projectName || 'the project'}" was deleted by an administrator.`)
        router.push(`/projects?modalAlert=deleted&projectName=${encodeURIComponent(projectName || 'the project')}`)
      } else {
        router.refresh()
      }
    })

    socketClient.on("document_created", (doc) => {
      const currentUserId = session?.user?.id
      if (!currentUserId) return

      const isAuthor = doc.authorId === currentUserId
      const isMentioned = doc.content?.includes(`data-id="${currentUserId}"`)
      const isAssignee = doc.assigneeIds?.includes(currentUserId)

      if (isAuthor || isMentioned || isAssignee) {
        window.dispatchEvent(new CustomEvent("document:created", { detail: doc }))
        toast.info(`New document "${doc.title || 'Untitled'}" was created!`)
        router.refresh()
      }
    })

    socketClient.on("document_updated", (doc) => {
      const currentUserId = session?.user?.id
      if (!currentUserId) return

      const isAuthor = doc.authorId === currentUserId
      const isMentioned = doc.content?.includes(`data-id="${currentUserId}"`)
      const isAssignee = doc.assigneeIds?.includes(currentUserId)

      window.dispatchEvent(new CustomEvent(`document:updated:${doc.id}`, { detail: doc }))
      window.dispatchEvent(new CustomEvent("document:updated", { detail: doc }))

      if (isAuthor || isMentioned || isAssignee) {
        toast.info(`Document "${doc.title || 'Untitled'}" was updated.`)
        router.refresh()
      }
    })

    socketClient.on("document_deleted", (data) => {
      window.dispatchEvent(new CustomEvent(`document:deleted:${data.id}`))
      window.dispatchEvent(new CustomEvent("document:deleted", { detail: data }))
      toast.error("A document was deleted.") 
      router.refresh()
    })

    socketClient.on("project_updated", (project) => {
      window.dispatchEvent(new CustomEvent("project:updated", { detail: project }))
      router.refresh()
    })

    // 7. Collaborative document readers list
    socketClient.on("readers_updated", (viewers) => {
      window.dispatchEvent(new CustomEvent("readers:updated", { detail: viewers }))
    })

    // 8. Collaborative cursors
    socketClient.on("drag_cursor_updated", (data) => {
      setActiveCursors((prev) => {
        const filtered = prev.filter((c) => c.userId !== data.userId)
        return [...filtered, data]
      })
    })

    socketClient.on("drag_cursor_ended", (data) => {
      setActiveCursors((prev) => prev.filter((c) => c.userId !== data.userId))
    })

    socketClient.on("task_assignment_changed", (data) => {
      window.dispatchEvent(new CustomEvent("task_assignment:changed", { detail: data }))
      router.refresh()
    })

    socketClient.on("timeline_updated", (data) => {
      window.dispatchEvent(new CustomEvent("timeline:updated", { detail: data }))
    })

    socketClient.on("timeline_log_created", (log) => {
      window.dispatchEvent(new CustomEvent("timeline:log_created", { detail: log }))
    })

    socketClient.on("timeline_comment_created", (comment) => {
      window.dispatchEvent(new CustomEvent("timeline:comment_created", { detail: comment }))
    })

    socketClient.on("timeline_comment_deleted", (data) => {
      window.dispatchEvent(new CustomEvent("timeline:comment_deleted", { detail: data }))
    })

    setSocket(socketClient)

    return () => {
      socketClient.disconnect()
    }
  }, [session])

  // Coordinate Dynamic Room joins/leaves on route parameters changing
  React.useEffect(() => {
    if (!socket) return

    // Dynamic Board Room isolation join
    const boardRoom = projectId ? (sprintId ? `project:${projectId}:sprint:${sprintId}` : `project:${projectId}:backlog`) : null;
    if (boardRoom) {
      socket.emit("join_board", boardRoom)
    }

    // Dynamic Project Room join
    if (projectId) {
      socket.emit("join_project", projectId)
    }

    // Dynamic Sprint Room join
    if (sprintId) {
      socket.emit("join_sprint", sprintId)
    }

    // Dynamic Task Room join
    if (taskId) {
      socket.emit("join_task", taskId)
    }

    // Dynamic Document Room join
    if (docId && session?.user?.id) {
      socket.emit("join_doc", {
        docId,
        user: {
          id: session.user.id,
          name: session.user.name,
          image: session.user.image,
        },
      })
    }

    return () => {
      if (boardRoom) {
        socket.emit("leave_board", boardRoom)
      }
      if (taskId) {
        socket.emit("leave_task", taskId)
      }
      if (docId) {
        socket.emit("leave_doc", { docId })
      }
    }
  }, [socket, projectId, sprintId, docId, taskId, session])

  // Renders the high-end canvas-style floating cursor overlay
  const renderCollaborativeCursors = () => {
    // Only display cursors if we are currently viewing the kanban board container
    if (!pathname.includes("/projects/") || pathname.includes("/documentation") || pathname.includes("/settings")) {
      return null
    }

    return (
      <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
        {activeCursors.map((cursor) => {
          // Double-check project + sprint matching to guarantee perfect isolation
          const cursorProj = cursor.projectId
          const cursorSprint = cursor.sprintId ?? undefined
          const currentSprint = sprintId ?? undefined
          if (cursorProj !== projectId || cursorSprint !== currentSprint) {
            return null
          }

          // Unique color tag based on userId hash
          const colors = [
            "bg-red-500 text-white",
            "bg-blue-500 text-white",
            "bg-green-500 text-white",
            "bg-yellow-500 text-black",
            "bg-purple-500 text-white",
            "bg-pink-500 text-white",
            "bg-indigo-500 text-white",
          ]
          const colorIndex = cursor.userId.charCodeAt(0) % colors.length
          const cursorColor = colors[colorIndex]

          return (
            <div
              key={cursor.userId}
              className="fixed transition-all duration-75 ease-out animate-in fade-in zoom-in duration-300 flex items-start"
              style={{
                left: `${cursor.x}px`,
                top: `${cursor.y}px`,
              }}
            >
              {/* Sleek dynamic cursor arrow */}
              <svg
                className="w-5 h-5 drop-shadow-md text-primary shrink-0"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M4.5 3V17.5L9.3 12.7L15.3 21L18.5 18.7L12.5 10.5L18.5 10.5L4.5 3Z" />
              </svg>

              {/* Dynamic user label + ghost card ticket badge */}
              <div className="flex flex-col gap-1 items-start ml-2">
                <div
                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg ${cursorColor}`}
                >
                  {cursor.userName || "Team Member"}
                </div>
                {cursor.taskTitle && (
                  <div className="bg-popover/95 backdrop-blur border border-border/70 px-2 py-1 rounded-xl text-[10px] font-bold text-foreground max-w-[150px] truncate shadow-2xl scale-95 origin-top-left flex items-center gap-1.5 animate-in fade-in duration-300 ring-1 ring-primary/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                    <span>Holding: {cursor.taskTitle}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <RealtimeContext.Provider value={{ socket, activeCursors }}>
      {children}
      {renderCollaborativeCursors()}
    </RealtimeContext.Provider>
  )
}
