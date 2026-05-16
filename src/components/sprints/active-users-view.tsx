"use client"

import * as React from "react"
import { User, CheckCircle2 } from "lucide-react"

type ActiveUser = {
  id: string
  name: string | null
  email: string | null
  image: string | null
  taskCount: number
}

export function ActiveUsersView({ tasks }: { tasks: any[] }) {
  // Extract unique assignees and count their tasks in this sprint
  const userMap = new Map<string, ActiveUser>()

  tasks.forEach(task => {
    if (task.assignments && task.assignments.length > 0) {
      task.assignments.forEach((assignment: any) => {
        const u = assignment.user
        if (userMap.has(u.id)) {
          userMap.get(u.id)!.taskCount += 1
        } else {
          userMap.set(u.id, {
            id: u.id,
            name: u.name,
            email: u.email,
            image: u.image,
            taskCount: 1
          })
        }
      })
    }
  })

  const activeUsers = Array.from(userMap.values()).sort((a, b) => b.taskCount - a.taskCount)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {activeUsers.length === 0 && (
        <div className="col-span-full p-12 text-center border-2 border-dashed border-border rounded-xl bg-secondary/10">
          <User className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-lg">No active users in this sprint</h3>
          <p className="text-sm text-muted-foreground">Assign tasks to project members to see them here.</p>
        </div>
      )}

      {activeUsers.map(user => (
        <div key={user.id} className="bg-card border border-border p-4 rounded-xl flex items-center gap-4 hover:border-primary/50 transition-colors shadow-sm">
          <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold uppercase text-lg">
            {user.image ? (
              <img src={user.image} alt={user.name ?? ""} className="w-full h-full rounded-full object-cover" />
            ) : (
              user.name?.[0] ?? user.email?.[0] ?? "?"
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold truncate">{user.name ?? "Unknown User"}</h4>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-500 bg-emerald-500/10 w-fit px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3" />
              {user.taskCount} {user.taskCount === 1 ? "task" : "tasks"} assigned
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
