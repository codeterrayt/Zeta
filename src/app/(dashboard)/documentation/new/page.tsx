"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { BookOpen, ChevronLeft, Save, Loader2, FileText, Layout, Info } from "lucide-react"
import { TiptapEditor } from "@/components/editor/tiptap-editor"
import { createDocument } from "@/actions/document"
import { getProjects } from "@/actions/project"
import { toast } from "sonner"
import Link from "next/link"

export default function GlobalNewDocumentationPage() {
  const router = useRouter()
  const [projects, setProjects] = React.useState<any[]>([])
  const [selectedProjectId, setSelectedProjectId] = React.useState("")
  const [title, setTitle] = React.useState("")
  const [content, setContent] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    getProjects().then(res => {
      if (res.success) {
        setProjects(res.projects || [])
        if (res.projects?.length > 0) {
          setSelectedProjectId(res.projects[0].id)
        }
      }
      setLoading(false)
    })
  }, [])

  const handleSave = async () => {
    if (!selectedProjectId) {
      toast.error("Please select a project")
      return
    }
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
      projectId: selectedProjectId
    })

    if (res.success) {
      toast.success("Documentation created!")
      router.push("/documentation")
    } else {
      toast.error(res.error || "Failed to create documentation")
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
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
            <span className="text-sm font-bold tracking-tight">New Knowledge Base Document</span>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Creating..." : "Publish Document"}
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-12 custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-secondary/30 rounded-2xl border border-border/50">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-xl border border-border shadow-sm">
                <Layout className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-muted-foreground">Target Project:</span>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs font-black cursor-pointer pr-2"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                <Info className="w-3 h-3" />
                Documents are grouped by project for better organization.
              </div>
            </div>

            <input
              type="text"
              placeholder="Document Title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-4xl lg:text-5xl font-black bg-transparent border-none outline-none placeholder:text-muted-foreground/20 tracking-tight"
            />
          </div>

          <div className="min-h-[500px]">
            <TiptapEditor
              content={content}
              onChange={setContent}
              placeholder="Share your knowledge with the team... (Use @ to mention teammates)"
              minHeight="500px"
              projectId={selectedProjectId}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
