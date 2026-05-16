"use client"

import * as React from "react"
import { BookOpen, Search, Filter, Plus, Calendar, User as UserIcon, Link as LinkIcon, FileText, Layout, Milestone, ChevronDown, Edit3 } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { getAllDocuments } from "@/actions/document"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { getProjects } from "@/actions/project"

// Utility for Title Case
const toTitleCase = (str: string) => {
  return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

function CustomDropdown({ value, onChange, options, icon: Icon, label }: any) {
  const [isOpen, setIsOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const selectedOption = options.find((o: any) => o.value === value)

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all group min-w-[150px]",
          isOpen ? "bg-card border-primary shadow-lg ring-2 ring-primary/10" : "bg-secondary/30 border-border/50 hover:border-primary/30"
        )}
      >
        <Icon className={cn("w-4 h-4 transition-colors", isOpen ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
        <span className="text-sm font-bold flex-1 text-left truncate">
          {selectedOption?.label || label}
        </span>
        <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform duration-300", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 min-w-[200px] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-1.5 max-h-[300px] overflow-y-auto custom-scrollbar">
            {options.map((option: any) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 text-xs font-bold rounded-xl transition-all",
                  value === option.value 
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                    : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                {option.label}
                {value === option.value && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function DocumentationPage() {
  const { data: session } = useSession()
  const userId = (session?.user as any)?.id
  
  const [documents, setDocuments] = React.useState<any[]>([])
  const [projects, setProjects] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  
  const [search, setSearch] = React.useState("")
  const [filterType, setFilterType] = React.useState<"ALL" | "SELF" | "MENTIONED">("ALL")
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>("ALL")
  const [selectedSprintId, setSelectedSprintId] = React.useState<string>("ALL")

  React.useEffect(() => {
    async function load() {
      const [docRes, projRes] = await Promise.all([
        getAllDocuments(),
        getProjects()
      ])
      
      if (docRes.success) setDocuments(docRes.documents || [])
      if (projRes.success) setProjects(projRes.projects || [])
      
      setLoading(false)
    }
    load()
  }, [])

  const filteredDocs = documents.filter(doc => {
    // 1. Search Filter
    const matchesSearch = doc.title.toLowerCase().includes(search.toLowerCase()) ||
      doc.project.name.toLowerCase().includes(search.toLowerCase()) ||
      doc.taskLinks.some((l: any) => l.task.title.toLowerCase().includes(search.toLowerCase()))
    
    // 2. Type Filter (ALL means SELF OR MENTIONED)
    let matchesType = false
    const isSelf = doc.authorId === userId
    const isMentioned = doc.content.includes(`data-id="${userId}"`)
    
    if (filterType === "ALL") {
      matchesType = isSelf || isMentioned
    } else if (filterType === "SELF") {
      matchesType = isSelf
    } else if (filterType === "MENTIONED") {
      matchesType = isMentioned
    }
    
    // 3. Project Filter
    const matchesProject = selectedProjectId === "ALL" || doc.projectId === selectedProjectId
    
    // 4. Sprint Filter (Check if any linked task is in the selected sprint)
    const matchesSprint = selectedSprintId === "ALL" || 
      doc.taskLinks.some((l: any) => l.task.sprintId === selectedSprintId)
    
    return matchesSearch && matchesType && matchesProject && matchesSprint
  })

  // Get unique sprints for the selected project (or all if ALL selected)
  const availableSprints = React.useMemo(() => {
    const sprintsMap = new Map()
    documents.forEach(doc => {
      if (selectedProjectId !== "ALL" && doc.projectId !== selectedProjectId) return
      doc.taskLinks.forEach((link: any) => {
        if (link.task.sprint) {
          sprintsMap.set(link.task.sprint.id, link.task.sprint.name)
        }
      })
    })
    return Array.from(sprintsMap.entries()).map(([id, name]) => ({ id, name }))
  }, [documents, selectedProjectId])

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 lg:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
            <BookOpen className="w-10 h-10 text-primary" />
            Documentation
          </h1>
          <p className="text-muted-foreground mt-1 font-medium">Collaboration and knowledge base for your teams.</p>
        </div>
        
        <Link 
          href="/documentation/new"
          className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 shrink-0 w-fit"
        >
          <Plus className="w-5 h-5" />
          Create Document
        </Link>
      </div>

      {/* Filters Bar */}
      <div className="bg-card border border-border rounded-[2rem] p-4 lg:p-6 shadow-sm flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search documentation, projects, or tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-secondary/30 border border-border/50 rounded-2xl pl-12 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Access Filter */}
          <CustomDropdown
            value={filterType}
            onChange={setFilterType}
            icon={Filter}
            label="Access Filter"
            options={[
              { value: "ALL", label: "All Access" },
              { value: "SELF", label: "Created by Me" },
              { value: "MENTIONED", label: "Mentioned Me" }
            ]}
          />

          {/* Project Filter */}
          <CustomDropdown
            value={selectedProjectId}
            onChange={(val: string) => {
              setSelectedProjectId(val)
              setSelectedSprintId("ALL")
            }}
            icon={Layout}
            label="All Projects"
            options={[
              { value: "ALL", label: "All Projects" },
              ...projects.map(p => ({ value: p.id, label: p.name }))
            ]}
          />

          {/* Sprint Filter */}
          <CustomDropdown
            value={selectedSprintId}
            onChange={setSelectedSprintId}
            icon={Milestone}
            label="All Sprints"
            options={[
              { value: "ALL", label: "All Sprints" },
              ...availableSprints.map(s => ({ value: s.id, label: s.name }))
            ]}
          />
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-72 bg-secondary/20 rounded-[2.5rem] animate-pulse border border-border/50" />
            ))}
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center space-y-6">
            <div className="w-24 h-24 bg-secondary/50 rounded-full flex items-center justify-center border border-border">
              <FileText className="w-12 h-12 text-muted-foreground/30" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black tracking-tight">No results found</h3>
              <p className="text-muted-foreground max-w-sm">Try broadening your search or resetting the filters to discover more documents.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
            {filteredDocs.map((doc) => {
              const hasEditAccess = doc.authorId === userId || 
                doc.taskLinks?.some((l: any) => l.task?.assignments?.some((a: any) => a.userId === userId))
                
              return (
                <div key={doc.id} className="group flex flex-col bg-card border border-border/60 rounded-[2.5rem] overflow-hidden hover:border-primary/40 transition-all shadow-sm hover:shadow-2xl hover:-translate-y-2 duration-500">
                  <div className="p-8 space-y-6 flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <Link 
                        href={`/projects/${doc.projectId}`}
                        className="text-[10px] font-black uppercase tracking-[0.2em] text-primary bg-primary/10 px-3 py-1.5 rounded-full hover:bg-primary hover:text-white transition-all"
                      >
                        {doc.project.name}
                      </Link>
                      <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                        {format(new Date(doc.createdAt), "MMM d, yyyy")}
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      <Link 
                        href={`/documentation/${doc.id}?mode=view`}
                        target="_blank"
                        className="block group-hover:text-primary transition-colors"
                      >
                        <h3 className="text-2xl font-black leading-tight line-clamp-2">
                          {toTitleCase(doc.title)}
                        </h3>
                      </Link>
                      
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden border-2 border-background shadow-sm">
                          {doc.author.image ? (
                            <img src={doc.author.image} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold">{doc.author.name?.[0]}</span>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-black tracking-tight">{doc.author.name}</span>
                          <span className="text-[10px] text-muted-foreground font-bold uppercase">Author</span>
                        </div>
                      </div>
                    </div>

                    {doc.taskLinks.length > 0 && (
                      <div className="pt-6 border-t border-border/40 space-y-3">
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                          <LinkIcon className="w-3 h-3" /> Linked Tasks
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {doc.taskLinks.map((link: any) => (
                            <Link
                              key={link.task.id}
                              href={`/tasks/${link.task.id}`}
                              target="_blank"
                              className="text-[11px] font-bold text-muted-foreground hover:text-primary bg-secondary/40 px-3 py-1.5 rounded-xl transition-all border border-border/30 hover:border-primary/20 flex items-center gap-2"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                              {link.task.title}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="px-8 py-4 bg-secondary/10 border-t border-border/40 flex items-center justify-between">
                    <Link 
                      href={`/documentation/${doc.id}?mode=view`}
                      target="_blank"
                      className="text-xs font-black text-primary hover:tracking-widest transition-all uppercase"
                    >
                      Read Document →
                    </Link>
                    
                    {hasEditAccess && (
                      <Link
                        href={`/documentation/${doc.id}?mode=edit`}
                        target="_blank"
                        className="flex items-center gap-2 text-xs font-black text-amber-600 hover:text-amber-700 transition-colors uppercase"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
