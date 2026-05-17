import { GitBranch } from "lucide-react"
import Link from "next/link"

/**
 * CONFIGURATION
 * Change the GitHub repository URL here.
 */
const GITHUB_REPO_URL = "https://github.com/rohanprajapati/Zeta"

export function Footer() {
  return (
    <footer className="w-full py-8 px-6 lg:px-10 border-t border-border/40 bg-card/30 backdrop-blur-sm mt-auto relative">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 max-w-[1600px] mx-auto">
        {/* Left Side: Attribution */}
        <div className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center transition-all group-hover:scale-110 group-hover:bg-primary/10">
            <GitBranch className="w-5 h-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Crafted with Passion</p>
            <p className="text-xs font-extrabold text-muted-foreground">
              Designed & Developed by <span className="text-primary hover:underline cursor-default">Rohan Prajapati</span>
            </p>
          </div>
        </div>

        {/* Right Side: Links & Status */}
        <div className="flex items-center flex-wrap justify-center gap-6">
          <Link
            href={GITHUB_REPO_URL}
            target="_blank"
            className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-all flex items-center gap-2 group"
          >
            <div className="p-1.5 rounded-lg bg-secondary/50 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <GitBranch className="w-3.5 h-3.5" />
            </div>
            GitHub Repository
          </Link>

          <div className="h-6 w-px bg-border/40 hidden md:block" />

          <div className="flex items-center gap-2.5 px-4 py-2 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
              Open Source Project
            </span>
          </div>
        </div>
      </div>

      {/* Subtle bottom text */}
      <div className="mt-2 pt-8 border-t border-border/10 text-center">
        <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-[0.3em]">
          &copy; {new Date().getFullYear()} &bull; Zeta &bull; Built for Productivity
        </p>
      </div>
    </footer>
  )
}
