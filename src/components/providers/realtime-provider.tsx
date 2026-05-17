"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { useParams, useRouter, usePathname } from "next/navigation"
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

  const [socket, setSocket] = React.useState<Socket | null>(null)
  const [activeCursors, setActiveCursors] = React.useState<any[]>([])
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true)

  // Track room parameters dynamically from url
  const projectId = params?.projectId as string
  const sprintId = params?.sprintId as string
  const docId = params?.docId as string
  const taskId = params?.taskId as string

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

      if (notificationsEnabled) {
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
      router.refresh()
    })

    socketClient.on("comment_deleted", (data) => {
      window.dispatchEvent(new CustomEvent("comment:refresh", { detail: data }))
      router.refresh()
    })

    socketClient.on("sprint_comment_created", (comment) => {
      window.dispatchEvent(new CustomEvent("sprint_comment:refresh", { detail: comment }))
      router.refresh()
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

    socketClient.on("removed_from_project", ({ projectId: targetProjId }) => {
      if (projectId === targetProjId) {
        toast.error("Your access to this project has been revoked.")
        router.push("/")
      } else {
        router.refresh()
      }
    })

    socketClient.on("project_deleted", ({ projectId: targetProjId }) => {
      if (projectId === targetProjId) {
        toast.error("This project has been deleted by an administrator.")
        router.push("/")
      } else {
        router.refresh()
      }
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

    setSocket(socketClient)

    return () => {
      socketClient.disconnect()
    }
  }, [session])

  // Coordinate Dynamic Room joins/leaves on route parameters changing
  React.useEffect(() => {
    if (!socket) return

    // Dynamic Project Room join
    if (projectId) {
      socket.emit("join_project", projectId)
    }

    // Dynamic Sprint Room join
    if (sprintId) {
      socket.emit("join_sprint", sprintId)
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
      // Dynamic Document Room leave
      if (docId) {
        socket.emit("leave_doc", { docId })
      }
    }
  }, [socket, projectId, sprintId, docId])

  // Renders the high-end canvas-style floating cursor overlay
  const renderCollaborativeCursors = () => {
    // Only display cursors if we are currently viewing the kanban board container
    if (!pathname.includes("/projects/") || pathname.includes("/documentation") || pathname.includes("/settings")) {
      return null
    }

    return (
      <div className="absolute inset-0 pointer-events-none z-[9999] overflow-hidden">
        {activeCursors.map((cursor) => {
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
              className="absolute transition-all duration-75 ease-out animate-in fade-in zoom-in duration-300"
              style={{
                left: `${cursor.x}px`,
                top: `${cursor.y}px`,
              }}
            >
              {/* Sleek dynamic cursor arrow */}
              <svg
                className="w-5 h-5 drop-shadow-md text-primary"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M4.5 3V17.5L9.3 12.7L15.3 21L18.5 18.7L12.5 10.5L18.5 10.5L4.5 3Z" />
              </svg>

              {/* Dynamic user label */}
              <div
                className={`ml-3 mt-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg ${cursorColor}`}
              >
                {cursor.userName || "Team Member"}
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
