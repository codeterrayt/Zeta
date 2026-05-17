"use client"

import * as React from "react"
import { 
  Bell, AtSign, UserCheck, FolderPlus, RefreshCw, AlertCircle, 
  CheckSquare, Inbox, Eye 
} from "lucide-react"
import { getNotifications, markNotificationAsViewed, markAllNotificationsAsViewed } from "@/actions/notifications"
import Link from "next/link"
import { ViewAllNotificationsModal } from "./view-all-notifications-modal"

export function NotificationBell() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [notifications, setNotifications] = React.useState<any[]>([])
  const [unreadCount, setUnreadCount] = React.useState(0)
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  
  const containerRef = React.useRef<HTMLDivElement>(null)

  const fetchUnread = React.useCallback(async () => {
    try {
      const res = await getNotifications(1, 10)
      if (res.success) {
        setNotifications(res.notifications || [])
        setUnreadCount(res.unreadCount || 0)
      }
    } catch (err) {
      console.error("fetchUnread error:", err)
    }
  }, [])

  // Poll for notifications every 30 seconds for real-time responsiveness
  React.useEffect(() => {
    fetchUnread()
    const interval = setInterval(fetchUnread, 30000)
    return () => clearInterval(interval)
  }, [fetchUnread])

  // Handle click outside to close dropdown
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      const res = await markNotificationAsViewed(id)
      if (res.success) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isViewed: true } : n))
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (err) {
      console.error("handleMarkAsRead error:", err)
    }
  }

  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      const res = await markAllNotificationsAsViewed()
      if (res.success) {
        setNotifications(prev => prev.map(n => ({ ...n, isViewed: true })))
        setUnreadCount(0)
      }
    } catch (err) {
      console.error("handleMarkAllAsRead error:", err)
    }
  }

  const getSmallIcon = (type: string) => {
    switch (type) {
      case "MENTION":
        return <AtSign className="w-3.5 h-3.5 text-purple-400" />
      case "ASSIGNED":
        return <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
      case "PROJECT_ADDED":
        return <FolderPlus className="w-3.5 h-3.5 text-cyan-400" />
      case "TASK_CHANGED":
        return <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
      case "DUE_SOON":
        return <AlertCircle className="w-3.5 h-3.5 text-rose-400 font-bold" />
      default:
        return <Inbox className="w-3.5 h-3.5 text-primary" />
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 rounded-full hover:bg-secondary text-muted-foreground transition-all duration-300 relative border border-transparent hover:border-border/40"
      >
        <Bell className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'scale-110' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-primary text-[10px] font-black text-primary-foreground ring-4 ring-card animate-pulse shrink-0">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-card/95 border border-border/60 shadow-2xl rounded-3xl overflow-hidden z-[99999] backdrop-blur-xl animate-in fade-in-50 slide-in-from-top-3 duration-200">
          {/* Header */}
          <div className="p-4 border-b border-border/40 flex items-center justify-between bg-secondary/10">
            <h3 className="font-black text-sm bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllAsRead}
                className="text-[10px] font-extrabold text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
              >
                <CheckSquare className="w-3 h-3" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-border/20">
            {notifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center">
                <Inbox className="w-8 h-8 text-muted-foreground opacity-30 mb-2" />
                <p className="text-xs font-bold text-muted-foreground">All caught up!</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">No unread alerts.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div 
                  key={n.id}
                  className={`p-4 transition-all flex items-start gap-3 hover:bg-secondary/40 relative ${
                    n.isViewed ? "opacity-75" : "bg-primary/[0.02]"
                  }`}
                >
                  {!n.isViewed && (
                    <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                  )}
                  
                  {/* Micro Icon */}
                  <div className="mt-0.5 shrink-0">
                    {getSmallIcon(n.type)}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    {n.link ? (
                      <Link 
                        href={n.link} 
                        onClick={() => {
                          markNotificationAsViewed(n.id)
                          setIsOpen(false)
                        }}
                        className="group"
                      >
                        <h4 className="font-extrabold text-xs truncate group-hover:text-primary transition-colors">
                          {n.title}
                        </h4>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 font-semibold leading-relaxed">
                          {n.content}
                        </p>
                      </Link>
                    ) : (
                      <div>
                        <h4 className="font-extrabold text-xs truncate">{n.title}</h4>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 font-semibold leading-relaxed">
                          {n.content}
                        </p>
                      </div>
                    )}
                    <span className="text-[8px] text-muted-foreground font-semibold mt-1">
                      {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Actions */}
                  {!n.isViewed && (
                    <button 
                      onClick={(e) => handleMarkAsRead(n.id, e)}
                      className="p-1 rounded-md bg-secondary/80 border border-border/50 hover:bg-primary hover:text-primary-foreground text-muted-foreground transition-all shrink-0 self-center"
                      title="Mark as read"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-3 border-t border-border/40 bg-secondary/20 flex items-center justify-center">
            <button 
              onClick={() => {
                setIsOpen(false)
                setIsModalOpen(true)
              }}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-primary to-purple-600 text-primary-foreground font-black text-xs rounded-xl shadow-md shadow-primary/10 hover:shadow-primary/20 transition-all hover:brightness-105 active:scale-95"
            >
              <Eye className="w-3.5 h-3.5" />
              View All Notifications
            </button>
          </div>
        </div>
      )}

      {/* Paginated modal */}
      <ViewAllNotificationsModal 
        isOpen={isModalOpen} 
        onOpenChange={setIsModalOpen}
        onRefreshBell={fetchUnread}
      />
    </div>
  )
}
