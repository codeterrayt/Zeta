"use client"

import {
  Kanban, Zap, Users, Globe, Lock, Cpu, MessageSquare, BookOpen,
  BarChart3, Bell
} from "lucide-react"

const FEATURES = [
  {
    icon: Kanban,
    title: "Kanban Boards",
    desc: "Real-time drag-and-drop Kanban with custom columns, complexity points, and due dates. Collaborative cursors show who's dragging what.",
    accent: "text-primary bg-primary/10 border-primary/20",
  },
  {
    icon: Zap,
    title: "Sprint Planning",
    desc: "Plan and track sprints with progress bars, velocity metrics, and backlog management. Start, complete, and archive sprints with one click.",
    accent: "text-amber-600 bg-amber-500/10 border-amber-500/20",
  },
  {
    icon: Users,
    title: "Real-time Collaboration",
    desc: "Socket.io-powered live updates. See who's online, watch tasks move, and get instant notifications — no refresh needed.",
    accent: "text-purple-600 bg-purple-500/10 border-purple-500/20",
  },
  {
    icon: BookOpen,
    title: "Rich Documentation",
    desc: "TipTap-powered editor with @mentions, #task references, file embeds, code blocks, and headings. Full wiki for every project.",
    accent: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    icon: MessageSquare,
    title: "Team Chat",
    desc: "Built-in real-time messaging per project and task. Never leave the context of your work to send a message.",
    accent: "text-sky-600 bg-sky-500/10 border-sky-500/20",
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    desc: "Get notified when tasks are assigned, comments are added, or sprint status changes. Full notification center.",
    accent: "text-rose-600 bg-rose-500/10 border-rose-500/20",
  },
  {
    icon: Lock,
    title: "Role-based Access",
    desc: "Owner, Secondary Owner, and POC roles at the task level. Project membership with invite flows.",
    accent: "text-orange-600 bg-orange-500/10 border-orange-500/20",
  },
  {
    icon: BarChart3,
    title: "Workload & Analytics",
    desc: "See workload per team member, sprint velocity charts, and task completion rates across your organization.",
    accent: "text-teal-600 bg-teal-500/10 border-teal-500/20",
  },
  {
    icon: Globe,
    title: "Self-hostable",
    desc: "Deploy with Docker or on any Node.js host. Your data stays yours. MIT license — fork, modify, contribute.",
    accent: "text-indigo-600 bg-indigo-500/10 border-indigo-500/20",
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-widest mb-4">
            Everything You Need
          </div>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-foreground mb-4">
            Built for real engineering teams
          </h2>
          <p className="text-muted-foreground text-lg font-medium max-w-xl mx-auto">
            All the features you'd expect from a premium project management tool — without the per-seat pricing.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(feature => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className="bg-card border border-border rounded-2xl p-6 hover:border-primary/30 hover:shadow-md transition-all group"
              >
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-4 ${feature.accent}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-black text-foreground mb-2 group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
