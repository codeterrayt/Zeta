"use client"

import * as React from "react"
import { CheckCircle2, Clock, AlertCircle, TrendingUp, BookOpen, Layers, Users, Activity, Calendar, ArrowUpRight, ArrowDownRight, MoreHorizontal, Loader2 } from "lucide-react"
import { getDashboardStats } from "@/actions/dashboard"
import { cn } from "@/lib/utils"
import { CustomDropdown } from "@/components/ui/custom-dropdown"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from "recharts"
import dynamic from "next/dynamic"
import { format, subDays } from "date-fns"

// Dynamic import for Recharts to avoid SSR issues
const NoSSRBarChart = dynamic(() => import("recharts").then(mod => mod.BarChart), { ssr: false })
const NoSSRAreaChart = dynamic(() => import("recharts").then(mod => mod.AreaChart), { ssr: false })

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]

export default function DashboardPage() {
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [filtering, setFiltering] = React.useState(false)

  // Filters
  const [selectedProjectId, setSelectedProjectId] = React.useState("ALL")
  const [selectedSprintId, setSelectedSprintId] = React.useState("ALL")

  const fetchStats = React.useCallback(async () => {
    setFiltering(true)
    const res = await getDashboardStats({
      projectId: selectedProjectId,
      sprintId: selectedSprintId
    })
    if (res.success) setData(res.stats)
    setLoading(false)
    setFiltering(false)
  }, [selectedProjectId, selectedSprintId])

  React.useEffect(() => {
    fetchStats()
  }, [fetchStats])

  if (loading) {
    return (
      <div className="p-8 space-y-8 animate-pulse">
        <div className="h-10 w-64 bg-secondary/50 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-secondary/30 rounded-[2rem]" />)}
        </div>
      </div>
    )
  }

  const stats = [
    { label: "Completed", value: data?.completedTasks || 0, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10", trend: data?.trends?.completed || 0 },
    { label: "Active Tasks", value: data?.inProgressTasks || 0, icon: Clock, color: "text-blue-500", bg: "bg-blue-500/10", trend: data?.trends?.inProgress || 0 },
    { label: "Total Tasks", value: data?.totalTasks || 0, icon: Layers, color: "text-amber-500", bg: "bg-amber-500/10", trend: data?.trends?.total || 0 },
    { label: "Total Sprints", value: data?.sprintsCount || 0, icon: Activity, color: "text-purple-500", bg: "bg-purple-500/10", trend: data?.trends?.docs || 0 },
  ]

  const availableSprints = selectedProjectId === "ALL" 
    ? [] 
    : data?.projects?.find((p: any) => p.id === selectedProjectId)?.sprints || []

  return (
    <div className="p-6 lg:p-10 space-y-10">
      {/* Header & Filters */}
      <header className="flex flex-col gap-8 relative z-50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tight mb-2">Workspace Overview</h1>
            <p className="text-muted-foreground font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4" /> {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          {filtering && <Loader2 className="w-6 h-6 animate-spin text-primary" />}
        </div>

        {/* Filter Bar */}
        <div className="bg-card/50 backdrop-blur-xl border border-border/40 p-4 rounded-[2rem] flex flex-wrap items-center gap-4 shadow-sm relative z-50">
          <CustomDropdown
            label="Project"
            value={selectedProjectId}
            onChange={(val) => {
              setSelectedProjectId(val)
              setSelectedSprintId("ALL")
            }}
            options={[
              { value: "ALL", label: "All Projects" },
              ...(data?.projects?.map((p: any) => ({ value: p.id, label: p.name })) || [])
            ]}
            icon={Layers}
            className="min-w-[220px]"
          />

          <CustomDropdown
            label="Sprint"
            value={selectedSprintId}
            onChange={setSelectedSprintId}
            options={[
              { value: "ALL", label: "All Sprints" },
              ...(availableSprints.map((s: any) => ({ value: s.id, label: s.name })) || [])
            ]}
            icon={Activity}
            disabled={selectedProjectId === "ALL"}
            className="min-w-[220px]"
          />
        </div>
      </header>

      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-card border border-border/60 rounded-[2.5rem] p-8 shadow-sm group overflow-hidden relative">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all" />
            <div className="flex items-start justify-between">
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner", stat.bg)}>
                <stat.icon className={cn("w-7 h-7", stat.color)} />
              </div>
              <div className={cn(
                "flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full",
                stat.trend > 0 ? "text-emerald-500 bg-emerald-500/10" : stat.trend < 0 ? "text-rose-500 bg-rose-500/10" : "text-muted-foreground bg-secondary"
              )}>
                {stat.trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : stat.trend < 0 ? <ArrowDownRight className="w-3 h-3" /> : null}
                {stat.trend > 0 ? `+${stat.trend}%` : `${stat.trend}%`}
              </div>
            </div>
            <div className="mt-6">
              <h3 className="text-sm font-black text-muted-foreground uppercase tracking-widest">{stat.label}</h3>
              <p className="text-4xl font-black mt-1 tracking-tight">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Performance Chart */}
        <div className="lg:col-span-2 bg-card border border-border/60 rounded-[3rem] p-10 shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-2xl font-black tracking-tight">Velocity Trend</h2>
              <p className="text-muted-foreground text-sm font-medium">Tasks completed per day over the last week</p>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.completionTrend || []}>
                <defs>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 900, color: '#1e293b' }}
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  stroke="#3b82f6"
                  strokeWidth={4}
                  fillOpacity={1}
                  fill="url(#colorCompleted)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Project Distribution */}
        <div className="bg-card border border-border/60 rounded-[3rem] p-10 shadow-sm flex flex-col">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-black tracking-tight">Project Load</h2>
            <p className="text-muted-foreground text-sm font-medium">Task distribution across workspaces</p>
          </div>
          <div className="flex-1 flex items-center justify-center min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.projectStats || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  width={100}
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }}
                />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '1rem', border: '1px solid #e2e8f0' }}
                />
                <Bar
                  dataKey="tasks"
                  fill="#3b82f6"
                  radius={[0, 8, 8, 0]}
                  barSize={24}
                >
                  {(data?.projectStats || []).map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
        {/* Recent Activity */}
        <div className="bg-card border border-border/60 rounded-[3rem] p-10 shadow-sm flex flex-col lg:col-span-1">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black tracking-tight">Activity Feed</h2>
            <Activity className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="space-y-6">
            {(data?.recentActivity || []).map((activity: any, i: number) => (
              <div key={i} className="flex gap-4 group">
                <div className="w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-all">
                  <Activity className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black truncate">{activity.title}</p>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase">{activity.project.name} • {format(new Date(activity.updatedAt), "MMM d")}</p>
                </div>
              </div>
            ))}
            {(!data?.recentActivity || data.recentActivity.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-10 font-medium">No recent activity found.</p>
            )}
          </div>
        </div>

        {/* Team Performance Card */}
        <div className="bg-primary border border-primary rounded-[3rem] p-10 shadow-2xl shadow-primary/30 lg:col-span-2 relative text-primary-foreground group/card">
          {/* Decorative Circle with its own clipping */}
          <div className="absolute inset-0 rounded-[3rem] overflow-hidden pointer-events-none">
            <div className="absolute right-0 bottom-0 w-1/2 h-1/2 bg-white/10 blur-3xl rounded-full translate-x-1/2 translate-y-1/2" />
          </div>
          
          {/* Info Button & Tooltip */}
          <div className="absolute top-8 right-8 z-30 group/info">
            <button className="p-2 hover:bg-white/10 rounded-full transition-colors border border-white/20">
              <Activity className="w-5 h-5 opacity-60 group-hover/info:opacity-100 transition-opacity" />
            </button>
            <div className="absolute right-0 top-[100%] pt-2 w-72 opacity-0 translate-y-2 pointer-events-none group-hover/info:opacity-100 group-hover/info:translate-y-0 transition-all z-40">
              <div className="bg-white text-slate-900 p-6 rounded-[2.5rem] shadow-2xl border border-slate-100">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Focus Level</h4>
                    <p className="text-xs font-medium text-slate-500 leading-relaxed">
                      Measures your workload based on active tasks. High focus means you're concentrated on {data?.thresholds?.high || 3} or fewer tasks.
                    </p>
                  </div>
                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Avg. Points</h4>
                    <p className="text-xs font-medium text-slate-500 leading-relaxed">The average story points of your completed tasks, indicating the complexity of work delivered.</p>
                  </div>
                  <div className="pt-4 border-t border-slate-100">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Velocity</h4>
                    <p className="text-xs font-medium text-slate-500 leading-relaxed">The percentage change in your task completion rate compared to the previous 7-day window.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-10 h-10" />
              <h2 className="text-3xl font-black tracking-tight">
                {data?.velocityChange && data.velocityChange > 0 
                  ? "You're crushing it!" 
                  : data?.velocityChange && data.velocityChange < 0 
                    ? "Time to refocus!" 
                    : "Steady progress!"}
              </h2>
            </div>
            <p className="text-lg opacity-80 max-w-xl font-medium leading-relaxed">
              {data?.velocityChange && data.velocityChange > 0 
                ? `Your task completion rate is up by ${data.velocityChange}% this week. Keep maintaining this velocity to finish the current sprint ahead of schedule.`
                : data?.velocityChange && data.velocityChange < 0 
                  ? `Your completion rate has slowed down by ${Math.abs(data.velocityChange)}% compared to last week. Let's tackle those blockers and get back on track.`
                  : "You're maintaining a consistent pace. Focus on your top priorities to ensure a successful sprint completion."}
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-6 py-4 flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Focus Level</span>
                <span className="text-2xl font-black">
                  {data?.inProgressTasks !== undefined ? (
                    data.inProgressTasks <= (data?.thresholds?.high || 3) 
                      ? "High" 
                      : data.inProgressTasks <= (data?.thresholds?.medium || 6) 
                        ? "Medium" 
                        : "Overloaded"
                  ) : "—"}
                </span>
              </div>
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-6 py-4 flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Avg. Points</span>
                <span className="text-2xl font-black">{data?.avgPoints || "0.0"}</span>
              </div>
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-6 py-4 flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Velocity</span>
                <span className="text-2xl font-black">
                  {data?.velocityChange && data.velocityChange > 0 ? `+${data.velocityChange}%` : `${data?.velocityChange || 0}%`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
