import Link from "next/link"
import { Home, Folder, ListTodo, Settings, Activity, BookOpen } from "lucide-react"

export function Sidebar() {
  return (
    <aside className="w-64 shrink-0 border-r border-border bg-card flex flex-col h-full overflow-y-auto">
      <div className="h-16 flex items-center px-6 border-b border-border">
        <h1 className="text-xl font-bold text-primary flex items-center gap-2">
          <Activity className="w-6 h-6" />
          OpenJira
        </h1>
      </div>
      
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2">Menu</div>
        
        <Link href="/" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-secondary text-foreground/80 hover:text-foreground transition-colors">
          <Home className="w-4 h-4" />
          Dashboard
        </Link>
        
        <Link href="/projects" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-secondary text-foreground/80 hover:text-foreground transition-colors">
          <Folder className="w-4 h-4" />
          Projects
        </Link>
        
        <Link href="/tasks" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-secondary text-foreground/80 hover:text-foreground transition-colors">
          <ListTodo className="w-4 h-4" />
          My Tasks
        </Link>

        <Link href="/documentation" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-secondary text-foreground/80 hover:text-foreground transition-colors">
          <BookOpen className="w-4 h-4" />
          Documentation
        </Link>
      </nav>

      <div className="p-4 border-t border-border">
        <Link href="/settings" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md hover:bg-secondary text-foreground/80 hover:text-foreground transition-colors">
          <Settings className="w-4 h-4" />
          Settings
        </Link>
      </div>
    </aside>
  )
}
