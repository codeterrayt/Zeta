"use client"

import * as React from "react"
import { forwardRef, useImperativeHandle, useState } from "react"

function getFileIcon(type: string, name: string) {
  if (type.startsWith("image/")) return "🖼️"
  if (type === "application/pdf") return "📄"
  if (type.includes("word") || name.endsWith(".doc") || name.endsWith(".docx")) return "📝"
  if (type.includes("sheet") || name.endsWith(".xls") || name.endsWith(".xlsx") || name.endsWith(".csv")) return "📊"
  if (type.includes("presentation") || name.endsWith(".ppt") || name.endsWith(".pptx")) return "📑"
  if (type.includes("zip") || type.includes("tar") || type.includes("rar") || name.endsWith(".zip")) return "🗜️"
  if (type.startsWith("video/")) return "🎬"
  if (type.startsWith("audio/")) return "🎵"
  if (type.includes("javascript") || type.includes("typescript") || name.endsWith(".ts") || name.endsWith(".js") || name.endsWith(".py")) return "💻"
  return "📎"
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const FileMentionList = forwardRef((props: any, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = (index: number) => {
    const item = props.items[index]
    if (item) {
      props.command({ id: item.id, label: item.name })
    }
  }

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length)
        return true
      }
      if (event.key === "ArrowDown") {
        setSelectedIndex((selectedIndex + 1) % props.items.length)
        return true
      }
      if (event.key === "Enter") {
        selectItem(selectedIndex)
        return true
      }
      return false
    },
  }))

  return (
    <div className="bg-popover text-popover-foreground border border-border/50 rounded-xl shadow-2xl overflow-hidden min-w-[260px] max-w-[320px] flex flex-col p-1 z-[100] pointer-events-auto">
      <div className="px-3 py-1.5 border-b border-border/50 mb-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <span>📎</span> Attach File
        </p>
      </div>
      {props.items.length > 0 ? (
        props.items.map((item: any, index: number) => (
          <button
            key={item.id}
            onMouseDown={(e) => {
              e.preventDefault()
              selectItem(index)
            }}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors w-full text-left ${
              index === selectedIndex ? "bg-primary text-primary-foreground" : "hover:bg-secondary hover:text-foreground"
            }`}
          >
            <span className="text-lg shrink-0">{getFileIcon(item.type, item.name)}</span>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-bold truncate">{item.name}</span>
              <span className={`text-[9px] truncate ${index === selectedIndex ? "opacity-70" : "text-muted-foreground"}`}>
                {formatBytes(item.size)} · {item.user?.name || "unknown"}
              </span>
            </div>
          </button>
        ))
      ) : (
        <div className="px-3 py-4 text-xs text-muted-foreground italic text-center">
          No files uploaded yet.
          <br />
          <span className="text-[10px]">Upload a file using the 📎 button first.</span>
        </div>
      )}
    </div>
  )
})

FileMentionList.displayName = "FileMentionList"
