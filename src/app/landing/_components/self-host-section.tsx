"use client"

import { Terminal, Package, Server, CheckCircle2, ExternalLink } from "lucide-react"

const STEPS = [
  {
    step: "01",
    title: "Clone the repository",
    code: "git clone https://github.com/your-org/zeta\ncd zeta",
    icon: Package,
  },
  {
    step: "02",
    title: "Configure environment",
    code: "cp .env.example .env\n# Fill in your DB URL and auth secrets",
    icon: Terminal,
  },
  {
    step: "03",
    title: "Start with Docker",
    code: "docker compose up -d\n# App is now running on port 3000",
    icon: Server,
  },
]

export function SelfHostSection() {
  return (
    <section id="self-host" className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: text */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-widest mb-6">
              Self-Host
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-foreground mb-4 leading-tight">
              Own your data.<br />
              <span className="text-primary">No subscriptions, ever.</span>
            </h2>
            <p className="text-muted-foreground text-lg font-medium leading-relaxed mb-8">
              Zeta is MIT licensed and built to be self-hosted. Deploy on your own infrastructure in minutes using Docker Compose. No vendor lock-in, no data leaving your servers.
            </p>

            <div className="space-y-4 mb-8">
              {[
                "Full PostgreSQL database you control",
                "Docker & Docker Compose setup included",
                "Prisma ORM with migration scripts",
                "Socket.io server bundled — no third-party SaaS",
                "MIT License — fork, extend, white-label",
              ].map(item => (
                <div key={item} className="flex items-center gap-3 text-sm font-bold text-foreground/80">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  {item}
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-black hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
              >
                View Docs
                <ExternalLink className="w-4 h-4" />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3 rounded-2xl border border-border bg-card text-foreground text-sm font-black hover:bg-secondary transition-all"
              >
                GitHub →
              </a>
            </div>
          </div>

          {/* Right: steps */}
          <div className="space-y-4">
            {STEPS.map(s => {
              const Icon = s.icon
              return (
                <div
                  key={s.step}
                  className="bg-card border border-border rounded-2xl p-5 hover:border-primary/30 transition-all"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Step {s.step}</span>
                      <h3 className="font-black text-sm text-foreground">{s.title}</h3>
                    </div>
                  </div>
                  <pre className="bg-secondary/40 border border-border rounded-xl p-4 text-xs font-mono text-foreground/80 overflow-x-auto">
                    <code>{s.code}</code>
                  </pre>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
