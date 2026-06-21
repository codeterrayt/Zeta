"use client"

import { useState } from "react"
import { Bold, Italic, List, Heading2, AtSign, Hash, FileText, User } from "lucide-react"
import { cn } from "@/lib/utils"

const DEMO_CONTENT = [
  { type: "heading", text: "Sprint 12 – CI/CD Retrospective" },
  { type: "paragraph", text: "This sprint focused on migrating our CI pipeline to GitHub Actions and hardening our deployment process." },
  { type: "heading2", text: "What went well" },
  { type: "list", items: ["GitHub Actions integration was smooth", "Zero-downtime deploys achieved", "Test coverage increased to 87%"] },
  { type: "heading2", text: "Blockers" },
  { type: "paragraph", text: "The secrets management migration is still pending. See task " },
  { type: "mention", kind: "task", label: "#OPEN-T3B2" },
  { type: "paragraph", text: " assigned to " },
  { type: "mention", kind: "user", label: "@rohan.dev" },
]

const USERS = ["@rohan.dev", "@alice.smith", "@bob.jones", "@priya.m"]
const FILES = ["#OPEN-T3B2", "#OPEN-T4A1", "#sprint-12-goals.md", "#deploy-checklist.md"]

export function DocumentationSection() {
  const [editorText, setEditorText] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestionType, setSuggestionType] = useState<"user" | "file">("user")
  const [activeMentions, setActiveMentions] = useState<Array<{ kind: string; label: string }>>([])

  const handleInput = (val: string) => {
    setEditorText(val)
    const lastAt = val.lastIndexOf("@")
    const lastHash = val.lastIndexOf("#")
    const last = Math.max(lastAt, lastHash)
    if (last !== -1 && last === val.length - 1) {
      setSuggestionType(lastAt > lastHash ? "user" : "file")
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
    }
  }

  const addMention = (mention: string) => {
    const kind = mention.startsWith("@") ? "user" : "file"
    setActiveMentions(prev => [...prev, { kind, label: mention }])
    setEditorText(prev => prev.slice(0, -1) + mention + " ")
    setShowSuggestions(false)
  }

  const suggestions = suggestionType === "user" ? USERS : FILES

  return (
    <section id="documentation" className="py-24 px-6 bg-secondary/20">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-widest mb-4">
            Rich Documentation
          </div>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-foreground mb-4">
            Write docs that link your work
          </h2>
          <p className="text-muted-foreground text-lg font-medium max-w-xl mx-auto">
            A full-featured editor with <span className="text-primary font-black">@mentions</span> for teammates and <span className="text-primary font-black">#references</span> for tasks, files, and sprints.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Live editor mockup */}
          <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-xl">
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-5 py-3 bg-secondary/40 border-b border-border">
              <div className="w-3 h-3 rounded-full bg-destructive/60" />
              <div className="w-3 h-3 rounded-full bg-amber-400/60" />
              <div className="w-3 h-3 rounded-full bg-emerald-400/60" />
              <div className="flex items-center gap-2 ml-3 text-xs font-bold text-muted-foreground">
                <FileText className="w-3.5 h-3.5 text-primary" />
                Sprint 12 Retrospective
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-card">
              {[Bold, Italic, Heading2, List].map((Icon, i) => (
                <button
                  key={i}
                  className="p-1.5 rounded-lg hover:bg-secondary transition-all text-muted-foreground hover:text-foreground"
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              ))}
              <div className="w-px h-4 bg-border mx-1" />
              <button className="flex items-center gap-1 p-1.5 rounded-lg hover:bg-secondary transition-all text-primary text-xs font-bold">
                <AtSign className="w-3.5 h-3.5" />
                mention
              </button>
              <button className="flex items-center gap-1 p-1.5 rounded-lg hover:bg-secondary transition-all text-primary text-xs font-bold">
                <Hash className="w-3.5 h-3.5" />
                reference
              </button>
            </div>

            {/* Editor area */}
            <div className="p-6 min-h-[320px] text-sm leading-relaxed font-medium prose max-w-none">
              {DEMO_CONTENT.map((block, i) => {
                if (block.type === "heading") return (
                  <h2 key={i} className="text-lg font-black text-foreground mb-3 mt-2">{block.text}</h2>
                )
                if (block.type === "heading2") return (
                  <h3 key={i} className="text-base font-black text-foreground mb-2 mt-4">{block.text}</h3>
                )
                if (block.type === "list") return (
                  <ul key={i} className="list-disc pl-5 mb-3 space-y-1">
                    {block.items!.map((item, j) => (
                      <li key={j} className="text-foreground/80">{item}</li>
                    ))}
                  </ul>
                )
                if (block.type === "mention") return (
                  <span
                    key={i}
                    className={cn(
                      "inline-flex items-center gap-1 text-xs font-black px-2 py-0.5 rounded-full border mx-0.5",
                      block.kind === "user"
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                    )}
                  >
                    {block.kind === "user" ? <User className="w-2.5 h-2.5" /> : <Hash className="w-2.5 h-2.5" />}
                    {block.label}
                  </span>
                )
                return <span key={i} className="text-foreground/80">{block.text}</span>
              })}

              {/* Live typing area */}
              <div className="mt-6 border-t border-border/40 pt-4 relative">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Try it – type @ or # below:</p>
                <div className="relative">
                  <input
                    value={editorText}
                    onChange={e => handleInput(e.target.value)}
                    placeholder="Start typing... use @ for people, # for files"
                    className="w-full bg-transparent outline-none text-sm font-medium text-foreground placeholder:text-muted-foreground/50 py-2 border-b border-primary/20 focus:border-primary transition-colors"
                  />
                  {/* Suggestion dropdown */}
                  {showSuggestions && (
                    <div className="absolute left-0 top-full mt-1 z-20 bg-popover border border-border rounded-2xl shadow-xl overflow-hidden min-w-[200px] animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-3 py-2 border-b border-border">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                          {suggestionType === "user" ? "Team Members" : "Files & Tasks"}
                        </span>
                      </div>
                      {suggestions.map(s => (
                        <button
                          key={s}
                          onMouseDown={e => { e.preventDefault(); addMention(s) }}
                          className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm font-bold hover:bg-secondary transition-all"
                        >
                          {suggestionType === "user"
                            ? <User className="w-3.5 h-3.5 text-primary shrink-0" />
                            : <Hash className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          }
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Show added mentions */}
                {activeMentions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {activeMentions.map((m, i) => (
                      <span
                        key={i}
                        className={cn(
                          "inline-flex items-center gap-1 text-xs font-black px-2 py-0.5 rounded-full border",
                          m.kind === "user"
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        )}
                      >
                        {m.kind === "user" ? <User className="w-2.5 h-2.5" /> : <Hash className="w-2.5 h-2.5" />}
                        {m.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Feature list */}
          <div className="space-y-6">
            {[
              {
                icon: AtSign,
                title: "@mention teammates",
                desc: "Tag any member of your workspace. They'll be notified and can navigate directly to the context.",
                color: "text-primary bg-primary/10 border-primary/20",
              },
              {
                icon: Hash,
                title: "#reference tasks & files",
                desc: "Link tasks, sprints, and uploaded files inline. Everything stays connected.",
                color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
              },
              {
                icon: Bold,
                title: "Full rich-text formatting",
                desc: "Headings, bold, italic, bullet lists, blockquotes, code blocks — the full TipTap editor, identical to what's inside Zeta.",
                color: "text-amber-600 bg-amber-500/10 border-amber-500/20",
              },
              {
                icon: FileText,
                title: "Per-project wikis",
                desc: "Every project and sprint has its own documentation space. No more scattered Google Docs.",
                color: "text-purple-600 bg-purple-500/10 border-purple-500/20",
              },
            ].map(feature => {
              const Icon = feature.icon
              return (
                <div key={feature.title} className="flex gap-4 p-5 bg-card border border-border rounded-2xl hover:border-primary/30 transition-all group">
                  <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center shrink-0", feature.color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-foreground mb-1 group-hover:text-primary transition-colors">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground font-medium leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
