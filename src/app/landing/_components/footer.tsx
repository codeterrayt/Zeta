"use client"

import { Activity, GitFork, ArrowRight } from "lucide-react"
import Link from "next/link"

export function CtaSection() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <div className="bg-card border border-border rounded-3xl p-12 shadow-xl relative overflow-hidden">
          {/* Glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />

          <div className="relative">
            <div className="flex items-center justify-center gap-2 mb-6">
              <Activity className="w-8 h-8 text-primary" />
              <span className="text-3xl font-black text-foreground">Zeta</span>
            </div>

            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-foreground mb-4">
              Ready to ditch Jira?
            </h2>
            <p className="text-muted-foreground text-lg font-medium mb-10 max-w-md mx-auto">
              Self-host Zeta today — completely free, no credit card, no limits. Just great project management.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/login"
                className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-primary text-primary-foreground text-base font-black hover:bg-primary/90 transition-all shadow-xl shadow-primary/30 hover:scale-[1.02] active:scale-[0.98]"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-8 py-4 rounded-2xl border border-border bg-card text-foreground text-base font-black hover:bg-secondary transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <GitFork className="w-5 h-5" />
                Star on GitHub
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-card px-6 py-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            <span className="font-black text-foreground">Zeta</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
              Open Source · MIT License
            </span>
          </div>

          <div className="flex items-center gap-6">
            {[
              { label: "GitHub", href: "https://github.com" },
              { label: "Docs", href: "#self-host" },
              { label: "Contributing", href: "https://github.com" },
              { label: "License", href: "https://github.com" },
            ].map(link => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          <p className="text-xs text-muted-foreground font-medium">
            Built with Next.js, Prisma & Socket.io
          </p>
        </div>
      </div>
    </footer>
  )
}
