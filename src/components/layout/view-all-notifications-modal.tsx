"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { 
  X, AtSign, UserCheck, FolderPlus, RefreshCw, AlertCircle, 
  ChevronLeft, ChevronRight, CheckSquare, Inbox, Search, Maximize2 
} from "lucide-react"
import { getNotifications, markNotificationAsViewed, markAllNotificationsAsViewed } from "@/actions/notifications"
import Link from "next/link"

interface ViewAllNotificationsModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onRefreshBell?: () => void
}

export function ViewAllNotificationsModal({ 
  isOpen, 
  onOpenChange,
  onRefreshBell
}: ViewAllNotificationsModalProps) {
  const [notifications, setNotifications] = React.useState<any[]>([])
  const [page, setPage] = React.useState(1)
  const [totalPages, setTotalPages] = React.useState(1)
  const [totalCount, setTotalCount] = React.useState(0)
  const [unreadCount, setUnreadCount] = React.useState(0)
  
  // Custom Filters & Search
  const [activeFilter, setActiveFilter] = React.useState<string>("all")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)

  // Drag to Resize state
  const [size, setSize] = React.useState({ width: 960, height: 680 })
  const [isResizing, setIsResizing] = React.useState(false)
  const resizeStartRef = React.useRef({ x: 0, y: 0, w: 0, h: 0 })

  // Debounce search query to prevent excessive database hits
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setPage(1) // Reset page on search
    }, 350)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const fetchNotifications = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const isUnreadTab = activeFilter === "unread"
      const typeFilter = (activeFilter !== "all" && activeFilter !== "unread") ? activeFilter : undefined
      
      const res = await getNotifications(
        page, 
        6, 
        isUnreadTab, 
        typeFilter, 
        debouncedSearch
      )
      if (res.success) {
        setNotifications(res.notifications || [])
        setTotalPages(res.totalPages || 1)
        setTotalCount(res.total || 0)
        setUnreadCount(res.unreadCount || 0)
      }
    } catch (err) {
      console.error("fetchNotifications error:", err)
    } finally {
      setIsLoading(false)
    }
  }, [page, activeFilter, debouncedSearch])

  React.useEffect(() => {
    if (isOpen) {
      fetchNotifications()
    }
  }, [isOpen, page, activeFilter, debouncedSearch, fetchNotifications])

  // Reset page when filter changes
  React.useEffect(() => {
    setPage(1)
  }, [activeFilter])

  // Mouse drag-to-resize handlers
  const startResize = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      w: size.width,
      h: size.height
    }
  }

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      const dx = e.clientX - resizeStartRef.current.x
      const dy = e.clientY - resizeStartRef.current.y
      
      const newWidth = Math.max(640, Math.min(window.innerWidth - 40, resizeStartRef.current.w + dx))
      const newHeight = Math.max(500, Math.min(window.innerHeight - 40, resizeStartRef.current.h + dy))
      
      setSize({ width: newWidth, height: newHeight })
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isResizing])

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await markNotificationAsViewed(id)
      if (res.success) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isViewed: true } : n))
        setUnreadCount(prev => Math.max(0, prev - 1))
        if (onRefreshBell) onRefreshBell()
        
        if (activeFilter === "unread") {
          fetchNotifications()
        }
      }
    } catch (err) {
      console.error("handleMarkAsRead error:", err)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      const res = await markAllNotificationsAsViewed()
      if (res.success) {
        setNotifications(prev => prev.map(n => ({ ...n, isViewed: true })))
        setUnreadCount(0)
        if (onRefreshBell) onRefreshBell()
        
        if (activeFilter === "unread") {
          fetchNotifications()
        }
      }
    } catch (err) {
      console.error("handleMarkAllAsRead error:", err)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "MENTION":
        return (
          <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 shadow-sm">
            <AtSign className="w-5 h-5" />
          </div>
        )
      case "ASSIGNED":
        return (
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 shadow-sm">
            <UserCheck className="w-5 h-5" />
          </div>
        )
      case "PROJECT_ADDED":
        return (
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 shadow-sm">
            <FolderPlus className="w-5 h-5" />
          </div>
        )
      case "TASK_CHANGED":
        return (
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 shadow-sm">
            <RefreshCw className="w-5 h-5" />
          </div>
        )
      case "DUE_SOON":
        return (
          <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 shadow-sm animate-pulse">
            <AlertCircle className="w-5 h-5 font-bold" />
          </div>
        )
      default:
        return (
          <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 shadow-sm">
            <Inbox className="w-5 h-5" />
          </div>
        )
    }
  }

  const filters = [
    { id: "all", label: "All Alerts" },
    { id: "unread", label: "Unread Only" },
    { id: "MENTION", label: "@ Mentions" },
    { id: "ASSIGNED", label: "Assignments" },
    { id: "TASK_CHANGED", label: "Task Updates" },
    { id: "PROJECT_ADDED", label: "Projects" },
    { id: "DUE_SOON", label: "Due Soon" }
  ]

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/* Maximum layer z-index overlays to float above everything else */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-[999998] bg-background/80 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content 
          className="fixed left-[50%] top-[50%] z-[999999] translate-x-[-50%] translate-y-[-50%] border border-border/60 bg-card/95 shadow-2xl duration-300 animate-in zoom-in-95 rounded-[2.5rem] overflow-hidden backdrop-blur-xl flex flex-col"
          style={{ 
            width: `${size.width}px`, 
            height: `${size.height}px`,
            maxWidth: "96vw",
            maxHeight: "96vh"
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border/40 shrink-0">
            <div className="flex flex-col">
              <DialogPrimitive.Title className="text-2xl font-black bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent flex items-center gap-2">
                Notifications Hub
                {unreadCount > 0 && (
                  <span className="text-[10px] bg-primary text-primary-foreground font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                    {unreadCount} Unread
                  </span>
                )}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-xs font-semibold text-muted-foreground mt-0.5">
                Manage, filter, search, and navigate through all activities
              </DialogPrimitive.Description>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Sizing Indicator info tooltip */}
              <div className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground bg-secondary/40 border border-border/40 px-3 py-1 rounded-xl">
                <Maximize2 className="w-3 h-3 text-primary" />
                <span>Resizable Modal (drag bottom-right corner)</span>
              </div>
              <DialogPrimitive.Close className="rounded-full bg-secondary/50 p-2.5 opacity-70 hover:opacity-100 hover:bg-secondary focus:outline-none transition-all">
                <X className="w-4 h-4" />
              </DialogPrimitive.Close>
            </div>
          </div>

          {/* Sub-header Controls: Search & Mark All */}
          <div className="px-6 py-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-secondary/20 border-b border-border/30 shrink-0">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by keywords, details or titles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-card border border-border/60 rounded-xl pl-10 pr-4 py-2 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-primary focus:bg-background transition-all"
              />
            </div>

            {/* Quick Actions */}
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 font-black text-xs rounded-xl shadow-md shadow-primary/10 transition-all shrink-0 hover:shadow-primary/20 hover:brightness-105 active:scale-95"
              >
                <CheckSquare className="w-4 h-4" />
                Mark all as read
              </button>
            )}
          </div>

          {/* Filters Sidebar + Content Area */}
          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* Left Filter Sidebar */}
            <div className="w-48 border-r border-border/40 bg-secondary/5 p-4 flex flex-col gap-1.5 overflow-y-auto shrink-0 select-none hidden sm:flex">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest px-2 mb-1">
                Filter Category
              </span>
              {filters.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className={`w-full text-left px-3 py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-between group ${
                    activeFilter === f.id
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/10"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  }`}
                >
                  <span>{f.label}</span>
                  {f.id === "unread" && unreadCount > 0 && (
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${
                      activeFilter === f.id ? "bg-card text-primary" : "bg-primary text-primary-foreground"
                    }`}>
                      {unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Filter Pills for Mobile Screens */}
            <div className="sm:hidden flex gap-1.5 overflow-x-auto p-4 border-b border-border/30 bg-secondary/5 shrink-0 whitespace-nowrap scrollbar-none">
              {filters.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id)}
                  className={`px-3.5 py-1.5 text-[10px] font-black rounded-full transition-all ${
                    activeFilter === f.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.label} {f.id === "unread" && unreadCount > 0 ? `(${unreadCount})` : ""}
                </button>
              ))}
            </div>

            {/* Main Notifications Scroll Container */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[250px] gap-3">
                  <div className="w-8 h-8 rounded-full border-[3px] border-primary border-t-transparent animate-spin" />
                  <span className="text-xs text-muted-foreground font-semibold">Loading notifications...</span>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[250px] text-center p-8">
                  <div className="w-16 h-16 rounded-3xl bg-secondary/50 flex items-center justify-center text-muted-foreground mb-4">
                    <Inbox className="w-8 h-8 opacity-40" />
                  </div>
                  <h3 className="font-black text-lg">No alerts found</h3>
                  <p className="text-xs text-muted-foreground font-medium mt-1 max-w-sm">
                    {debouncedSearch 
                      ? `No search results matching "${debouncedSearch}" in this category.` 
                      : "No active alerts or updates fit the selected filter."}
                  </p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-4 p-4 rounded-3xl transition-all border border-border/30 hover:border-border/60 shadow-sm ${
                      n.isViewed
                        ? "bg-card/40 opacity-80"
                        : "bg-secondary/40 relative overflow-hidden"
                    }`}
                  >
                    {!n.isViewed && (
                      <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-primary to-purple-500" />
                    )}

                    {getNotificationIcon(n.type)}

                    <div className="flex-1 min-w-0 flex flex-col sm:flex-row items-stretch sm:items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {n.link ? (
                          <Link
                            href={n.link}
                            onClick={() => {
                              handleMarkAsRead(n.id)
                              onOpenChange(false)
                            }}
                            className="group block"
                          >
                            <h4 className="font-black text-sm truncate group-hover:text-primary transition-colors flex items-center gap-1.5">
                              {n.title}
                              <span className="text-[10px] text-primary font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                (Click to View)
                              </span>
                            </h4>
                            <p className="text-xs text-muted-foreground font-semibold mt-1 leading-relaxed">
                              {n.content}
                            </p>
                          </Link>
                        ) : (
                          <div>
                            <h4 className="font-black text-sm truncate">{n.title}</h4>
                            <p className="text-xs text-muted-foreground font-semibold mt-1 leading-relaxed">
                              {n.content}
                            </p>
                          </div>
                        )}
                        <span className="text-[9px] text-muted-foreground font-bold mt-2 inline-block">
                          {new Date(n.createdAt).toLocaleString()}
                        </span>
                      </div>

                      {/* Item Actions */}
                      {!n.isViewed && (
                        <button
                          onClick={() => handleMarkAsRead(n.id)}
                          className="self-end sm:self-center p-2 rounded-2xl bg-card hover:bg-primary hover:text-primary-foreground border border-border/50 text-muted-foreground transition-all flex items-center justify-center shrink-0 shadow-sm"
                          title="Mark as read"
                        >
                          <CheckSquare className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Footer Controls: Pagination + Sizing handle */}
          <div className="p-6 border-t border-border/40 bg-secondary/10 shrink-0 flex items-center justify-between relative select-none">
            <span className="text-xs font-bold text-muted-foreground">
              {totalPages > 1 
                ? `Showing page ${page} of ${totalPages} (${totalCount} total results)` 
                : `${totalCount} alert${totalCount === 1 ? "" : "s"} found`
              }
            </span>
            
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-xl bg-card border border-border/60 hover:bg-secondary disabled:opacity-50 disabled:pointer-events-none transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-black px-2">{page}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-xl bg-card border border-border/60 hover:bg-secondary disabled:opacity-50 disabled:pointer-events-none transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Resize Drag Handle */}
            <div 
              onMouseDown={startResize}
              className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize flex items-end justify-end p-0.5 text-muted-foreground hover:text-primary transition-colors"
              title="Drag to resize modal"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" className="rotate-90">
                <path d="M1.5 10.5L10.5 1.5M4.5 10.5L10.5 4.5M7.5 10.5L10.5 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
