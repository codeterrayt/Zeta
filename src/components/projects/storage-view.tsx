"use client"

import * as React from "react"
import { 
  Search, 
  Filter, 
  LayoutGrid, 
  List, 
  Download, 
  Eye, 
  Trash2, 
  FileIcon, 
  MoreVertical,
  User as UserIcon,
  HardDrive,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  ChevronDown,
  X,
  FileSearch,
  Type
} from "lucide-react"
import { deleteAttachment } from "@/actions/attachment"
import { toast } from "sonner"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { CustomDropdown } from "@/components/ui/custom-dropdown"
import * as DialogPrimitive from "@radix-ui/react-dialog"

type Attachment = {
  id: string
  name: string
  url: string
  type: string
  size: number
  createdAt: Date
  userId: string
  user: {
    id: string
    name: string | null
    email: string | null
    image: string | null
  }
}

export function StorageView({ 
  projectId, 
  initialAttachments 
}: { 
  projectId: string; 
  initialAttachments: Attachment[] 
}) {
  const [attachments, setAttachments] = React.useState(initialAttachments)
  const [view, setView] = React.useState<"grid" | "list">("list")
  const [search, setSearch] = React.useState("")
  const [showThumbnails, setShowThumbnails] = React.useState(false)
  
  // Filters
  const [userFilter, setUserFilter] = React.useState<string>("all")
  const [sizeFilter, setSizeFilter] = React.useState<string>("all")
  const [typeFilter, setTypeFilter] = React.useState<string>("all")

  // Preview Modal State
  const [previewFile, setPreviewFile] = React.useState<Attachment | null>(null)

  // Get unique uploaders for filter
  const uploaders = React.useMemo(() => {
    const usersMap = new Map()
    initialAttachments.forEach(a => {
      if (!usersMap.has(a.userId)) {
        usersMap.set(a.userId, a.user.name || a.user.email || "Unknown User")
      }
    })
    return [
      { value: "all", label: "All Uploaders" },
      ...Array.from(usersMap.entries()).map(([id, name]) => ({ value: id, label: name }))
    ]
  }, [initialAttachments])

  const typeOptions = [
    { value: "all", label: "All Types" },
    { value: "image", label: "Images" },
    { value: "pdf", label: "PDFs" },
    { value: "doc", label: "Documents" },
    { value: "code", label: "Code" },
    { value: "other", label: "Others" },
  ]

  const sizeOptions = [
    { value: "all", label: "Any Size" },
    { value: "small", label: "< 1MB" },
    { value: "medium", label: "1MB - 10MB" },
    { value: "large", label: "> 10MB" },
  ]

  const filteredAttachments = React.useMemo(() => {
    return attachments.filter(a => {
      const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase())
      const matchesUser = userFilter === "all" || a.userId === userFilter
      
      let matchesType = true
      if (typeFilter !== "all") {
        if (typeFilter === "image") matchesType = a.type.startsWith("image/")
        else if (typeFilter === "pdf") matchesType = a.type === "application/pdf"
        else if (typeFilter === "doc") matchesType = a.type.includes("word") || a.type.includes("sheet") || a.type.includes("presentation")
        else if (typeFilter === "code") matchesType = a.type.includes("javascript") || a.type.includes("typescript") || a.name.match(/\.(ts|js|py|go|rs|java|c|cpp)$/) !== null
        else if (typeFilter === "other") matchesType = !a.type.startsWith("image/") && a.type !== "application/pdf" && !a.type.includes("word") && !a.type.includes("sheet") && !a.type.includes("presentation")
      }

      let matchesSize = true
      if (sizeFilter !== "all") {
        const sizeInMb = a.size / (1024 * 1024)
        if (sizeFilter === "small") matchesSize = sizeInMb < 1
        if (sizeFilter === "medium") matchesSize = sizeInMb >= 1 && sizeInMb < 10
        if (sizeFilter === "large") matchesSize = sizeInMb >= 10
      }

      return matchesSearch && matchesUser && matchesSize && matchesType
    })
  }, [attachments, search, userFilter, sizeFilter, typeFilter])

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return
    const res = await deleteAttachment(id)
    if (res.success) {
      setAttachments(prev => prev.filter(a => a.id !== id))
      toast.success("File deleted successfully")
    } else {
      toast.error(res.error)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getFileEmoji = (type: string, name: string) => {
    if (type.startsWith("image/")) return "🖼️"
    if (type === "application/pdf") return "📄"
    if (type.includes("word") || name.endsWith(".doc") || name.endsWith(".docx")) return "📝"
    if (type.includes("sheet") || name.endsWith(".xls") || name.endsWith(".xlsx") || name.endsWith(".csv")) return "📊"
    if (type.includes("presentation") || name.endsWith(".ppt") || name.endsWith(".pptx")) return "📑"
    if (type.includes("zip") || name.endsWith(".zip") || name.endsWith(".rar")) return "🗜️"
    if (type.startsWith("video/")) return "🎬"
    if (type.startsWith("audio/")) return "🎵"
    if (type.includes("javascript") || type.includes("typescript") || name.match(/\.(ts|js|py|go|rs|java|c|cpp)$/)) return "💻"
    return "📎"
  }

  return (
    <div className="space-y-8 pb-10">
      <header>
        <h2 className="text-3xl font-black tracking-tight">Storage</h2>
        <p className="text-muted-foreground mt-2 font-medium">Manage all files and attachments uploaded to this project.</p>
      </header>

      {/* Toolbar */}
      <div className="bg-card border border-border/60 rounded-[2.5rem] p-6 shadow-sm flex flex-col md:flex-row gap-6 items-center justify-between transition-all hover:shadow-lg">
        <div className="flex flex-col lg:flex-row items-center gap-4 w-full lg:w-auto">
          {/* Search */}
          <div className="relative w-full lg:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <input
              type="text"
              placeholder="Search files..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-secondary/30 border border-border/50 rounded-2xl pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold placeholder:text-muted-foreground/50"
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full lg:w-auto">
            <CustomDropdown
              value={typeFilter}
              onChange={setTypeFilter}
              options={typeOptions}
              icon={Type}
              label="Type"
              className="min-w-[130px]"
            />
            <CustomDropdown
              value={userFilter}
              onChange={setUserFilter}
              options={uploaders}
              icon={UserIcon}
              label="Uploader"
              className="min-w-[150px]"
            />
            <CustomDropdown
              value={sizeFilter}
              onChange={setSizeFilter}
              options={sizeOptions}
              icon={Filter}
              label="Size"
              className="min-w-[130px]"
            />
          </div>
        </div>

        <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
          {/* Thumbnail Toggle */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative inline-flex items-center">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={showThumbnails}
                onChange={e => setShowThumbnails(e.target.checked)}
              />
              <div className="w-11 h-6 bg-secondary border border-border/60 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary transition-all"></div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground group-hover:text-foreground transition-colors">Thumbnails</span>
          </label>

          {/* View Toggle */}
          <div className="flex items-center bg-secondary/30 p-1 rounded-2xl border border-border/50">
            <button
              onClick={() => setView("grid")}
              className={cn(
                "p-2 rounded-xl transition-all",
                view === "grid" ? "bg-card text-primary shadow-lg border border-border/40" : "text-muted-foreground hover:text-foreground border border-transparent"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("list")}
              className={cn(
                "p-2 rounded-xl transition-all",
                view === "list" ? "bg-card text-primary shadow-lg border border-border/40" : "text-muted-foreground hover:text-foreground border border-transparent"
              )}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid View */}
      {view === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAttachments.map(file => {
            const canPreview = file.type.startsWith("image/") || file.type === "application/pdf"
            return (
              <div 
                key={file.id} 
                className="bg-card border border-border/60 rounded-[2.5rem] overflow-hidden group hover:shadow-2xl transition-all hover:-translate-y-1 flex flex-col"
              >
                <div className="aspect-video bg-secondary/10 relative overflow-hidden border-b border-border/40 flex items-center justify-center">
                  {showThumbnails && file.type.startsWith("image/") ? (
                    <img 
                      src={file.url} 
                      alt={file.name} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <span className="text-5xl drop-shadow-xl group-hover:scale-110 transition-transform duration-500">
                      {getFileEmoji(file.type, file.name)}
                    </span>
                  )}
                  
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                    {canPreview ? (
                      <button 
                        onClick={() => setPreviewFile(file)}
                        className="p-3 bg-white/20 hover:bg-white/40 rounded-full transition-all text-white backdrop-blur-md"
                        title="Preview"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    ) : (
                      <a 
                        href={file.url} 
                        download 
                        className="p-3 bg-white/20 hover:bg-white/40 rounded-full transition-all text-white backdrop-blur-md"
                        title="Download"
                      >
                        <Download className="w-5 h-5" />
                      </a>
                    )}
                    <a href={file.url} download className="p-3 bg-white/20 hover:bg-white/40 rounded-full transition-all text-white backdrop-blur-md">
                      <Download className="w-5 h-5" />
                    </a>
                  </div>
                </div>
                
                <div className="p-6 space-y-4 flex-1 flex flex-col">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-sm truncate leading-tight mb-1" title={file.name}>{file.name}</h3>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                      <span>{formatBytes(file.size)}</span>
                      <span className="w-1 h-1 rounded-full bg-border" />
                      <span>{file.type.split("/")[1] || "file"}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border/40">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border border-border/40 shrink-0">
                        {file.user.image ? (
                          <img src={file.user.image} className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon className="w-3 h-3 text-primary" />
                        )}
                      </div>
                      <span className="text-[10px] font-black truncate text-muted-foreground">{file.user.name || "User"}</span>
                    </div>
                    <button 
                      onClick={() => handleDelete(file.id)}
                      className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* List View */}
      {view === "list" && (
        <div className="bg-card border border-border/60 rounded-[2.5rem] overflow-hidden shadow-sm shadow-black/5">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-secondary/10 border-b border-border/40">
                  <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Name</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Uploader</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Size</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Date</th>
                  <th className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredAttachments.map(file => {
                  const canPreview = file.type.startsWith("image/") || file.type === "application/pdf"
                  return (
                    <tr key={file.id} className="group hover:bg-secondary/5 transition-colors">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-secondary/20 flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform overflow-hidden">
                            {showThumbnails && file.type.startsWith("image/") ? (
                              <img src={file.url} className="w-full h-full object-cover" />
                            ) : (
                              getFileEmoji(file.type, file.name)
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-sm truncate group-hover:text-primary transition-colors max-w-[200px]" title={file.name}>
                              {file.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">{file.type}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center overflow-hidden border border-border/40">
                            {file.user.image ? (
                              <img src={file.user.image} className="w-full h-full object-cover" />
                            ) : (
                              <UserIcon className="w-4 h-4 text-primary" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black truncate max-w-[120px]">{file.user.name || "User"}</p>
                            <p className="text-[10px] text-muted-foreground truncate max-w-[120px] font-medium">{file.user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className="text-[10px] font-black bg-secondary/30 px-3 py-1.5 rounded-xl border border-border/50 uppercase tracking-wider text-muted-foreground">
                          {formatBytes(file.size)}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <p className="text-xs font-black">{format(file.createdAt, "MMM d, yyyy")}</p>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter opacity-60">{format(file.createdAt, "h:mm a")}</p>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {canPreview && (
                            <button 
                              onClick={() => setPreviewFile(file)}
                              className="p-2 hover:bg-secondary rounded-xl transition-all text-muted-foreground hover:text-primary" 
                              title="Preview"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                          <a href={file.url} download className="p-2 hover:bg-secondary rounded-xl transition-all text-muted-foreground hover:text-primary" title="Download">
                            <Download className="w-4 h-4" />
                          </a>
                          <button 
                            onClick={() => handleDelete(file.id)}
                            className="p-2 hover:bg-destructive/10 rounded-xl transition-all text-muted-foreground hover:text-destructive" 
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredAttachments.length === 0 && (
        <div className="bg-card border border-border/60 rounded-[2.5rem] py-20 text-center space-y-6 shadow-sm">
          <div className="w-20 h-20 bg-secondary/20 rounded-full flex items-center justify-center mx-auto">
            <FileSearch className="w-10 h-10 text-muted-foreground/40" />
          </div>
          <div>
            <h3 className="text-xl font-black">No files found</h3>
            <p className="text-muted-foreground mt-2 max-w-sm mx-auto font-medium">We couldn't find any files matching your search or filters in this project.</p>
          </div>
          <button 
            onClick={() => { setSearch(""); setUserFilter("all"); setSizeFilter("all"); setTypeFilter("all"); }}
            className="text-primary font-black text-sm hover:underline uppercase tracking-[0.2em] border-b-2 border-primary/20 pb-1"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <DialogPrimitive.Root open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300" />
            <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-5xl translate-x-[-50%] translate-y-[-50%] gap-4 border border-border/60 bg-card p-0 shadow-2xl duration-300 animate-in zoom-in-95 rounded-[2.5rem] overflow-hidden">
              <div className="flex flex-col h-[85vh]">
                <div className="flex items-center justify-between p-6 border-b border-border/40 bg-secondary/10">
                  <div className="flex items-center gap-4">
                    <div className="text-2xl">{getFileEmoji(previewFile.type, previewFile.name)}</div>
                    <div>
                      <h2 className="text-lg font-black leading-none">{previewFile.name}</h2>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">
                        {previewFile.type} • {formatBytes(previewFile.size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <a 
                      href={previewFile.url} 
                      download 
                      className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-black hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </a>
                    <DialogPrimitive.Close className="p-2 hover:bg-secondary rounded-xl transition-colors">
                      <X className="w-5 h-5" />
                    </DialogPrimitive.Close>
                  </div>
                </div>

                <div className="flex-1 bg-secondary/5 flex items-center justify-center p-10 overflow-hidden">
                  {previewFile.type.startsWith("image/") ? (
                    <img 
                      src={previewFile.url} 
                      alt={previewFile.name} 
                      className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                    />
                  ) : (
                    <iframe 
                      src={previewFile.url} 
                      className="w-full h-full border-none rounded-xl bg-white shadow-2xl"
                      title={previewFile.name}
                    />
                  )}
                </div>
              </div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      )}
    </div>
  )
}
