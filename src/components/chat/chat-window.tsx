"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { useRealtime } from "@/components/providers/realtime-provider"
import { getChatGroup, sendChatMessage, deleteChatMessage, getChatMessages } from "@/actions/chat"
import { TiptapEditor } from "@/components/editor/tiptap-editor"
import { ContentRenderer } from "@/components/editor/content-renderer"
import { 
  Send, Trash2, Paperclip, Loader2, Smile, X, Circle,
  FileIcon, Download, Check, AlertTriangle, SidebarOpen, SidebarClose
} from "lucide-react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"

interface ChatWindowProps {
  chatGroupId: string
  onClose?: () => void
  isFloating?: boolean
  showProfileToggle?: boolean
  isProfileOpen?: boolean
  onToggleProfile?: () => void
}

const MAX_CHAR_LIMIT = 4000

// Helper to strip HTML tags and get plain text length
function getPlainTextLength(html: string): number {
  if (!html) return 0
  const plainText = html.replace(/<[^>]*>/g, "")
  return plainText.length
}

export function ChatWindow({ 
  chatGroupId, 
  onClose, 
  isFloating = false, 
  showProfileToggle = false, 
  isProfileOpen = true, 
  onToggleProfile 
}: ChatWindowProps) {
  const { data: session } = useSession()
  const currentUserId = session?.user?.id
  const currentUserName = session?.user?.name || session?.user?.email || "Someone"
  const { socket } = useRealtime()

  const [group, setGroup] = React.useState<any>(null)
  const [messages, setMessages] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [sending, setSending] = React.useState(false)
  const [messageContent, setMessageContent] = React.useState("")
  
  // Pagination states
  const [hasMore, setHasMore] = React.useState(false)
  const [loadingMore, setLoadingMore] = React.useState(false)
  
  // Track uploaded attachments for the current message being typed
  const [pendingAttachments, setPendingAttachments] = React.useState<any[]>([])
  
  // Typing state
  const [typists, setTypists] = React.useState<{ userId: string; userName: string }[]>([])
  const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  const isTypingRef = React.useRef(false)

  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)

  // Character count
  const charCount = React.useMemo(() => getPlainTextLength(messageContent), [messageContent])
  const isOverLimit = charCount > MAX_CHAR_LIMIT

  // Scroll to bottom helper
  const scrollToBottom = React.useCallback((behavior: ScrollBehavior = "smooth") => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior })
    }
  }, [])

  // Load chat group details and messages
  const loadGroupData = React.useCallback(async () => {
    setLoading(true)
    const res = await getChatGroup(chatGroupId)
    if (res.success && res.group) {
      const grp = res.group as any
      setGroup(grp)
      // Reverse messages because they are fetched DESC (latest 50)
      const msgs = (grp.messages || []).reverse()
      setMessages(msgs)
      setHasMore(msgs.length === 50)
      
      // Scroll to bottom after state update
      setTimeout(() => scrollToBottom("auto"), 50)
    } else {
      toast.error(res.error || "Failed to load chat conversation")
    }
    setLoading(false)
  }, [chatGroupId, scrollToBottom])

  React.useEffect(() => {
    loadGroupData()
  }, [loadGroupData])

  // Handle scrolling to paginate older messages
  const handleScroll = async () => {
    const container = scrollContainerRef.current
    if (!container || loadingMore || !hasMore) return

    // Trigger loading older messages when user scrolls near top
    if (container.scrollTop < 10) {
      setLoadingMore(true)
      const oldestMsg = messages[0]
      if (oldestMsg) {
        const res = await getChatMessages(chatGroupId, oldestMsg.createdAt)
        if (res.success && res.messages) {
          const newMsgs = res.messages.reverse()
          if (newMsgs.length < 50) {
            setHasMore(false)
          }

          // Measure current scroll height and position
          const oldScrollHeight = container.scrollHeight
          const oldScrollTop = container.scrollTop

          setMessages(prev => [...newMsgs, ...prev])

          // Restore scroll position after React updates the DOM
          requestAnimationFrame(() => {
            if (scrollContainerRef.current) {
              const newScrollHeight = scrollContainerRef.current.scrollHeight
              scrollContainerRef.current.scrollTop = newScrollHeight - oldScrollHeight + oldScrollTop
            }
          })
        }
      }
      setLoadingMore(false)
    }
  }

  // Real-time socket room subscription
  React.useEffect(() => {
    if (!socket || !chatGroupId) return

    socket.emit("join_chat_group", chatGroupId)

    // Listeners
    const handleNewMessage = (msg: any) => {
      if (msg.chatGroupId !== chatGroupId) return
      setMessages((prev: any[]) => {
        if (prev.some(m => m.id === msg.id)) return prev
        return [...prev, msg]
      })
      setTimeout(() => scrollToBottom(), 50)
    }

    const handleUpdatedMessage = (msg: any) => {
      if (msg.chatGroupId !== chatGroupId) return
      setMessages((prev: any[]) => prev.map(m => m.id === msg.id ? { ...m, ...msg } : m))
    }

    const handleDeletedMessage = (data: any) => {
      if (data.chatGroupId !== chatGroupId) return
      setMessages((prev: any[]) => prev.map(m => m.id === data.id ? { ...m, isDeleted: true } : m))
    }

    const handleGroupUpdated = (updatedGroup: any) => {
      if (updatedGroup.id !== chatGroupId) return
      setGroup((prev: any) => {
        if (!prev) return updatedGroup
        return { ...prev, ...updatedGroup }
      })
    }

    const handleTyping = (data: any) => {
      if (data.chatGroupId !== chatGroupId) return
      if (data.userId === currentUserId) return
      setTypists((prev: any[]) => {
        if (prev.some(t => t.userId === data.userId)) return prev
        return [...prev, { userId: data.userId, userName: data.userName }]
      })
    }

    const handleStopTyping = (data: any) => {
      if (data.chatGroupId !== chatGroupId) return
      setTypists(prev => prev.filter(t => t.userId !== data.userId))
    }

    socket.on("chat_message_created", handleNewMessage)
    socket.on("chat_message_updated", handleUpdatedMessage)
    socket.on("chat_message_deleted", handleDeletedMessage)
    socket.on("chat_group_updated", handleGroupUpdated)
    socket.on("typing_indicator", handleTyping)
    socket.on("stop_typing_indicator", handleStopTyping)

    return () => {
      socket.emit("leave_chat_group", chatGroupId)
      socket.off("chat_message_created", handleNewMessage)
      socket.off("chat_message_updated", handleUpdatedMessage)
      socket.off("chat_message_deleted", handleDeletedMessage)
      socket.off("chat_group_updated", handleGroupUpdated)
      socket.off("typing_indicator", handleTyping)
      socket.off("stop_typing_indicator", handleStopTyping)
    }
  }, [socket, chatGroupId, currentUserId, scrollToBottom])

  // Handle keypress/typing notification to other members
  const notifyTyping = () => {
    if (!socket || !chatGroupId || !currentUserId) return

    if (!isTypingRef.current) {
      isTypingRef.current = true
      socket.emit("typing", { chatGroupId, userId: currentUserId, userName: currentUserName })
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false
      socket.emit("stop_typing", { chatGroupId, userId: currentUserId })
    }, 2000)
  }

  // Clear typing timeout on unmount
  React.useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }, [])

  // Send message handler
  const handleSendMessage = async () => {
    const trimmed = messageContent.trim()
    if (!trimmed || isOverLimit || sending) return

    setSending(true)
    
    // Stop typing indicator immediately
    if (socket && isTypingRef.current) {
      isTypingRef.current = false
      socket.emit("stop_typing", { chatGroupId, userId: currentUserId })
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)

    const attachmentIds = pendingAttachments.map(a => a.id)
    const res = await sendChatMessage(chatGroupId, messageContent, attachmentIds)

    if (res.success) {
      setMessageContent("")
      setPendingAttachments([])
    } else {
      toast.error(res.error || "Failed to send message")
    }
    setSending(false)
  }

  // File uploaded handler from tiptap editor
  const handleAttachmentUpload = (att: any) => {
    setPendingAttachments(prev => [...prev, att])
  }

  // Delete message handler
  const handleDeleteMessage = async (msgId: string) => {
    if (!confirm("Are you sure you want to delete this message? This action cannot be undone.")) return
    const res = await deleteChatMessage(msgId)
    if (res.success) {
      toast.success("Message deleted")
    } else {
      toast.error(res.error || "Failed to delete message")
    }
  }

  // Mute options toggle
  const getChatPartnerName = () => {
    if (!group) return "Chat"
    if (group.isGroup) return group.name || "Group Chat"
    const partner = group.members.find((m: any) => m.userId !== currentUserId)
    return partner?.user?.name || partner?.user?.email || "Direct Chat"
  };

  const getChatPartnerImage = () => {
    if (!group || group.isGroup) return null
    const partner = group.members.find((m: any) => m.userId !== currentUserId)
    return partner?.user?.image
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  if (!group) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-background gap-3">
        <AlertTriangle className="w-12 h-12 text-destructive" />
        <p className="font-semibold text-muted-foreground">Conversation unavailable or access denied.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      {/* Header */}
      <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-card shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {!group.isGroup && getChatPartnerImage() ? (
            <img src={getChatPartnerImage() || ""} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 border border-border" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-xs shrink-0">
              {group.isGroup ? (group.name?.[0] || "G") : (getChatPartnerName()?.[0] || "C")}
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <span className="font-black text-sm text-foreground truncate">{getChatPartnerName()}</span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Circle className="w-1.5 h-1.5 fill-emerald-500 text-emerald-500" />
              {group.isGroup ? `${group.members.length} participants` : "Active"}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {showProfileToggle && onToggleProfile && (
            <button 
              onClick={onToggleProfile} 
              className="p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground"
              title={isProfileOpen ? "Hide chat details" : "Show chat details"}
            >
              {isProfileOpen ? <SidebarClose className="w-4 h-4" /> : <SidebarOpen className="w-4 h-4" />}
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Feed */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 p-4 overflow-y-auto space-y-4 custom-scrollbar bg-secondary/10"
      >
        {hasMore && (
          <div className="flex justify-center py-2 shrink-0">
            {loadingMore ? (
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
            ) : (
              <span className="text-[10px] text-muted-foreground italic select-none">Scroll up to load older messages</span>
            )}
          </div>
        )}
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground gap-1.5">
            <Smile className="w-10 h-10 text-muted-foreground/50" />
            <p className="text-sm font-semibold">Say hello!</p>
            <p className="text-xs max-w-[200px]">Send a message to start this real-time conversation.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.senderId === currentUserId
            const displayTime = formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })
            const senderName = msg.sender?.name || msg.sender?.email || "User"
            const avatar = msg.sender?.image

            return (
              <div 
                key={msg.id} 
                className={`flex gap-3 max-w-[85%] ${isOwn ? "ml-auto flex-row-reverse" : "mr-auto"}`}
              >
                {!isOwn && (
                  <div className="w-8 h-8 rounded-full bg-secondary overflow-hidden flex items-center justify-center shrink-0 border border-border">
                    {avatar ? (
                      <img src={avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-black">{senderName[0]?.toUpperCase()}</span>
                    )}
                  </div>
                )}
                <div className="flex flex-col space-y-1">
                  {!isOwn && (
                    <span className="text-[10px] font-bold text-muted-foreground px-1">{senderName}</span>
                  )}
                  <div className="relative group/msg flex items-center gap-2">
                    <div 
                      className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        msg.isDeleted
                          ? "bg-secondary/40 text-muted-foreground/80 italic border border-border/40"
                          : isOwn
                            ? "bg-primary text-primary-foreground rounded-tr-none shadow-md shadow-primary/10"
                            : "bg-card text-foreground border border-border/50 rounded-tl-none shadow-sm"
                      }`}
                    >
                      {msg.isDeleted ? (
                        <span>[Deleted by the Sender]</span>
                      ) : (
                        <ContentRenderer 
                          html={msg.content} 
                          className={cn(
                            "prose prose-sm max-w-none text-sm leading-relaxed",
                            isOwn 
                              ? "text-primary-foreground [&_.mention]:bg-white/20 [&_.mention]:text-white [&_.mention]:border-white/30" 
                              : "text-foreground [&_.mention]:bg-primary/10 [&_.mention]:text-primary [&_.mention]:border-primary/20"
                          )}
                        />
                      )}

                      {/* Display message attachments */}
                      {!msg.isDeleted && msg.attachments && msg.attachments.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-border/10 space-y-1 bg-background/5 p-1.5 rounded-lg">
                          {msg.attachments.map((att: any) => (
                            <a 
                              key={att.id}
                              href={att.url} 
                              download
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1.5 text-xs text-primary-foreground hover:underline font-medium"
                            >
                              <FileIcon className="w-3.5 h-3.5" />
                              <span className="truncate max-w-[150px]">{att.name}</span>
                              <Download className="w-3 h-3 shrink-0" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Delete action overlay */}
                    {isOwn && !msg.isDeleted && (
                      <button 
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="opacity-0 group-hover/msg:opacity-100 p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-lg text-muted-foreground transition-all shrink-0 cursor-pointer"
                        title="Delete Message"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <span className={`text-[8px] text-muted-foreground px-1 ${isOwn ? "text-right" : "text-left"}`}>
                    {displayTime}
                  </span>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicators */}
      {typists.length > 0 && (
        <div className="px-4 py-1.5 bg-secondary/5 text-[10px] text-muted-foreground italic flex items-center gap-1.5 border-t border-border/30 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
          <span>
            {typists.map(t => t.userName).join(", ")} {typists.length === 1 ? "is" : "are"} typing...
          </span>
        </div>
      )}

      {/* Editor & Attachment Bar */}
      <div className="p-3 bg-card border-t border-border flex flex-col gap-2 shrink-0">
        {pendingAttachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-1">
            {pendingAttachments.map((att) => (
              <div key={att.id} className="flex items-center gap-1.5 bg-secondary/50 border border-border px-2 py-1 rounded-xl text-xs">
                <FileIcon className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="max-w-[120px] truncate">{att.name}</span>
                <button 
                  onClick={() => setPendingAttachments(prev => prev.filter(p => p.id !== att.id))}
                  className="p-0.5 hover:bg-secondary rounded text-muted-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2.5">
          <div className="flex-1 bg-secondary/20 rounded-2xl overflow-hidden border border-border/70 flex flex-col focus-within:border-primary/50 transition-colors">
            <TiptapEditor 
              content={messageContent}
              onChange={(html) => {
                setMessageContent(html)
                notifyTyping()
              }}
              placeholder="Type a message (mention @users, attach files)..."
              minHeight="50px"
              chatGroupId={chatGroupId}
              onAttachmentUpload={handleAttachmentUpload}
            />
            
            <div className="flex items-center justify-between px-3 py-1.5 bg-secondary/5 border-t border-border/30">
              <span className={`text-[10px] ${isOverLimit ? "text-destructive font-black" : "text-muted-foreground"}`}>
                {charCount} / {MAX_CHAR_LIMIT} characters
              </span>
              {isOverLimit && (
                <span className="text-[10px] text-destructive font-bold flex items-center gap-1 animate-pulse">
                  <AlertTriangle className="w-3 h-3" /> Exceeds character limit
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleSendMessage}
            disabled={!messageContent.trim() || isOverLimit || sending}
            className={`p-3.5 bg-primary text-primary-foreground rounded-2xl shadow-lg transition-all flex items-center justify-center shrink-0 cursor-pointer ${
              (!messageContent.trim() || isOverLimit || sending)
                ? "opacity-50 pointer-events-none"
                : "hover:bg-primary/90 hover:scale-105 active:scale-95 shadow-primary/20"
            }`}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}
