"use client"

import { useState, useEffect } from "react"
import { Bot, Save, Palette, TrendingUp, ShieldCheck, Loader2, History } from "lucide-react"
import { useTheme } from "next-themes"
import { getUserSettings, updateSettings } from "@/actions/settings"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [aiEnabled, setAiEnabled] = useState(true)
  const [model, setModel] = useState("gemini-1.5-pro")
  const [highThreshold, setHighThreshold] = useState(3)
  const [mediumThreshold, setMediumThreshold] = useState(6)
  const [askTimelineComment, setAskTimelineComment] = useState(true)

  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    async function load() {
      const res = await getUserSettings()
      if (res.success && res.settings) {
        setAiEnabled(res.settings.aiEnabled)
        setModel(res.settings.aiModel)
        setHighThreshold(res.settings.highFocusMax)
        setMediumThreshold(res.settings.mediumFocusMax)
        setAskTimelineComment(res.settings.askTimelineComment)
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    const res = await updateSettings({
      highFocusMax: highThreshold,
      mediumFocusMax: mediumThreshold,
      aiEnabled,
      aiModel: model,
      askTimelineComment
    })
    if (res.success) {
      toast.success("Settings updated successfully")
    } else {
      toast.error("Failed to update settings")
    }
    setSaving(false)
  }

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-10 space-y-12">
      <header>
        <h1 className="text-4xl font-black tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2 font-medium text-lg">Manage your workspace preferences, performance thresholds, and AI integrations.</p>
      </header>

      <div className="grid grid-cols-1 gap-8">
        {/* Appearance */}
        <section className="bg-card border border-border/60 rounded-[2.5rem] shadow-sm overflow-hidden transition-all hover:shadow-xl">
          <div className="p-8 border-b border-border/40 bg-secondary/10 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black flex items-center gap-2">
                <Palette className="w-6 h-6 text-primary" />
                Appearance
              </h2>
              <p className="text-sm text-muted-foreground mt-1 font-medium">Customize the interface visual style.</p>
            </div>
          </div>

          <div className="p-8 space-y-8">
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Active Theme</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { id: "theme-jira", name: "Jira Blue", desc: "Clean, professional corporate look." },
                  { id: "theme-monaco", name: "Monaco Dark", desc: "High contrast, developer focused." }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={`p-6 rounded-2xl border-2 text-left transition-all ${theme === t.id
                        ? "border-primary bg-primary/5 ring-4 ring-primary/10"
                        : "border-border/50 hover:border-border bg-background"
                      }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold">{t.name}</span>
                      {theme === t.id && <ShieldCheck className="w-5 h-5 text-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Dashboard Performance */}
        <section className="bg-card border border-border/60 rounded-[2.5rem] shadow-sm overflow-hidden transition-all hover:shadow-xl">
          <div className="p-8 border-b border-border/40 bg-secondary/10 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-primary" />
                Performance Thresholds
              </h2>
              <p className="text-sm text-muted-foreground mt-1 font-medium">Define how the dashboard calculates your Focus Level.</p>
            </div>
          </div>

          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">High Focus Max</h3>
                  <span className="text-xs font-black text-primary bg-primary/10 px-2 py-1 rounded-lg">{highThreshold} Tasks</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={highThreshold}
                  onChange={(e) => {
                    const val = parseInt(e.target.value)
                    const gap = mediumThreshold - highThreshold
                    setHighThreshold(val)
                    setMediumThreshold(val + gap)
                  }}
                  className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <p className="text-xs text-muted-foreground font-medium italic">Maximum tasks in progress to be considered in "High Focus" state.</p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Medium Focus Max</h3>
                  <span className="text-xs font-black text-blue-500 bg-blue-500/10 px-2 py-1 rounded-lg">{mediumThreshold} Tasks</span>
                </div>
                <input
                  type="range"
                  min={highThreshold + 1}
                  max="20"
                  value={mediumThreshold}
                  onChange={(e) => setMediumThreshold(parseInt(e.target.value))}
                  className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <p className="text-xs text-muted-foreground font-medium italic">Tasks beyond this limit will mark your status as "Overloaded".</p>
              </div>
            </div>
          </div>
        </section>

        {/* AI Settings */}
        <section className="bg-card border border-border/60 rounded-[2.5rem] shadow-sm overflow-hidden transition-all hover:shadow-xl">
          <div className="p-8 border-b border-border/40 bg-secondary/10 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black flex items-center gap-2">
                <Bot className="w-6 h-6 text-primary" />
                AI Intelligence
              </h2>
              <p className="text-sm text-muted-foreground mt-1 font-medium">Configure the Gemini summarization and analysis engine.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={aiEnabled}
                onChange={(e) => setAiEnabled(e.target.checked)}
              />
              <div className="w-14 h-7 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary shadow-inner"></div>
            </label>
          </div>

          <div className={cn("p-8 transition-opacity duration-300", !aiEnabled && "opacity-40 pointer-events-none")}>
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Selected AI Engine</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", desc: "Best for complex logic and deep analysis." },
                  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", desc: "Optimized for speed and quick summaries." }
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setModel(m.id)}
                    className={`p-6 rounded-2xl border-2 text-left transition-all ${model === m.id
                        ? "border-primary bg-primary/5 ring-4 ring-primary/10"
                        : "border-border/50 hover:border-border bg-background"
                      }`}
                  >
                    <div className="font-bold mb-1">{m.name}</div>
                    <p className="text-xs text-muted-foreground font-medium">{m.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Timeline Settings */}
        <section className="bg-card border border-border/60 rounded-[2.5rem] shadow-sm overflow-hidden transition-all hover:shadow-xl">
          <div className="p-8 bg-secondary/10 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black flex items-center gap-2">
                <History className="w-6 h-6 text-primary" />
                Timeline Preferences
              </h2>
              <p className="text-sm text-muted-foreground mt-1 font-medium">Configure prompts for your task activity history.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={askTimelineComment}
                onChange={(e) => setAskTimelineComment(e.target.checked)}
              />
              <div className="w-14 h-7 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary shadow-inner"></div>
            </label>
          </div>
          <div className="p-8 border-t border-border/40">
            <p className="text-xs text-muted-foreground font-medium">When enabled, Zeta will ask you to add optional comments for changes when saving a task, helping your team understand the context behind each timeline event.</p>
          </div>
        </section>

        <div className="flex justify-end pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-3 bg-primary text-primary-foreground px-10 py-5 rounded-3xl font-black text-sm hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save All Preferences
          </button>
        </div>
      </div>
    </div>
  )
}
