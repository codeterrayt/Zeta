"use client"

import * as React from "react"
import { User, Layers, Info } from "lucide-react"
import { cn } from "@/lib/utils"

interface BacklogTask {
  id: string
  title: string
  points: number | null
  assignee: { name: string | null; image: string | null } | null
  sprint: { name: string } | null
}

export function BacklogView({ tasks }: { tasks: BacklogTask[] }) {
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden mb-8">
      <div className="px-6 py-4 border-b border-border bg-secondary/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">Project Backlog</h2>
        </div>
        <span className="text-xs font-medium text-muted-foreground bg-background px-2 py-1 rounded-md border border-border">
          {tasks.length} items
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-xs font-bold uppercase tracking-wider text-muted-foreground bg-secondary/5">
              <th className="px-6 py-3 border-b border-border">Task ID</th>
              <th className="px-6 py-3 border-b border-border w-full">Summary</th>
              <th className="px-6 py-3 border-b border-border">Sprint</th>
              <th className="px-6 py-3 border-b border-border">Assignee</th>
              <th className="px-6 py-3 border-b border-border">Complexity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic">
                  <div className="flex flex-col items-center gap-2">
                    <Info className="w-8 h-8 opacity-20" />
                    <span>No backlog tasks found.</span>
                  </div>
                </td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr key={task.id} className="hover:bg-secondary/10 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                      OPEN-{task.id.slice(0, 6).toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium group-hover:text-primary transition-colors">{task.title}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {task.sprint ? (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-md font-medium border border-primary/20">
                        {task.sprint.name}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        {task.assignee?.image ? (
                          <img src={task.assignee.image} className="w-full h-full rounded-full" />
                        ) : (
                          <User className="w-3 h-3 text-muted-foreground" />
                        )}
                      </div>
                      <span className="text-xs truncate max-w-[100px]">{task.assignee?.name ?? "Unassigned"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {task.points ? (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">
                        {task.points}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
