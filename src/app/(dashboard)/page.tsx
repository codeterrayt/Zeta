import { CheckCircle2, Clock, AlertCircle } from "lucide-react"

export default function DashboardPage() {
  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <header>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Good morning, User</h1>
        <p className="text-muted-foreground">Here is your workload and project overview for today.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Tasks Completed</p>
              <h3 className="text-2xl font-bold">12</h3>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">In Progress</p>
              <h3 className="text-2xl font-bold">5</h3>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center text-destructive">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Blocked</p>
              <h3 className="text-2xl font-bold">1</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm min-h-[400px]">
            <h2 className="text-lg font-semibold mb-4">Active Sprints & Burndown</h2>
            <div className="flex items-center justify-center h-64 border border-dashed border-border rounded-lg bg-secondary/20">
              <p className="text-muted-foreground text-sm">Burndown chart will be rendered here.</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-2 h-2 mt-2 rounded-full bg-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium">Task OPEN-144 updated</p>
                  <p className="text-xs text-muted-foreground">Status changed to In Progress</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-2 h-2 mt-2 rounded-full bg-secondary shrink-0" />
                <div>
                  <p className="text-sm font-medium">Comment on OPEN-89</p>
                  <p className="text-xs text-muted-foreground">Alice: "I will look into this."</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
