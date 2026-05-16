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
  const initials = task.assignee?.name 
    ? task.assignee.name.split(" ").map(n => n[0]).join("").toUpperCase()
    : task.assignee?.email?.[0]?.toUpperCase() ?? "?"

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
        
        {task.assignee && (
          <div className="relative group/assignee">
            <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 overflow-hidden">
              {task.assignee.image ? (
                <img src={task.assignee.image} alt="" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            
            {/* Tooltip */}
            <div className="absolute right-0 top-full mt-2 z-50 opacity-0 group-hover/assignee:opacity-100 transition-opacity pointer-events-none">
              <div className="bg-popover text-popover-foreground text-[10px] px-2 py-1 rounded shadow-xl border border-border whitespace-nowrap font-bold">
                {task.assignee.name} {task.assignee.email && `(${task.assignee.email})`}
              </div>
            </div>
          </div>
        )}
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
