"use client"

import { useState, useEffect } from "react"
import { Search, MessageSquare } from "lucide-react"
import { MobileSidebar } from "./mobile-sidebar"
import { NotificationBell } from "./notification-bell"

export function Header() {
  const [isMac, setIsMac] = useState(false)

  // Detect OS for search placeholder text
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMac(navigator.userAgent.toLowerCase().includes("mac"))
    }
  }, [])

  const toggleChat = () => {
    window.dispatchEvent(new CustomEvent("floating-chat:toggle"))
  }

  const openSearch = () => {
    window.dispatchEvent(new CustomEvent("command-palette:open"))
  }

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 sticky top-0 z-50 w-full">
      <div className="flex-1 flex items-center gap-4">
        <MobileSidebar />
        <div className="relative w-96 hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            readOnly
            onClick={openSearch}
            placeholder={isMac ? "Search tasks, projects... (⌘K)" : "Search tasks, projects... (Ctrl+K)"}
            className="w-full bg-secondary/50 border border-border rounded-md pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:bg-background transition-colors cursor-pointer select-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={toggleChat}
          className="p-2.5 hover:bg-secondary rounded-xl transition-colors text-muted-foreground cursor-pointer animate-in fade-in"
          title="Toggle Chat Widget"
        >
          <MessageSquare className="w-5 h-5" />
        </button>
        <NotificationBell />
      </div>
    </header>
  )
}
