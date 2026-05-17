import { Search } from "lucide-react"
import { MobileSidebar } from "./mobile-sidebar"
import { NotificationBell } from "./notification-bell"

export function Header() {
  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 sticky top-0 z-10 w-full">
      <div className="flex-1 flex items-center gap-4">
        <MobileSidebar />
        <div className="relative w-96 hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tasks, projects... (Cmd+K)"
            className="w-full bg-secondary/50 border border-border rounded-md pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:bg-background transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <NotificationBell />
      </div>
    </header>
  )
}
