"use client"

import { useState, useEffect } from "react"
import { Bot, Save, Palette } from "lucide-react"
import { useTheme } from "next-themes"

export default function SettingsPage() {
  const [aiEnabled, setAiEnabled] = useState(true)
  const [model, setModel] = useState("gemini-1.5-pro")
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSave = () => {
    // In a real app, this would call a server action to save to Prisma
    console.log("Saved settings:", { aiEnabled, model, theme })
  }

  if (!mounted) return null

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your preferences and integrations.</p>
      </header>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden mb-8">
        <div className="p-6 border-b border-border bg-secondary/20">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            Appearance
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Customize the look and feel of your workspace.</p>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <h3 className="font-medium">Active Theme</h3>
            <select 
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full md:w-1/2 bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="theme-jira">Jira (Atlassian Blue/Clean)</option>
              <option value="theme-monaco">Monaco (VS Code Dark)</option>
            </select>
            <p className="text-xs text-muted-foreground">This updates your interface instantly.</p>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border bg-secondary/20">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            AI Integration (Gemini)
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Configure the AI summarization engine.</p>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Enable AI Features</h3>
              <p className="text-sm text-muted-foreground">Allow AI to summarize long threads and tasks.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={aiEnabled}
                onChange={(e) => setAiEnabled(e.target.checked)}
              />
              <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {aiEnabled && (
            <div className="space-y-3 pt-4 border-t border-border">
              <h3 className="font-medium">Selected Model</h3>
              <select 
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full md:w-1/2 bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (Best for complex logic)</option>
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Fastest)</option>
              </select>
              <p className="text-xs text-muted-foreground">Changes apply immediately across all your workspaces.</p>
            </div>
          )}
        </div>
        
        <div className="p-6 bg-secondary/10 border-t border-border flex justify-end">
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  )
}
