"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Menu, X, Activity, Home, Folder, ListTodo, BookOpen, Settings, User, MessageSquare } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const NAV_LINKS = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/projects", label: "Projects", icon: Folder },
  { href: "/tasks", label: "My Tasks", icon: ListTodo },
  { href: "/documentation", label: "Documentation", icon: BookOpen },
  { href: "/chat", label: "Chat", icon: MessageSquare },
]

export function MobileSidebar() {
  const [open, setOpen] = React.useState(false)
  const pathname = usePathname()

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <button className="lg:hidden p-2 -ml-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground">
          <Menu className="w-6 h-6" />
        </button>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200" />
        <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 w-full max-w-[280px] bg-card border-r border-border p-6 shadow-2xl animate-in slide-in-from-left duration-300 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-xl font-black text-primary flex items-center gap-2">
              <Activity className="w-6 h-6" />
              Zeta
            </h1>
            <DialogPrimitive.Close asChild>
              <button className="p-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </DialogPrimitive.Close>
          </div>

          <nav className="flex-1 space-y-2">
            <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4 px-2">Menu</div>
            {NAV_LINKS.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
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

          <div className="mt-auto pt-6 border-t border-border/50 space-y-2">
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all border",
                pathname === "/profile"
                  ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                  : "hover:bg-secondary text-muted-foreground border-transparent"
              )}
            >
              <User className="w-5 h-5" />
              Profile
            </Link>
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
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
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
