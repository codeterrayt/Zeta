"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { useRealtime } from "@/components/providers/realtime-provider"
import { getChatGroups } from "@/actions/chat"
import { ChatWindow } from "./chat-window"
import { 
  MessageSquare, X, Minus, Maximize2, Users, Search, 
  MessageCircle, GripHorizontal, Circle, Sparkles, VolumeX,
  ChevronLeft
} from "lucide-react"
import { cn } from "@/lib/utils"

export function FloatingChat() {
  const { data: session } = useSession()
  const currentUserId = session?.user?.id
  const { socket } = useRealtime()

  // Window visibility states
  const [isVisible, setIsVisible] = React.useState(true)
  const [isMinimized, setIsMinimized] = React.useState(true) // Collapsed to bubble by default
  const [activeGroupId, setActiveGroupId] = React.useState<string | null>(null)
  
  // Chat list state
  const [chatGroups, setChatGroups] = React.useState<any[]>([])
  const [searchQuery, setSearchQuery] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  // Dragging position offsets
  const [position, setPosition] = React.useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = React.useState(false)
  const dragStartRef = React.useRef({ x: 0, y: 0 })
  const dragStartPosRef = React.useRef({ x: 0, y: 0 })
  const widgetRef = React.useRef<HTMLDivElement>(null)
  const hasDraggedRef = React.useRef(false)

  // Load chats
  const loadGroups = React.useCallback(async () => {
    if (!currentUserId) return
    setLoading(true)
    const res = await getChatGroups()
    if (res.success && res.groups) {
      setChatGroups(res.groups)
    }
    setLoading(false)
  }, [currentUserId])

  React.useEffect(() => {
    if (currentUserId) {
      loadGroups()
    }
  }, [currentUserId, loadGroups])

  // Listen to toggle events from Header
  React.useEffect(() => {
    const handleToggle = () => {
      setIsVisible(prevVisible => {
        if (!prevVisible) {
          setIsMinimized(false)
          return true
        }
        if (isMinimized) {
          setIsMinimized(false)
          return true
        }
        return false
      })
    }
    window.addEventListener("floating-chat:toggle", handleToggle)
    return () => window.removeEventListener("floating-chat:toggle", handleToggle)
  }, [isMinimized])

  // Listen to real-time events to refresh list
  React.useEffect(() => {
    if (!socket || !currentUserId) return

    const handleMessageReceived = () => {
      loadGroups()
    }

    const handleGroupUpdated = () => {
      loadGroups()
    }

    const handleGroupRemoved = (data: any) => {
      loadGroups()
      if (activeGroupId === data.chatGroupId) {
        setActiveGroupId(null)
      }
    }

    socket.on("chat_message_received", handleMessageReceived)
    socket.on("chat_group_updated_global", handleGroupUpdated)
    socket.on("chat_group_removed_global", handleGroupRemoved)

    return () => {
      socket.off("chat_message_received", handleMessageReceived)
      socket.off("chat_group_updated_global", handleGroupUpdated)
      socket.off("chat_group_removed_global", handleGroupRemoved)
    }
  }, [socket, currentUserId, activeGroupId, loadGroups])

  React.useEffect(() => {
    const handleChatRead = (e: Event) => {
      const { chatGroupId } = (e as CustomEvent).detail
      setChatGroups(prev => prev.map(g => g.id === chatGroupId ? { ...g, unreadCount: 0 } : g))
    }
    window.addEventListener("chat:read", handleChatRead)
    return () => window.removeEventListener("chat:read", handleChatRead)
  }, [])

  // Pointer drag event handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement
    hasDraggedRef.current = false // Reset drag indicator
    dragStartPosRef.current = { x: e.clientX, y: e.clientY }
    
    // When minimized, allow dragging the entire collapsed button container
    if (isMinimized) {
      if (target.closest(".close-bubble-btn")) {
        return
      }
      // Do not preventDefault here to allow click/focus events to fire on pointerup
      setIsDragging(true)
      dragStartRef.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y
      }
      if (widgetRef.current) {
        widgetRef.current.setPointerCapture(e.pointerId)
      }
      return
    }

    // Do not drag if clicking interactive elements when expanded
    if (target.closest("button") || target.closest("input") || target.closest("a")) {
      return
    }

    // Only allow dragging from header/grip elements
    if (target.closest(".drag-handle") || target.closest(".drag-grip")) {
      e.preventDefault()
      setIsDragging(true)
      dragStartRef.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y
      }
      if (widgetRef.current) {
        widgetRef.current.setPointerCapture(e.pointerId)
      }
    }
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    const nextX = e.clientX - dragStartRef.current.x
    const nextY = e.clientY - dragStartRef.current.y
    
    // Calculate total distance from starting pointer down location
    const totalDist = Math.sqrt(
      Math.pow(e.clientX - dragStartPosRef.current.x, 2) +
      Math.pow(e.clientY - dragStartPosRef.current.y, 2)
    )
    if (totalDist > 8) {
      hasDraggedRef.current = true
    }
    
    setPosition({ x: nextX, y: nextY })
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false)
      if (widgetRef.current) {
        widgetRef.current.releasePointerCapture(e.pointerId)
      }

      // If minimized and we didn't drag, treat it as a click to expand
      if (isMinimized && !hasDraggedRef.current) {
        const target = e.target as HTMLElement
        if (!target.closest(".close-bubble-btn")) {
          setIsMinimized(false)
          loadGroups()
        }
      }
    }
  }

  // Calculate total unread badge count
  const unreadCount = React.useMemo(() => {
    return chatGroups.reduce((acc, g) => acc + (g.unreadCount || 0), 0)
  }, [chatGroups])

  const getChatPartnerName = (group: any) => {
    if (group.isGroup) return group.name || "Group Chat"
    const partner = group.members.find((m: any) => m.userId !== currentUserId)
    return partner?.user?.name || partner?.user?.email || "Direct Chat"
  }

  const getFilteredGroups = () => {
    return chatGroups.filter(g => 
      getChatPartnerName(g).toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  if (!currentUserId || !isVisible) return null

  return (
    <div 
      ref={widgetRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`
      }}
      className={cn(
        "fixed z-[40] bottom-6 right-6 transition-all duration-300",
        !isMinimized ? (isDragging ? "shadow-2xl scale-[1.01]" : "shadow-xl") : (isDragging ? "scale-[1.05]" : "")
      )}
    >
      {isMinimized ? (
        /* Collapsed Chat Bubble */
        <div className="relative group/bubble select-none">
          <button
            onClick={() => {
              if (hasDraggedRef.current) return
              setIsMinimized(false)
              loadGroups()
            }}
            className="w-14 h-14 rounded-full bg-primary hover:bg-primary/95 text-primary-foreground flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-lg border border-white/20 touch-none"
          >
            <MessageCircle className="w-6 h-6 animate-pulse" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-background ring-1 ring-destructive/20">
                {unreadCount}
              </span>
            )}
          </button>
          
          {/* Close hover button */}
          <button 
            onClick={(e) => {
              e.stopPropagation()
              setIsVisible(false)
            }}
            className="close-bubble-btn absolute -top-1 -left-1 bg-muted text-muted-foreground p-1 rounded-full border border-border opacity-0 group-hover/bubble:opacity-100 transition-opacity hover:bg-destructive hover:text-white z-10"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </div>
      ) : (
        /* Expanded Active Chat Card */
        <div 
          style={{ resize: "both" }}
          className="w-80 h-[450px] min-w-[280px] min-h-[350px] max-w-[600px] max-h-[800px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        >
          
          {/* Header/Drag handle */}
          <div className="drag-handle touch-none select-none h-12 border-b border-border bg-secondary/20 flex items-center justify-between px-3 cursor-grab active:cursor-grabbing shrink-0 flex-row">
            <div className="flex items-center gap-1.5 min-w-0">
              <GripHorizontal className="drag-grip w-4 h-4 text-muted-foreground shrink-0" />
              <span className="font-black text-xs truncate max-w-[120px] text-foreground">
                {activeGroupId ? "Chat Conversation" : "Zeta Chat"}
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              {activeGroupId && (
                <button 
                  onClick={() => setActiveGroupId(null)}
                  className="p-1 hover:bg-secondary rounded text-muted-foreground"
                  title="Back to conversations"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              <button 
                onClick={() => setIsMinimized(true)}
                className="p-1 hover:bg-secondary rounded text-muted-foreground"
                title="Minimize"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => setIsVisible(false)}
                className="p-1 hover:bg-destructive/10 hover:text-destructive rounded text-muted-foreground"
                title="Hide Chat Widget"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Body content */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            {activeGroupId ? (
              /* Active Chat Feed */
              <ChatWindow chatGroupId={activeGroupId} isFloating={true} />
            ) : (
              /* Conversations List inside widget */
              <div className="flex-1 flex flex-col overflow-hidden min-h-0 bg-background">
                <div className="p-3 border-b border-border bg-card shrink-0">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search conversation..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-secondary/35 border border-border rounded-xl pl-8 pr-3 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary focus:bg-background transition-colors"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
                  {loading ? (
                    <div className="flex justify-center p-6">
                      <Circle className="w-4 h-4 text-primary animate-ping" />
                    </div>
                  ) : getFilteredGroups().length === 0 ? (
                    <div className="p-6 text-center text-[10px] text-muted-foreground italic gap-1.5 flex flex-col items-center">
                      <Sparkles className="w-6 h-6 opacity-40 text-primary" />
                      <span>No conversations found.</span>
                    </div>
                  ) : (
                    getFilteredGroups().map((group) => {
                      const name = getChatPartnerName(group)
                      const partner = group?.members?.find((m: any) => m.userId === currentUserId)
                      const isGroupMuted = partner?.mutedUntil && new Date(partner.mutedUntil) > new Date()
                      const otherMember = group?.members?.find((m: any) => m.userId !== currentUserId)
                      const avatar = otherMember?.user?.image

                      return (
                        <button
                          key={group.id}
                          onClick={() => setActiveGroupId(group.id)}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl hover:bg-secondary/40 transition-colors text-left"
                        >
                          {avatar && !group.isGroup ? (
                            <img src={avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-border shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-xs uppercase shrink-0">
                              {group.isGroup ? <Users className="w-3.5 h-3.5" /> : name[0]}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold text-foreground truncate block">{name}</span>
                            <span className="text-[10px] text-muted-foreground truncate block">
                              {group.isGroup ? "Group Chat" : "Private Chat"}
                            </span>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {isGroupMuted && <VolumeX className="w-3 h-3 text-destructive shrink-0" />}
                            {group.unreadCount > 0 && (
                              <span className="bg-primary text-primary-foreground text-[9px] font-black min-w-5 h-5 px-1 rounded-full flex items-center justify-center border border-background shadow-sm">
                                {group.unreadCount}
                              </span>
                            )}
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
