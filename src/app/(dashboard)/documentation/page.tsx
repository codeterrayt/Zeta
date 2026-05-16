"use client"

import * as React from "react"
import { BookOpen, Search, Filter, Plus, Calendar, User as UserIcon, Link as LinkIcon, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { getAllDocuments } from "@/actions/document"
import Link from "next/link"
import { useSession } from "next-auth/react"

export default function DocumentationPage() {
  const { data: session } = useSession()
  const [documents, setDocuments] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [filterType, setFilterType] = React.useState<"ALL" | "SELF" | "MENTIONED">("ALL")

  React.useEffect(() => {
    async function load() {
      const res = await getAllDocuments()
      if (res.success) {
        setDocuments(res.documents || [])
      }
      setLoading(false)
    }
    load()
  }, [])

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(search.toLowerCase()) ||
      doc.project.name.toLowerCase().includes(search.toLowerCase()) ||
      doc.taskLinks.some((l: any) => l.task.title.toLowerCase().includes(search.toLowerCase()))
    
    let matchesType = true
    if (filterType === "SELF") {
      matchesType = doc.authorId === session?.user?.id
    } else if (filterType === "MENTIONED") {
      matchesType = doc.content.includes(`data-id="${session?.user?.id}"`)
    }
    
    return matchesSearch && matchesType
  })

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 lg:p-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
            <BookOpen className="w-10 h-10 text-primary" />
            Documentation
          </h1>
          <p className="text-muted-foreground mt-1 font-medium">Knowledge base and task documentation across all projects.</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 shadow-sm flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search documentation, projects, or tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-secondary/50 border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 px-4 py-1.5 rounded-xl border bg-secondary/50 border-border">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="bg-transparent border-none outline-none text-sm font-bold cursor-pointer pr-4"
          >
            <option value="ALL">All Documents</option>
            <option value="SELF">Created by Me</option>
            <option value="MENTIONED">Mentioned Me</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-64 bg-secondary/20 rounded-2xl animate-pulse border border-border/50" />
            ))}
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center">
              <FileText className="w-10 h-10 text-muted-foreground/40" />
            </div>
            <div>
              <h3 className="text-xl font-bold">No documentation found</h3>
              <p className="text-muted-foreground">Try adjusting your filters or search terms.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-10">
            {filteredDocs.map((doc) => (
              <div key={doc.id} className="group bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/40 transition-all shadow-sm hover:shadow-xl hover:-translate-y-1 duration-300">
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-1 rounded">
                      {doc.project.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-bold">
                      {format(new Date(doc.createdAt), "MMM d, yyyy")}
                    </span>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-bold group-hover:text-primary transition-colors line-clamp-2">{doc.title}</h3>
                    <div className="flex items-center gap-2 mt-3">
                      <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center overflow-hidden border border-border">
                        {doc.author.image ? (
                          <img src={doc.author.image} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] font-bold">{doc.author.name?.[0]}</span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground font-medium">{doc.author.name}</span>
                    </div>
                  </div>

                  {doc.taskLinks.length > 0 && (
                    <div className="pt-4 border-t border-border/50 space-y-2">
                      <p className="text-[9px] font-black uppercase text-muted-foreground tracking-tighter">Linked Tasks</p>
                      <div className="flex flex-wrap gap-2">
                        {doc.taskLinks.map((link: any) => (
                          <Link
                            key={link.task.id}
                            href={`/projects/${link.task.projectId}?taskId=${link.task.id}`}
                            className="text-[10px] font-bold text-muted-foreground hover:text-primary bg-secondary/50 px-2 py-0.5 rounded transition-colors flex items-center gap-1"
                          >
                            <LinkIcon className="w-2.5 h-2.5" />
                            {link.task.title}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="px-6 py-3 bg-secondary/20 border-t border-border/50 flex justify-end">
                  <button className="text-xs font-bold text-primary hover:underline">Read Document →</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
