"use client"

import * as React from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { BookOpen, ChevronLeft, Save, Loader2, FileText, Info, ShieldAlert, Edit3, Eye, Trash2 } from "lucide-react"
import { TiptapEditor } from "@/components/editor/tiptap-editor"
import { ContentRenderer } from "@/components/editor/content-renderer"
import { getDocumentById, updateDocument } from "@/actions/document"
import { getAttachmentsForContext } from "@/actions/get-attachments"
import { toast } from "sonner"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"

export default function DocumentDetailsPage() {
  const { docId } = useParams()
  const searchParams = useSearchParams()
  const mode = searchParams.get("mode") // 'view' or 'edit'
  
  const router = useRouter()
  const { data: session } = useSession()
  const userId = (session?.user as any)?.id

  const [doc, setDoc] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [title, setTitle] = React.useState("")
  const [content, setContent] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [projectAttachments, setProjectAttachments] = React.useState<any[]>([])
  const [readers, setReaders] = React.useState<any[]>([])

  // Listen to real-time active readers list changes from WebSocket server
  React.useEffect(() => {
    if (!userId) return

    const handleReadersUpdate = (e: Event) => {
      const viewers = (e as CustomEvent).detail || []
      // Render only OTHER active users currently reading this doc
      setReaders(viewers.filter((v: any) => v.id !== userId))
    }

    window.addEventListener("readers:updated", handleReadersUpdate)
    return () => {
      window.removeEventListener("readers:updated", handleReadersUpdate)
    }
  }, [userId])

  React.useEffect(() => {
    async function load() {
      const res = await getDocumentById(docId as string)
      if (res.success && res.document) {
        setDoc(res.document)
        setTitle(res.document.title)
        setContent(res.document.content)
        const atts = await getAttachmentsForContext({ projectId: res.document.projectId })
        setProjectAttachments(atts)
      }
      setLoading(false)
    }
    load()
  }, [docId])

  React.useEffect(() => {
    if (doc) {
      const highlight = searchParams.get("highlight")
      if (highlight === "document") {
        const timer = setTimeout(() => {
          const element = document.getElementById("document-content")
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" })
            element.classList.add("highlight-flash")
            
            const cleanupTimer = setTimeout(() => {
              element?.classList.remove("highlight-flash")
            }, 3500)
            return () => clearTimeout(cleanupTimer)
          }
        }, 400)
        return () => clearTimeout(timer)
      }
    }
  }, [doc, searchParams])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!doc) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-destructive" />
        <h3 className="text-xl font-bold">Document not found</h3>
        <Link href="/documentation" className="text-primary hover:underline font-bold">Back to Documentation</Link>
      </div>
    )
  }

  const isAuthor = doc.authorId === userId
  const isAssignee = doc.taskLinks.some((link: any) => 
    link.task.assignments.some((a: any) => a.userId === userId)
  )
  const isMentioned = doc.content.includes(`data-id="${userId}"`)
  
  // Security checks
  const hasEditPermission = isAuthor || isAssignee
  const hasViewPermission = hasEditPermission || isMentioned
  
  // UI Mode logic
  const canEdit = hasEditPermission && mode !== "view"
  const canView = hasViewPermission

  if (!canView) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center space-y-4 p-6 text-center">
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-2">
          <ShieldAlert className="w-10 h-10 text-destructive" />
        </div>
        <h3 className="text-2xl font-black tracking-tight">Access Denied</h3>
        <p className="text-muted-foreground max-w-md">You do not have permission to view this document. You must be the author, an assignee of a linked task, or mentioned in the text.</p>
        <Link href="/documentation" className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
          Go Back
        </Link>
      </div>
    )
  }

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Please enter a title")
      return
    }
    setSaving(true)
    const res = await updateDocument(doc.id, { title, content })
    if (res.success) {
      toast.success("Document updated!")
    } else {
      toast.error(res.error || "Failed to update document")
    }
    setSaving(false)
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/documentation"
            className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <span className="text-sm font-bold tracking-tight">
              {canEdit ? "Edit Document" : "View Document"}
            </span>
            {canEdit ? (
              <span className="bg-amber-500/10 text-amber-600 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-500/20 uppercase">Editor Access</span>
            ) : isMentioned ? (
              <span className="bg-blue-500/10 text-blue-600 text-[10px] font-black px-2 py-0.5 rounded-full border border-blue-500/20 uppercase">View Only (Mentioned)</span>
            ) : (
              <span className="bg-emerald-500/10 text-emerald-600 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-500/20 uppercase">View Only</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Real-time active readers avatars list */}
          {readers.length > 0 && (
            <div className="flex items-center -space-x-2 animate-in fade-in slide-in-from-right-3 duration-300">
              <span className="text-[10px] text-muted-foreground font-black tracking-widest mr-2 uppercase">Active Readers:</span>
              {readers.map((v) => (
                <div
                  key={v.id}
                  className="relative group w-8 h-8 rounded-full border-2 border-background bg-secondary flex items-center justify-center overflow-hidden shrink-0 shadow-sm transition-all hover:scale-110"
                  title={v.name || "Anonymous User"}
                >
                  {v.image ? (
                    <img src={v.image} alt={v.name || ""} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-black uppercase text-secondary-foreground">
                      {(v.name || v.email || "?").slice(0, 2)}
                    </span>
                  )}
                  {/* Floating tooltip */}
                  <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-popover border border-border px-2 py-1 rounded-md text-[9px] font-black uppercase text-popover-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-md">
                    {v.name || "Team Member"}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
          {canEdit && (
            <button
              onClick={async () => {
                if (!confirm("Are you sure you want to delete this document?")) return
                const res = await (await import("@/actions/document")).deleteDocument(doc.id)
                if (res.success) {
                  toast.success("Document deleted")
                  router.push("/documentation")
                } else {
                  toast.error(res.error)
                }
              }}
              className="flex items-center gap-2 bg-destructive/10 text-destructive px-4 py-2 rounded-xl text-sm font-bold hover:bg-destructive/20 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}

          {canEdit && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving..." : "Save Changes"}
            </button>
          )}
        </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-12 custom-scrollbar bg-card/30">
        <div id="document-content" className="max-w-4xl mx-auto space-y-8 pb-20 bg-card p-10 lg:p-16 rounded-[2.5rem] shadow-2xl border border-border/50">
          <div className="space-y-4">
            {canEdit ? (
              <input
                type="text"
                placeholder="Documentation Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-4xl lg:text-5xl font-black bg-transparent border-none outline-none placeholder:text-muted-foreground/30 tracking-tight"
              />
            ) : (
              <h1 className="text-4xl lg:text-5xl font-black tracking-tight">{title}</h1>
            )}
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground border-b border-border pb-6">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center overflow-hidden border border-border">
                  {doc.author.image ? (
                    <img src={doc.author.image} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-bold">{doc.author.name?.[0]}</span>
                  )}
                </div>
                <span className="font-medium">{doc.author.name}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>Last updated {new Date(doc.updatedAt).toLocaleDateString()}</span>
              </div>
              {doc.taskLinks.length > 0 && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    <div className="flex gap-2">
                      {doc.taskLinks.map((link: any) => (
                        <Link 
                          key={link.task.id} 
                          href={`/tasks/${link.task.id}`}
                          className="hover:text-primary transition-colors font-bold underline decoration-primary/30 underline-offset-4"
                        >
                          OPEN-{link.task.id.slice(0, 6).toUpperCase()}
                        </Link>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="min-h-[500px]">
            {canEdit ? (
              <TiptapEditor
                content={content}
                onChange={setContent}
                placeholder="Start writing..."
                minHeight="500px"
                projectId={doc.projectId}
              />
            ) : (
              <ContentRenderer
                html={doc.content}
                attachments={projectAttachments}
                className="prose prose-lg max-w-none prose-headings:font-black prose-p:leading-relaxed prose-p:text-foreground/80 prose-strong:text-foreground prose-a:text-primary prose-a:font-bold prose-img:rounded-3xl prose-img:shadow-2xl"
              />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
