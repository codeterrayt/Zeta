"use client"

import Link from "next/link"
import { Home, Folder, ListTodo, Settings, Activity, BookOpen } from "lucide-react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const NAV_LINKS = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/projects", label: "Projects", icon: Folder },
  { href: "/tasks", label: "My Tasks", icon: ListTodo },
  { href: "/documentation", label: "Documentation", icon: BookOpen },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 shrink-0 border-r border-border bg-card hidden lg:flex flex-col h-full overflow-hidden">
      <div className="h-16 flex items-center px-6 border-b border-border">
        <h1 className="text-xl font-black text-primary flex items-center gap-2 tracking-tight">
          <Activity className="w-6 h-6" />
          OpenJira
        </h1>
      </div>
      
      <nav className="flex-1 p-6 space-y-2 overflow-y-auto custom-scrollbar">
        <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4 px-2">Menu</div>
        
        {NAV_LINKS.map((link) => {
          const Icon = link.icon
          const isActive = pathname === link.href
          return (
            <Link 
              key={link.href}
              href={link.href} 
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all border",
                isActive 
                  ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" 
                  : "hover:bg-secondary text-muted-foreground border-transparent"
              )}
            >
              <Icon className="w-5 h-5" />
              {link.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-6 border-t border-border/50">
        <Link 
          href="/settings" 
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all border",
            pathname === "/settings" 
              ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" 
              : "hover:bg-secondary text-muted-foreground border-transparent"
          )}
        >
          <Settings className="w-5 h-5" />
          Settings
        </Link>
      </div>
    </aside>
  )
}
