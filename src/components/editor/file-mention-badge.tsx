"use client"

import * as React from "react"
import { Download, Eye, FileIcon, X, Loader2 } from "lucide-react"
import tippy, { Instance } from "tippy.js"
import "tippy.js/dist/tippy.css"
import "tippy.js/animations/shift-away.css"

interface FileBadgeProps {
  id: string
  name: string
  url?: string
  type?: string
  size?: number
}

function getFileEmoji(type: string = "", name: string = "") {
  if (type.startsWith("image/")) return "🖼️"
  if (type === "application/pdf") return "📄"
  if (type.includes("word") || /\.(doc|docx)$/.test(name)) return "📝"
  if (type.includes("sheet") || /\.(xls|xlsx|csv)$/.test(name)) return "📊"
  if (type.includes("presentation") || /\.(ppt|pptx)$/.test(name)) return "📑"
  if (type.includes("zip") || /\.(zip|rar|tar|gz)$/.test(name)) return "🗜️"
  if (type.startsWith("video/")) return "🎬"
  if (type.startsWith("audio/")) return "🎵"
  if (/\.(ts|js|py|go|rs|java|c|cpp|cs|php|rb|swift)$/.test(name)) return "💻"
  return "📎"
}

function formatBytes(bytes?: number) {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

import { createPortal } from "react-dom"

export function FileMentionBadge({ id, name, url, type, size }: FileBadgeProps) {
  const badgeRef = React.useRef<HTMLSpanElement>(null)
  const tippyInstance = React.useRef<Instance | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [tippyContainer, setTippyContainer] = React.useState<HTMLElement | null>(null)
  
  const isImage = type?.startsWith("image/")
  const isPdf = type === "application/pdf"
  const canPreview = isImage || isPdf
  const emoji = getFileEmoji(type, name)

  React.useEffect(() => {
    if (!badgeRef.current || !url) return

    const container = document.createElement("div")
    container.style.display = "flex"
    setTippyContainer(container)

    tippyInstance.current = tippy(badgeRef.current, {
      content: container,
      interactive: true,
      trigger: "mouseenter focus",
      placement: "top",
      animation: "shift-away",
      theme: "light",
      maxWidth: "none",
      appendTo: () => document.body,
    })

    return () => {
      tippyInstance.current?.destroy()
    }
  }, [url])

  return (
    <>
      <span className="relative inline-block align-middle mx-0.5">
        <span
          ref={badgeRef}
          role="button"
          tabIndex={0}
          className="inline-flex items-center gap-1.5 bg-secondary border border-border/70 text-foreground px-2 py-0.5 rounded-md text-[11px] font-bold cursor-pointer hover:border-primary/50 hover:bg-secondary/80 transition-all shadow-sm"
        >
          <span className="text-xs leading-none">{emoji}</span>
          <span className="truncate max-w-[150px]">{name}</span>
          {size && <span className="text-[10px] text-muted-foreground font-normal ml-0.5">{formatBytes(size)}</span>}
        </span>
      </span>

      {tippyContainer && createPortal(
        <div className="flex flex-col bg-popover text-popover-foreground border border-border/50 rounded-xl shadow-2xl overflow-hidden min-w-[240px] max-w-[320px] pointer-events-auto">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border/50 bg-secondary/30">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base">{emoji}</span>
              <span className="text-[11px] font-bold truncate">{name}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <a
                href={url}
                download
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold hover:bg-primary/90 transition-colors"
              >
                <Download className="w-3 h-3" />
              </a>
              {canPreview && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary border border-border/50 text-[10px] font-bold hover:bg-secondary/80 text-amber-600 transition-colors"
                >
                  <Eye className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          {/* Preview area */}
          {canPreview && (
            <div 
              className="overflow-hidden flex items-center justify-center bg-secondary/20 relative group/preview" 
              style={{ minHeight: 120 }}
              onMouseEnter={(e) => e.currentTarget.focus()}
              tabIndex={-1}
            >
              {isImage ? (
                <img
                  src={url}
                  alt={name}
                  className="max-w-full max-h-48 object-contain transition-transform duration-300 group-hover/preview:scale-[1.02]"
                  onLoad={() => setLoading(false)}
                />
              ) : isPdf ? (
                <iframe
                  src={url}
                  className="w-full border-none bg-white"
                  style={{ height: 250 }}
                  title={name}
                />
              ) : null}
            </div>
          )}

          {!canPreview && (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-3 bg-secondary/10">
              <span className="text-5xl grayscale opacity-50">{emoji}</span>
              <span className="text-[11px] font-medium tracking-wide">PREVIEW NOT AVAILABLE</span>
            </div>
          )}
        </div>,
        tippyContainer
      )}
    </>
  )
}
