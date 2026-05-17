"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { FileMentionBadge } from "./file-mention-badge"
import { cn } from "@/lib/utils"
import { ZoomIn, ZoomOut, RotateCcw, X } from "lucide-react"

interface AttachmentMeta {
  id: string
  name: string
  url: string
  type: string
  size: number
}

interface ContentRendererProps {
  html: string
  attachments?: AttachmentMeta[]
  className?: string
}

interface ImageZoomModalProps {
  src: string
  onClose: () => void
}

function ImageZoomModal({ src, onClose }: ImageZoomModalProps) {
  const [zoom, setZoom] = React.useState(1)
  const [position, setPosition] = React.useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = React.useState(false)
  const dragStart = React.useRef({ x: 0, y: 0 })
  const containerRef = React.useRef<HTMLDivElement>(null)

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.25, 5))
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.25, 0.5))
  const handleReset = () => {
    setZoom(1)
    setPosition({ x: 0, y: 0 })
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const [mountNode, setMountNode] = React.useState<Element | null>(null)

  React.useLayoutEffect(() => {
    // Query the active Radix UI Portal layer to completely bypass focus trap and body pointer event locking
    const radixPortal = document.querySelector('[data-radix-portal]')
    setMountNode(radixPortal || document.body)
  }, [])

  // Hook non-passive scroll wheel events & lock page background scrolling
  React.useEffect(() => {
    const originalStyle = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const el = containerRef.current
    if (!el) return

    const preventDefaultWheel = (e: WheelEvent) => {
      e.preventDefault()
      const zoomFactor = 0.08
      if (e.deltaY < 0) {
        setZoom(z => Math.min(z + zoomFactor, 5))
      } else {
        setZoom(z => Math.max(z - zoomFactor, 0.5))
      }
    }

    el.addEventListener("wheel", preventDefaultWheel, { passive: false })

    return () => {
      document.body.style.overflow = originalStyle
      el.removeEventListener("wheel", preventDefaultWheel)
    }
  }, [mountNode])

  // Handle escape key to close
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  if (!mountNode) return null

  return createPortal(
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-lg flex flex-col items-center justify-center animate-in fade-in duration-200 select-none pointer-events-auto">
      {/* Header Controls */}
      <div className="absolute top-6 right-6 flex items-center gap-2.5 z-[210]">
        <div className="flex items-center gap-1.5 bg-secondary/80 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-border/40 shadow-xl">
          <button
            onClick={handleZoomOut}
            className="p-1.5 hover:bg-background/80 rounded-xl transition-colors text-muted-foreground hover:text-foreground active:scale-95 cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4.5 h-4.5" />
          </button>
          <span className="text-xs font-black text-foreground min-w-[50px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-1.5 hover:bg-background/80 rounded-xl transition-colors text-muted-foreground hover:text-foreground active:scale-95 cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4.5 h-4.5" />
          </button>
          <div className="w-px h-4 bg-border/50 mx-1" />
          <button
            onClick={handleReset}
            className="p-1.5 hover:bg-background/80 rounded-xl transition-colors text-muted-foreground hover:text-foreground active:scale-95 cursor-pointer"
            title="Reset Zoom"
          >
            <RotateCcw className="w-4.5 h-4.5" />
          </button>
        </div>

        <button
          onClick={onClose}
          className="p-3 bg-secondary/85 hover:bg-secondary rounded-2xl transition-all border border-border/40 shadow-xl hover:scale-105 active:scale-95 text-muted-foreground hover:text-foreground cursor-pointer"
          title="Close Preview (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Image Viewer Container */}
      <div 
        ref={containerRef}
        className="w-full h-full flex items-center justify-center overflow-hidden"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          cursor: isDragging ? "grabbing" : "grab"
        }}
      >
        <img
          src={src}
          alt="Preview"
          draggable="false"
          className="max-w-[90%] max-h-[85%] object-contain select-none shadow-2xl rounded-lg border border-white/5 bg-black/20"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
            transition: isDragging ? "none" : "transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)"
          }}
        />
      </div>

      {/* Footer Hint */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-secondary/70 backdrop-blur px-4 py-1.5 rounded-full border border-border/30 text-[10px] font-black uppercase tracking-wider text-muted-foreground/80 pointer-events-none shadow-lg">
        Drag to pan · Scroll wheel to zoom
      </div>
    </div>,
    mountNode
  )
}

/**
 * Renders Tiptap HTML with live interactive FileMentionBadge components
 * replacing <span class="file-mention" data-id="..."> nodes.
 *
 * Works by:
 * 1. Injecting the raw HTML into a hidden container
 * 2. Finding all file-mention spans and creating React portals for them
 * 3. Finding all image tags, constraining their sizes, and attaching interactive preview listeners
 */
export function ContentRenderer({ html, attachments = [], className }: ContentRendererProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [portals, setPortals] = React.useState<React.ReactPortal[]>([])
  const [selectedImgSrc, setSelectedImgSrc] = React.useState<string | null>(null)

  // Stringify to prevent reference-equality trigger loops
  const attachmentsKey = JSON.stringify(attachments)

  React.useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return

    // Inject the raw HTML
    el.innerHTML = html || ""

    if (!html) {
      setPortals([])
      return
    }

    // Process and style images inside the rendered content
    const images = el.querySelectorAll<HTMLImageElement>("img")
    images.forEach((img) => {
      // Limit size and add interactive preview styles
      img.className = "cursor-zoom-in hover:opacity-90 max-h-[280px] max-w-full object-contain rounded-2xl border border-border/40 my-3.5 transition-all duration-200 hover:shadow-lg hover:scale-[1.005] block"
      
      const handleImageClick = (e: MouseEvent) => {
        e.preventDefault()
        setSelectedImgSrc(img.src)
      }
      img.addEventListener("click", handleImageClick)
    })

    // Find all file mention spans
    const spans = el.querySelectorAll<HTMLElement>("[data-type='file-mention'], .file-mention")
    
    if (spans.length === 0) {
      setPortals([])
      return
    }

    const newPortals: React.ReactPortal[] = []

    spans.forEach((span, index) => {
      const fileId = span.getAttribute("data-id") || span.getAttribute("data-mention-id") || ""
      const fileName = span.getAttribute("data-label") || span.textContent?.replace(/^📎\s*/, "") || fileId

      // Look up metadata from the provided attachments list
      const meta = attachments.find(a => a.id === fileId || a.name === fileName)

      // Create a mount point in place of the span
      const mount = document.createElement("span")
      mount.className = "file-mention-mount inline-block align-middle"
      span.replaceWith(mount)

      const portal = createPortal(
        <FileMentionBadge
          key={`${fileId}-${index}`}
          id={fileId || meta?.id || ""}
          name={meta?.name || fileName}
          url={meta?.url}
          type={meta?.type}
          size={meta?.size}
        />,
        mount
      )
      newPortals.push(portal)
    })

    setPortals(newPortals)
  }, [html, attachmentsKey])

  return (
    <>
      <div
        ref={containerRef}
        className={className ?? "prose prose-sm max-w-none text-sm text-foreground/80 leading-relaxed"}
      />
      {portals}
      {selectedImgSrc && (
        <ImageZoomModal
          src={selectedImgSrc}
          onClose={() => setSelectedImgSrc(null)}
        />
      )}
    </>
  )
}
