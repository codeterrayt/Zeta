"use client"

import * as React from "react"
import { useRouter, useParams } from "next/navigation"
import { BookOpen, ChevronLeft, Save, Loader2, FileText, Info } from "lucide-react"
import { TiptapEditor } from "@/components/editor/tiptap-editor"
import { createDocument } from "@/actions/document"
import { toast } from "sonner"
import Link from "next/link"

export default function NewDocumentationPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.projectId as string
  const taskId = params.taskId as string

  const [title, setTitle] = React.useState("")
  const [content, setContent] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Please enter a title")
      return
    }
    if (!content.trim() || content === "<p></p>") {
      toast.error("Please add some content")
      return
    }

    setSaving(true)
    const res = await createDocument({
      title,
      content,
      projectId,
      taskId
    })

    if (res.success) {
      toast.success("Documentation created!")
      router.push(`/projects/${projectId}?taskId=${taskId}`)
    } else {
      toast.error(res.error || "Failed to create documentation")
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href={`/projects/${projectId}?taskId=${taskId}`}
            className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <span className="text-sm font-bold tracking-tight">Create Documentation</span>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Creating..." : "Save Documentation"}
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-12 custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Documentation Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-4xl lg:text-5xl font-black bg-transparent border-none outline-none placeholder:text-muted-foreground/30 tracking-tight"
            />
            <div className="flex items-center gap-4 text-sm text-muted-foreground border-b border-border pb-6">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span>Document</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4" />
                <span>Linked to Task: OPEN-{taskId.slice(0, 6).toUpperCase()}</span>
              </div>
            </div>
          </div>

          <div className="min-h-[500px]">
            <TiptapEditor
              content={content}
              onChange={setContent}
              placeholder="Start writing your documentation here... (Use @ to mention teammates)"
              minHeight="500px"
              projectId={projectId}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
