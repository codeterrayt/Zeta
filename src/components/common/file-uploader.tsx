"use client"

import * as React from "react"
import { Paperclip, X, FileIcon, ImageIcon, Loader2, Download, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { deleteAttachment } from "@/actions/attachment"
import { useSession } from "next-auth/react"

interface Attachment {
  id: string
  name: string
  url: string
  size: number
  type: string
  userId: string
}

interface FileUploaderProps {
  taskId?: string
  sprintId?: string
  commentId?: string
  onUploadSuccess?: (attachment: Attachment) => void
  attachments?: Attachment[]
}

export function FileUploader({ taskId, sprintId, commentId, onUploadSuccess, attachments = [] }: FileUploaderProps) {
  const [uploading, setUploading] = React.useState(false)
  const { data: session } = useSession()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append("file", file)
    if (taskId) formData.append("taskId", taskId)
    if (sprintId) formData.append("sprintId", sprintId)
    if (commentId) formData.append("commentId", commentId)

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (data.success) {
        toast.success("File uploaded successfully")
        onUploadSuccess?.(data.attachment)
      } else {
        toast.error(data.error || "Upload failed")
      }
    } catch (error) {
      toast.error("An error occurred during upload")
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this attachment?")) return
    const res = await deleteAttachment(id)
    if (res.success) {
      toast.success("Attachment deleted")
    } else {
      toast.error(res.error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 cursor-pointer bg-secondary/50 hover:bg-secondary border border-border/50 px-3 py-1.5 rounded-lg text-xs font-bold transition-all">
          {uploading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Paperclip className="w-3.5 h-3.5" />
          )}
          <span>{uploading ? "Uploading..." : "Attach File"}</span>
          <input type="file" className="hidden" onChange={handleFileChange} disabled={uploading} />
        </label>
      </div>

      {attachments.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {attachments.map((file) => {
            const isImage = file.type.startsWith("image/")
            return (
              <div key={file.id} className="flex items-center gap-3 p-2 bg-background border border-border/60 rounded-xl group hover:border-primary/30 transition-all">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
                  {isImage ? (
                    <img src={file.url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <FileIcon className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold truncate">{file.name}</p>
                  <p className="text-[8px] text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a href={file.url} download className="p-1.5 hover:bg-secondary rounded-lg transition-colors" title="Download">
                    <Download className="w-3.5 h-3.5" />
                  </a>
                  {session?.user?.id === file.userId && (
                    <button onClick={() => handleDelete(file.id)} className="p-1.5 hover:bg-destructive/10 text-destructive rounded-lg transition-colors" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
