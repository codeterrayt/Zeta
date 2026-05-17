"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { formatDistanceToNow } from "date-fns"
import { MessageSquare, Reply, Trash2, Send } from "lucide-react"
import { addComment, deleteComment } from "@/actions/comment"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { TiptapEditor } from "@/components/editor/tiptap-editor"
import { ContentRenderer } from "@/components/editor/content-renderer"
import { getAttachmentsForContext } from "@/actions/get-attachments"
import { useParams, useSearchParams } from "next/navigation"

interface User {
  id: string
  name: string | null
  image: string | null
  email?: string | null
}

interface Comment {
  id: string
  content: string
  createdAt: Date
  userId: string
  parentId: string | null
  user: User
  children?: Comment[]
}

interface CommentSectionProps {
  taskId?: string
  sprintId?: string
  initialComments: any[]
  projectMembers: User[]
}

export function CommentSection({ taskId, sprintId, initialComments, projectMembers }: CommentSectionProps) {
  const { data: session } = useSession()
  const [comments, setComments] = React.useState<Comment[]>(initialComments)
  const [newComment, setNewComment] = React.useState("")
  const [replyTo, setReplyTo] = React.useState<string | null>(null)
  const [replyContent, setReplyContent] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [attachments, setAttachments] = React.useState<any[]>([])
  const params = useParams()
  const projectId = params.projectId as string
  const searchParams = useSearchParams()

  React.useEffect(() => {
    const highlight = searchParams?.get("highlight")
    if (highlight && (highlight.startsWith("comment-") || highlight.startsWith("log-comment-"))) {
      const timer = setTimeout(() => {
        const element = document.getElementById(highlight)
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" })
          element.classList.add("highlight-flash")
          
          const cleanupTimer = setTimeout(() => {
            element?.classList.remove("highlight-flash")
          }, 3500)
          return () => clearTimeout(cleanupTimer)
        }
      }, 600)
      return () => clearTimeout(timer)
    }
  }, [searchParams, comments])

  React.useEffect(() => {
    setComments(initialComments)
  }, [initialComments])

  // Load project attachments for file mention badge hydration
  React.useEffect(() => {
    if (projectId) {
      getAttachmentsForContext({ projectId }).then(res => setAttachments(res || []))
    }
  }, [projectId])

  const commentTree = React.useMemo(() => {
    const map: Record<string, any> = {}
    const roots: any[] = []

    comments.forEach(c => {
      map[c.id] = { ...c, children: [] }
    })

    comments.forEach(c => {
      if (c.parentId && map[c.parentId]) {
        map[c.parentId].children.push(map[c.id])
      } else {
        roots.push(map[c.id])
      }
    })

    return roots.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [comments])

  const handleAddComment = async (parentId?: string) => {
    const content = parentId ? replyContent : newComment
    if (!content?.trim() || content === "<p></p>") return

    setSubmitting(true)
    const res = await addComment({
      content,
      taskId,
      sprintId,
      projectId,
      parentId
    })
    if (res.success && res.comment) {
      setComments(prev => [...prev, res.comment as any])
      if (parentId) {
        setReplyTo(null)
        setReplyContent("")
      } else {
        setNewComment("")
      }
      toast.success("Comment added")
    } else {
      toast.error(res.error || "Failed to add comment")
    }
    setSubmitting(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this comment?")) return
    const res = await deleteComment(id, taskId || "any")
    if (res.success) {
      setComments(prev => prev.filter(c => c.id !== id))
      toast.success("Comment deleted")
    }
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="p-6 bg-secondary/10 rounded-[2rem] border border-border/50 shadow-inner">
        <div className="flex gap-4 mb-4">
          <div className="shrink-0">
            <div className="w-12 h-12 rounded-[1.25rem] bg-primary text-primary-foreground flex items-center justify-center font-black text-xl shadow-xl shadow-primary/30">
              {session?.user?.name?.[0]?.toUpperCase() ?? "U"}
            </div>
          </div>
          <div className="flex-1">
            <TiptapEditor
              content={newComment}
              onChange={setNewComment}
              placeholder="Type @ to mention or share your thoughts..."
              minHeight="120px"
              projectId={projectId}
              taskId={taskId}
              sprintId={sprintId}
              onAttachmentUpload={att => setAttachments((prev: any[]) => [att, ...prev])}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={() => handleAddComment()}
            disabled={submitting || !newComment.trim() || newComment === "<p></p>"}
            className="bg-primary text-primary-foreground px-8 py-2.5 rounded-xl text-sm font-bold hover:bg-primary/90 transition-all flex items-center gap-2 shadow-xl shadow-primary/20 disabled:opacity-40"
          >
            {submitting ? "Posting..." : "Post Comment"}
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {commentTree.length > 0 ? (
          commentTree.map(comment => (
            <CommentItem 
              key={comment.id} 
              comment={comment} 
              session={session}
              replyTo={replyTo}
              setReplyTo={setReplyTo}
              replyContent={replyContent}
              setReplyContent={setReplyContent}
              handleAddComment={handleAddComment}
              handleDelete={handleDelete}
              submitting={submitting}
              projectId={projectId}
              taskId={taskId}
              sprintId={sprintId}
              attachments={attachments}
              setAttachments={setAttachments}
            />
          ))
        ) : (
          <div className="py-20 text-center space-y-4 bg-secondary/5 rounded-[2.5rem] border border-dashed border-border/50">
            <div className="w-16 h-16 bg-secondary rounded-[1.5rem] flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-muted-foreground/30" />
            </div>
            <h3 className="text-sm font-bold text-muted-foreground">No activity yet</h3>
            <p className="text-xs text-muted-foreground/60 max-w-[200px] mx-auto">Be the first to share an update or start a discussion.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function CommentItem({ 
  comment, 
  depth = 0, 
  session, 
  replyTo, 
  setReplyTo, 
  replyContent, 
  setReplyContent, 
  handleAddComment, 
  handleDelete,
  submitting,
  projectId,
  taskId,
  sprintId,
  attachments = [],
  setAttachments
}: any) {
  return (
    <div 
      id={`comment-${comment.id}`}
      className={cn(
        "group flex gap-4 transition-all duration-300",
        depth > 0 ? "ml-12 mt-4" : "mt-8 border-b border-border/40 pb-8 last:border-0"
      )}
    >
      <div className="shrink-0">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden shadow-sm">
          {comment.user.image ? (
            <img src={comment.user.image} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm font-black text-primary">
              {(comment.user.name?.[0] || comment.user.email?.[0] || "U").toUpperCase()}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">{comment.user.name || comment.user.email}</span>
            <span className="text-[10px] font-medium text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full">
              {formatDistanceToNow(new Date(comment.createdAt))} ago
            </span>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
              className="p-1.5 hover:bg-primary/10 text-muted-foreground hover:text-primary rounded-lg transition-colors"
              title="Reply"
            >
              <Reply className="w-3.5 h-3.5" />
            </button>
            {session?.user?.id === comment.userId && (
              <button 
                onClick={() => handleDelete(comment.id)}
                className="p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg transition-colors"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <ContentRenderer
          html={comment.content}
          attachments={attachments}
          className="text-sm text-foreground/80 leading-relaxed prose prose-sm max-w-none bg-secondary/5 p-3 rounded-2xl border border-border/30"
        />

        {replyTo === comment.id && (
          <div className="mt-4 flex gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center shrink-0">
               <Reply className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className="flex-1 space-y-2">
              <TiptapEditor 
                content={replyContent}
                onChange={setReplyContent}
                placeholder={`Reply to ${comment.user.name || "user"}...`}
                minHeight="100px"
                projectId={projectId}
                taskId={taskId}
                sprintId={sprintId}
                onAttachmentUpload={att => setAttachments((prev: any[]) => [att, ...prev])}
              />
              <div className="flex justify-end gap-2">
                <button 
                  onClick={() => setReplyTo(null)}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-secondary transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleAddComment(comment.id)}
                  disabled={submitting}
                  className="bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                >
                  {submitting ? "Replying..." : "Reply"}
                </button>
              </div>
            </div>
          </div>
        )}

        {comment.children?.length > 0 && (
          <div className="relative">
            <div className="absolute left-[-26px] top-0 bottom-8 w-px bg-border/40" />
            {comment.children.map((child: any) => (
              <CommentItem 
                key={child.id} 
                comment={child} 
                depth={depth + 1} 
                session={session}
                replyTo={replyTo}
                setReplyTo={setReplyTo}
                replyContent={replyContent}
                setReplyContent={setReplyContent}
                handleAddComment={handleAddComment}
                handleDelete={handleDelete}
                submitting={submitting}
                projectId={projectId}
                taskId={taskId}
                sprintId={sprintId}
                attachments={attachments}
                setAttachments={setAttachments}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
