"use client"

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts"

export function WorkloadView({ tasks }: { tasks: any[] }) {
  // Group tasks by assignee and sum up complexity points
  const workloadMap = new Map<string, number>()

  tasks.forEach(task => {
    const taskPoints = task.points || 0
    
    if (!task.assignments || task.assignments.length === 0) {
      const currentPoints = workloadMap.get("Unassigned") || 0
      workloadMap.set("Unassigned", currentPoints + taskPoints)
    } else {
      task.assignments.forEach((assignment: any) => {
        const assigneeName = assignment.user.name || "Unknown"
        const currentPoints = workloadMap.get(assigneeName) || 0
        workloadMap.set(assigneeName, currentPoints + taskPoints)
      })
    }
  })

  const chartData = Array.from(workloadMap.entries()).map(([name, workload]) => ({
    name,
    workload
  })).sort((a, b) => b.workload - a.workload)

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Team Workload</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Total complexity assigned per team member.
          </p>
        </div>

        <div className="h-[400px] w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value} pts`}
                />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--secondary))' }}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend />
                <Bar
                  dataKey="workload"
                  name="Total Complexity"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                  barSize={60}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground border border-dashed border-border rounded-lg">
              No tasks have been assigned complexity yet.
            </div>
          )}
        </div>
      </div>


    </div>
  )
}
