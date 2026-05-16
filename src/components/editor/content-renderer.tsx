"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { FileMentionBadge } from "./file-mention-badge"

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

/**
 * Renders Tiptap HTML with live interactive FileMentionBadge components
 * replacing <span class="file-mention" data-id="..."> nodes.
 *
 * Works by:
 * 1. Injecting the raw HTML into a hidden container
 * 2. Finding all file-mention spans
 * 3. For each span, creating a React portal that mounts a FileMentionBadge into a wrapper element
 */
export function ContentRenderer({ html, attachments = [], className }: ContentRendererProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [portals, setPortals] = React.useState<React.ReactPortal[]>([])
  const [currentHtml, setCurrentHtml] = React.useState(html)

  React.useLayoutEffect(() => {
    // If the incoming HTML changed, we must clear portals first
    // to let React cleanly unmount them before we destroy their DOM containers.
    if (html !== currentHtml) {
      setPortals([])
      setCurrentHtml(html)
      return
    }

    const el = containerRef.current
    if (!el) return

    // Inject the raw HTML (safe to do now because portals are empty)
    el.innerHTML = currentHtml || ""

    if (!currentHtml) return

    // Find all file mention spans
    const spans = el.querySelectorAll<HTMLElement>("[data-type='file-mention'], .file-mention")
    
    if (spans.length === 0) return

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
  }, [html, currentHtml, attachments])

  return (
    <>
      <div
        ref={containerRef}
        className={className ?? "prose prose-sm max-w-none text-sm text-foreground/80 leading-relaxed"}
      />
      {portals}
    </>
  )
}
