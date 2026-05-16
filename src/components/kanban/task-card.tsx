"use client"

import { Task } from "./board"
import { cn } from "@/lib/utils"

export function TaskCard({ task, isDragging, onClick }: { task: Task; isDragging: boolean; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-card border border-border p-4 rounded-lg shadow-sm hover:border-primary/50 transition-colors cursor-grab active:cursor-grabbing",
        isDragging && "shadow-lg border-primary rotate-2"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <h4 className="font-medium text-sm leading-tight text-foreground/90">{task.title}</h4>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex gap-2 items-center">
          <span className="text-xs font-semibold text-muted-foreground bg-secondary px-2 py-0.5 rounded-sm">
            OPEN-{task.id.slice(0, 4).toUpperCase()}
          </span>
        </div>
        
        {task.points && (
          <div title="Complexity" className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-medium text-muted-foreground">
            {task.points}
          </div>
        )}
      </div>
    </div>
  )
}
