"use client"

import { Task } from "./board"
import { cn } from "@/lib/utils"

export function TaskCard({ 
  task, 
  isDragging, 
  onClick,
  canDrag 
}: { 
  task: Task; 
  isDragging: boolean; 
  onClick?: () => void;
  canDrag?: boolean;
}) {
  const firstThree = (task.assignments || []).slice(0, 3)
  const remainingCount = (task.assignments || []).length - 3

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "OWNER": return "Primary Owner"
      case "SECONDARY_OWNER": return "Secondary Owner"
      case "POC": return "Point of Contact"
      default: return "Assignee"
    }
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-card border border-border p-4 rounded-lg shadow-sm hover:border-primary/50 transition-all group relative",
        isDragging && "shadow-lg border-primary rotate-2",
        canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h4 className="font-medium text-sm leading-tight text-foreground/90 flex-1">{task.title}</h4>
        
        <div className="flex -space-x-1.5 items-center shrink-0">
          {firstThree.map((assignment, i) => {
            const user = assignment.user
            const initials = user.name 
              ? user.name.split(" ").map(n => n[0]).join("").toUpperCase()
              : user.email?.[0]?.toUpperCase() ?? "?"
              
            return (
              <div key={user.id} className="relative group/assignee z-[10]" style={{ zIndex: 10 - i }}>
                <div className={cn(
                  "w-6 h-6 rounded-full border-2 border-card flex items-center justify-center text-[8px] font-black shrink-0 overflow-hidden",
                  assignment.role === "OWNER" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                  assignment.role === "SECONDARY_OWNER" ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                  assignment.role === "POC" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                  "bg-primary/10 text-primary border-primary/20"
                )}>
                  {user.image ? (
                    <img src={user.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                
                {/* Tooltip */}
                <div className="absolute right-0 top-full mt-2 z-[100] opacity-0 group-hover/assignee:opacity-100 transition-opacity pointer-events-none">
                  <div className="bg-popover text-popover-foreground p-2 rounded shadow-xl border border-border whitespace-nowrap min-w-[120px]">
                    <div className="text-[10px] font-black uppercase text-muted-foreground mb-0.5 tracking-tighter">
                      {getRoleLabel(assignment.role)}
                    </div>
                    <div className="text-xs font-bold">{user.name || "Unknown User"}</div>
                    <div className="text-[9px] text-muted-foreground">{user.email}</div>
                  </div>
                </div>
              </div>
            )
          })}
          {remainingCount > 0 && (
            <div className="w-6 h-6 rounded-full bg-secondary border-2 border-card flex items-center justify-center text-[8px] font-bold text-muted-foreground z-0">
              +{remainingCount}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-auto">
        <div className="flex gap-2 items-center">
          <span className="text-[10px] font-bold text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded tracking-tight">
            OPEN-{task.id.slice(0, 4).toUpperCase()}
          </span>
          {!canDrag && (
            <span className="text-[8px] font-black text-destructive/60 uppercase tracking-tighter">Locked</span>
          )}
        </div>
        
        {task.points && (
          <div title="Complexity" className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold bg-primary/5 text-primary border border-primary/10">
            {task.points}
          </div>
        )}
      </div>
    </div>
  )
}
