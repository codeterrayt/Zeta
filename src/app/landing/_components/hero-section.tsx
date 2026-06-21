"use client"

import { ArrowRight, GitFork, Star } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef } from "react"

export function HeroSection() {
  const heroRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = heroRef.current
    if (!el) return
    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      el.style.setProperty("--mouse-x", `${x}%`)
      el.style.setProperty("--mouse-y", `${y}%`)
    }
    el.addEventListener("mousemove", handleMove)
    return () => el.removeEventListener("mousemove", handleMove)
  }, [])

  return (
    <section
      ref={heroRef}
      className="relative overflow-hidden min-h-[90vh] flex flex-col items-center justify-center px-6 py-24 text-center"
      style={{
        background: `radial-gradient(ellipse 60% 50% at var(--mouse-x, 50%) var(--mouse-y, 40%), hsl(var(--primary) / 0.08) 0%, transparent 70%)`,
      }}
    >
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative max-w-4xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-bold mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Star className="w-3.5 h-3.5 fill-primary" />
          Free &amp; Open Source · MIT License
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-foreground mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 leading-[1.05]">
          Project management
          <br />
          <span className="text-primary">built for developers</span>
        </h1>

        {/* Sub */}
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 font-medium animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 leading-relaxed">
          Zeta is a high-performance Jira alternative with real-time collaboration, Kanban boards, sprint planning, and a rich document editor. Self-host it for free.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <Link
            href="/login"
            className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-primary text-primary-foreground text-base font-black hover:bg-primary/90 transition-all shadow-xl shadow-primary/30 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98]"
          >
            Start for Free
            <ArrowRight className="w-5 h-5" />
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-8 py-4 rounded-2xl border border-border bg-card text-foreground text-base font-black hover:bg-secondary transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <GitFork className="w-5 h-5" />
            View on GitHub
          </a>
        </div>

        {/* Trust indicators */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
          {[
            "No credit card required",
            "No vendor lock-in",
            "100% self-hostable",
            "MIT Licensed",
          ].map((text) => (
            <div key={text} className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
              {text}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
