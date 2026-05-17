"use client"

import * as React from "react"
import { 
  History, 
  X, 
  User as UserIcon, 
  Clock, 
  Calendar,
  CheckCircle2,
  ArrowRight,
  Plus,
  Trash2,
  Edit3,
  RefreshCw,
  MessageSquare,
  Check,
  BookOpen,
  Maximize2,
  Minimize2
} from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { getTaskAuditLogs, updateAuditLogComment, addAuditLogComment, deleteAuditLogComment } from "@/actions/audit-log"
import { TiptapEditor } from "@/components/editor/tiptap-editor"
import { ContentRenderer } from "@/components/editor/content-renderer"
import { useSession } from "next-auth/react"
import { getAttachmentsForContext } from "@/actions/get-attachments"

type AuditLogComment = {
  id: string
  content: string
  createdAt: Date
  userId: string
  user: {
    id: string
    name: string | null
    image: string | null
    email: string | null
  }
}

type AuditLog = {
  id: string
  action: string
  details: string
  comment: string | null
  createdAt: Date
  user: {
    id: string
    name: string | null
    image: string | null
    email: string | null
  }
  comments: AuditLogComment[]
}

export function TaskTimeline({ taskId, taskTitle, projectId }: { taskId: string, taskTitle: string, projectId: string }) {
  const { data: session } = useSession()
  const currentUserId = (session?.user as any)?.id

  const [isOpen, setIsOpen] = React.useState(false)
  const [isMaximized, setIsMaximized] = React.useState(false)
  const [logs, setLogs] = React.useState<AuditLog[]>([])
  const [loading, setLoading] = React.useState(false)
  const [editingLogId, setEditingLogId] = React.useState<string | null>(null)
  const [commentText, setCommentText] = React.useState("")
  const [savingComment, setSavingComment] = React.useState(false)

  // Thread comments states
  const [addingComments, setAddingComments] = React.useState<Record<string, string>>({})
  const [submittingCommentId, setSubmittingCommentId] = React.useState<string | null>(null)
  const [attachments, setAttachments] = React.useState<any[]>([])

  const sortedLogs = React.useMemo(() => {
    return [...logs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [logs])

  const loadLogs = async (showLoading = true) => {
    if (showLoading) setLoading(true)
    const [res, atts] = await Promise.all([
      getTaskAuditLogs(taskId),
      getAttachmentsForContext({ projectId })
    ])
    if (res.success) {
      setLogs(res.logs as any)
    }
    if (atts) {
      setAttachments(atts)
    }
    if (showLoading) setLoading(false)
  }

  const handleSaveComment = async (logId: string) => {
    setSavingComment(true)
    try {
      const res = await updateAuditLogComment(logId, commentText)
      if (res.success) {
        setLogs(prev => prev.map(l => l.id === logId ? { ...l, comment: commentText || null } : l))
        setEditingLogId(null)
        setCommentText("")
      } else {
        alert("Failed to update comment: " + res.error)
      }
    } catch (err) {
      console.error(err)
      alert("Failed to update comment.")
    } finally {
      setSavingComment(false)
    }
  }

  const handleAddComment = async (logId: string) => {
    const text = addingComments[logId] || ""
    if (!text.trim()) return

    setSubmittingCommentId(logId)
    try {
      const res = await addAuditLogComment(logId, text)
      if (res.success && res.comment) {
        setLogs(prev => prev.map(l => {
          if (l.id === logId) {
            return {
              ...l,
              comments: [...(l.comments || []), res.comment as any]
            }
          }
          return l
        }))
        setAddingComments(prev => ({ ...prev, [logId]: "" }))
        window.dispatchEvent(new CustomEvent("timeline:updated", { detail: { taskId } }))
      } else {
        alert("Failed to add comment")
      }
    } catch (err) {
      console.error(err)
      alert("Failed to add comment")
    } finally {
      setSubmittingCommentId(null)
    }
  }

  const handleDeleteComment = async (logId: string, commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return
    try {
      const res = await deleteAuditLogComment(commentId)
      if (res.success) {
        setLogs(prev => prev.map(l => {
          if (l.id === logId) {
            return {
              ...l,
              comments: (l.comments || []).filter(c => c.id !== commentId)
            }
          }
          return l
        }))
        window.dispatchEvent(new CustomEvent("timeline:updated", { detail: { taskId } }))
      } else {
        alert("Failed to delete comment")
      }
    } catch (err) {
      console.error(err)
      alert("Failed to delete comment")
    }
  }

  React.useEffect(() => {
    if (isOpen) {
      loadLogs()
    } else {
      setIsMaximized(false)
    }
  }, [isOpen])

  // Sync real-time timeline logs / comment events in background
  React.useEffect(() => {
    if (!isOpen) return

    const handleCommentCreated = (e: Event) => {
      const comment = (e as CustomEvent).detail
      if (!comment) return
      setLogs(prev => prev.map(l => {
        if (l.id === comment.auditLogId) {
          const list = l.comments || []
          if (list.some((c: any) => c.id === comment.id)) return l
          return {
            ...l,
            comments: [...list, comment]
          }
        }
        return l
      }))
    }

    const handleCommentDeleted = (e: Event) => {
      const data = (e as CustomEvent).detail
      if (!data) return
      setLogs(prev => prev.map(l => {
        if (l.id === data.auditLogId) {
          return {
            ...l,
            comments: (l.comments || []).filter((c: any) => c.id !== data.id)
          }
        }
        return l
      }))
    }

    const handleTimelineUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (!detail || detail.taskId === taskId) {
        loadLogs(false)
      }
    }

    window.addEventListener("timeline:comment_created", handleCommentCreated)
    window.addEventListener("timeline:comment_deleted", handleCommentDeleted)
    window.addEventListener("timeline:updated", handleTimelineUpdate)

    return () => {
      window.removeEventListener("timeline:comment_created", handleCommentCreated)
      window.removeEventListener("timeline:comment_deleted", handleCommentDeleted)
      window.removeEventListener("timeline:updated", handleTimelineUpdate)
    }
  }, [isOpen, taskId])

  const getActionIcon = (action: string) => {
    switch (action) {
      case "CREATE_TASK": return <Plus className="w-4 h-4 text-green-500" />
      case "UPDATE_STATUS": return <RefreshCw className="w-4 h-4 text-blue-500" />
      case "UPDATE_ASSIGNMENTS": return <UserIcon className="w-4 h-4 text-purple-500" />
      case "UPDATE_TASK": return <Edit3 className="w-4 h-4 text-orange-500" />
      case "UPLOAD_ATTACHMENT": return <Plus className="w-4 h-4 text-emerald-500" />
      case "DELETE_ATTACHMENT": return <Trash2 className="w-4 h-4 text-red-500" />
      case "CREATE_DOCUMENT": return <BookOpen className="w-4 h-4 text-blue-600" />
      case "UPDATE_DOCUMENT": return <Edit3 className="w-4 h-4 text-blue-600" />
      case "DELETE_DOCUMENT": return <Trash2 className="w-4 h-4 text-red-600" />
      default: return <History className="w-4 h-4 text-muted-foreground" />
    }
  }

  const getActionLabel = (action: string) => {
    return action.split("_").map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(" ")
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary/50 hover:bg-secondary text-xs font-black transition-all border border-border/50 group"
      >
        <History className="w-3.5 h-3.5 group-hover:rotate-[-45deg] transition-transform duration-500" />
        Activity Timeline
      </button>

      <DialogPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm animate-in fade-in duration-300" />
          <DialogPrimitive.Content 
            className={cn(
              "fixed z-[101] grid gap-0 border bg-card p-0 shadow-2xl overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
              isMaximized 
                ? "left-0 top-0 w-screen h-screen translate-x-0 translate-y-0 rounded-none border-none" 
                : "left-[50%] top-[50%] w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] rounded-[2.5rem] border-border/60 duration-300 animate-in zoom-in-95"
            )}
          >
            
            <div 
              className={cn(
                "flex flex-col transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                isMaximized ? "h-screen" : "h-[70vh]"
              )}
            >
              {/* Header */}
              <div className="p-8 border-b border-border/40 bg-secondary/5 relative">
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <History className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <DialogPrimitive.Title className="text-2xl font-black tracking-tight leading-none">Task Activity</DialogPrimitive.Title>
                    <DialogPrimitive.Description className="text-muted-foreground text-sm font-medium mt-1 truncate max-w-[400px]">History for: {taskTitle}</DialogPrimitive.Description>
                  </div>
                </div>
                
                <div className="absolute right-8 top-8 flex items-center gap-2">
                  <button
                    onClick={() => setIsMaximized(!isMaximized)}
                    className="p-2.5 hover:bg-secondary rounded-2xl transition-all duration-200 text-muted-foreground hover:text-foreground hover:scale-105 active:scale-95 shrink-0"
                    title={isMaximized ? "Minimize window" : "Maximize window"}
                  >
                    {isMaximized ? (
                      <Minimize2 className="w-5 h-5" />
                    ) : (
                      <Maximize2 className="w-5 h-5" />
                    )}
                  </button>
                  <DialogPrimitive.Close className="p-2.5 hover:bg-secondary rounded-2xl transition-all duration-200 text-muted-foreground hover:text-foreground hover:scale-105 active:scale-95 shrink-0">
                    <X className="w-5 h-5" />
                  </DialogPrimitive.Close>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {loading ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4">
                    <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Loading history...</p>
                  </div>
                ) : logs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                    <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center">
                      <Clock className="w-8 h-8 text-muted-foreground/40" />
                    </div>
                    <p className="font-bold text-muted-foreground">No activity recorded for this task yet.</p>
                  </div>
                ) : (
                  <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border/60 before:to-transparent">
                    {sortedLogs.map((log, index) => (
                      <div key={log.id} className="relative flex items-start gap-8 group">
                        {/* Avatar/Indicator */}
                        <div className="relative z-10 flex items-center justify-center shrink-0 w-10 h-10 rounded-2xl bg-card border border-border/60 shadow-sm group-hover:scale-110 transition-transform">
                          {log.user.image ? (
                            <img src={log.user.image} className="w-full h-full object-cover rounded-2xl" />
                          ) : (
                            <div className="w-full h-full rounded-2xl bg-primary/10 flex items-center justify-center">
                              <span className="text-xs font-black text-primary">{(log.user.name || "U")[0].toUpperCase()}</span>
                            </div>
                          )}
                        </div>

                        {/* Content Card */}
                        <div className="flex-1 bg-secondary/5 rounded-3xl p-5 border border-border/40 hover:bg-secondary/10 transition-all hover:shadow-xl hover:shadow-black/5 group-hover:-translate-x-1 duration-300">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black">{log.user.name || "Unknown User"}</span>
                              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-background/50 border border-border/40">
                                {getActionIcon(log.action)}
                                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                  {getActionLabel(log.action)}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(log.createdAt), "MMM d, h:mm a")}
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            {log.details.split("\n").map((line, i) => (
                              <p key={i} className="text-sm font-medium text-foreground/80 leading-relaxed pl-3 border-l-2 border-primary/20">
                                {line}
                              </p>
                            ))}
                          </div>

                          {/* Discussion / Thread Section */}
                          <div className="mt-4 pt-4 border-t border-border/25 space-y-4">
                            {/* Legacy Save Context Comment */}
                            {log.comment && (
                              <div className="flex items-start gap-2.5 bg-primary/5 p-3 rounded-2xl border border-primary/20">
                                <MessageSquare className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                                <div className="flex-1 space-y-1">
                                  <span className="text-[10px] font-black text-primary uppercase tracking-wider block text-left">Save Context</span>
                                  <div className="text-xs font-semibold text-foreground/80 leading-relaxed text-left prose prose-sm max-w-none">
                                    <ContentRenderer html={log.comment} attachments={attachments} className="prose-p:my-0" />
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Thread Comments List */}
                            {log.comments && log.comments.length > 0 && (
                              <div className="space-y-3 pl-3 border-l border-border/40">
                                {[...log.comments].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map((c) => (
                                  <div key={c.id} className="group/item flex items-start gap-2.5">
                                    {c.user.image ? (
                                      <img src={c.user.image} alt={c.user.name || ""} className="w-6 h-6 rounded-full border border-border/40 shrink-0" />
                                    ) : (
                                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black border border-primary/20 uppercase shrink-0">
                                        {(c.user.name || c.user.email || "U").substring(0, 2)}
                                      </div>
                                    )}
                                    <div className="flex-1 bg-background/40 p-2.5 rounded-2xl border border-border/30 hover:border-border/60 transition-all">
                                      <div className="flex items-center justify-between gap-2 mb-1">
                                        <span className="text-[10px] font-black text-foreground">{c.user.name || "Unknown User"}</span>
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[9px] font-semibold text-muted-foreground">
                                            {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                                          </span>
                                          {c.userId === currentUserId && (
                                            <button
                                              onClick={() => handleDeleteComment(log.id, c.id)}
                                              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                      <div className="text-xs font-semibold text-foreground/90 leading-relaxed text-left prose prose-sm max-w-none">
                                        <ContentRenderer html={c.content} attachments={attachments} className="prose-p:my-0" />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Add a Comment Input using TipTapEditor */}
                            <div className="space-y-2">
                              <div className="border border-border/50 rounded-2xl overflow-hidden bg-background/40 focus-within:border-primary/45 transition-colors">
                                <TiptapEditor
                                  content={addingComments[log.id] || ""}
                                  onChange={(val) => setAddingComments(prev => ({ ...prev, [log.id]: val }))}
                                  placeholder="Reply to this timeline event... (supports @user and @file:)"
                                  minHeight="60px"
                                  projectId={projectId}
                                />
                              </div>
                              <div className="flex justify-end">
                                <button
                                  onClick={() => handleAddComment(log.id)}
                                  disabled={submittingCommentId === log.id || !(addingComments[log.id] || "").trim()}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-[10px] font-black hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-primary/10"
                                >
                                  {submittingCommentId === log.id ? (
                                    <div className="w-2.5 h-2.5 border-2 border-primary-foreground/35 border-t-primary-foreground rounded-full animate-spin" />
                                  ) : (
                                    <MessageSquare className="w-3 h-3" />
                                  )}
                                  Reply
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  )
}
