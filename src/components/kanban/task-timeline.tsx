"use client"

import * as React from "react"
import { 
  History, 
  X, 
  User as UserIcon, 
  Clock, 
  Calendar,
  CheckCircle2,
  ArrowRight,
  Plus,
  Trash2,
  Edit3,
  RefreshCw
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { getTaskAuditLogs } from "@/actions/audit-log"

type AuditLog = {
  id: string
  action: string
  details: string
  createdAt: Date
  user: {
    id: string
    name: string | null
    image: string | null
    email: string | null
  }
}

export function TaskTimeline({ taskId, taskTitle }: { taskId: string, taskTitle: string }) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [logs, setLogs] = React.useState<AuditLog[]>([])
  const [loading, setLoading] = React.useState(false)

  const loadLogs = async () => {
    setLoading(true)
    const res = await getTaskAuditLogs(taskId)
    if (res.success) {
      setLogs(res.logs as any)
    }
    setLoading(false)
  }

  React.useEffect(() => {
    if (isOpen) {
      loadLogs()
    }
  }, [isOpen])

  const getActionIcon = (action: string) => {
    switch (action) {
      case "CREATE_TASK": return <Plus className="w-4 h-4 text-green-500" />
      case "UPDATE_STATUS": return <RefreshCw className="w-4 h-4 text-blue-500" />
      case "UPDATE_ASSIGNMENTS": return <UserIcon className="w-4 h-4 text-purple-500" />
      case "UPDATE_TASK": return <Edit3 className="w-4 h-4 text-orange-500" />
      case "UPLOAD_ATTACHMENT": return <Plus className="w-4 h-4 text-emerald-500" />
      case "DELETE_ATTACHMENT": return <Trash2 className="w-4 h-4 text-red-500" />
      case "CREATE_DOCUMENT": return <BookOpen className="w-4 h-4 text-blue-600" />
      case "UPDATE_DOCUMENT": return <Edit3 className="w-4 h-4 text-blue-600" />
      case "DELETE_DOCUMENT": return <Trash2 className="w-4 h-4 text-red-600" />
      default: return <History className="w-4 h-4 text-muted-foreground" />
    }
  }

  const getActionLabel = (action: string) => {
    return action.split("_").map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(" ")
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-secondary/50 hover:bg-secondary text-xs font-black transition-all border border-border/50 group"
      >
        <History className="w-3.5 h-3.5 group-hover:rotate-[-45deg] transition-transform duration-500" />
        Activity Timeline
      </button>

      <DialogPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm animate-in fade-in duration-300" />
          <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-[101] grid w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] gap-0 border border-border/60 bg-card p-0 shadow-2xl duration-300 animate-in zoom-in-95 rounded-[2.5rem] overflow-hidden">
            
            <div className="flex flex-col h-[70vh]">
              {/* Header */}
              <div className="p-8 border-b border-border/40 bg-secondary/5 relative">
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <History className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tight leading-none">Task Activity</h2>
                    <p className="text-muted-foreground text-sm font-medium mt-1 truncate max-w-[400px]">History for: {taskTitle}</p>
                  </div>
                </div>
                
                <DialogPrimitive.Close className="absolute right-8 top-8 p-2.5 hover:bg-secondary rounded-2xl transition-colors">
                  <X className="w-5 h-5" />
                </DialogPrimitive.Close>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {loading ? (
                  <div className="flex flex-col items-center justify-center h-full gap-4">
                    <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Loading history...</p>
                  </div>
                ) : logs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                    <div className="w-16 h-16 bg-secondary/20 rounded-full flex items-center justify-center">
                      <Clock className="w-8 h-8 text-muted-foreground/40" />
                    </div>
                    <p className="font-bold text-muted-foreground">No activity recorded for this task yet.</p>
                  </div>
                ) : (
                  <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border/60 before:to-transparent">
                    {logs.map((log, index) => (
                      <div key={log.id} className="relative flex items-start gap-8 group">
                        {/* Avatar/Indicator */}
                        <div className="relative z-10 flex items-center justify-center shrink-0 w-10 h-10 rounded-2xl bg-card border border-border/60 shadow-sm group-hover:scale-110 transition-transform">
                          {log.user.image ? (
                            <img src={log.user.image} className="w-full h-full object-cover rounded-2xl" />
                          ) : (
                            <div className="w-full h-full rounded-2xl bg-primary/10 flex items-center justify-center">
                              <span className="text-xs font-black text-primary">{(log.user.name || "U")[0].toUpperCase()}</span>
                            </div>
                          )}
                        </div>

                        {/* Content Card */}
                        <div className="flex-1 bg-secondary/5 rounded-3xl p-5 border border-border/40 hover:bg-secondary/10 transition-all hover:shadow-xl hover:shadow-black/5 group-hover:-translate-x-1 duration-300">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black">{log.user.name || "Unknown User"}</span>
                              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-background/50 border border-border/40">
                                {getActionIcon(log.action)}
                                <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                  {getActionLabel(log.action)}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(log.createdAt), "MMM d, h:mm a")}
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            {log.details.split("\n").map((line, i) => (
                              <p key={i} className="text-sm font-medium text-foreground/80 leading-relaxed pl-3 border-l-2 border-primary/20">
                                {line}
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  )
}
