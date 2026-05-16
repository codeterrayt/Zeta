"use client"

import { useState, useEffect } from "react"
import { User, Save, Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react"
import { getUserProfile, updateUserProfile } from "@/actions/profile"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    async function load() {
      const res = await getUserProfile()
      if (res.success && res.user) {
        setName(res.user.name || "")
        setEmail(res.user.email || "")
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async () => {
    if (newPassword && newPassword !== confirmPassword) {
      toast.error("New passwords do not match")
      return
    }

    if (newPassword && !currentPassword) {
      toast.error("Current password is required to set a new password")
      return
    }

    setSaving(true)
    const res = await updateUserProfile({ 
      name, 
      currentPassword, 
      newPassword 
    })
    
    if (res.success) {
      toast.success("Profile updated successfully")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } else {
      toast.error(res.error || "Failed to update profile")
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
    <div className="p-6 lg:p-10 space-y-12 h-full overflow-y-auto custom-scrollbar">
      <header>
        <h1 className="text-4xl font-black tracking-tight">Profile</h1>
        <p className="text-muted-foreground mt-2 font-medium text-lg">Manage your personal information and security settings.</p>
      </header>

      <div className="grid grid-cols-1 gap-8">
        {/* Personal Information */}
        <section className="bg-card border border-border/60 rounded-[2.5rem] shadow-sm overflow-hidden transition-all hover:shadow-xl">
          <div className="p-8 border-b border-border/40 bg-secondary/10 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black flex items-center gap-2">
                <User className="w-6 h-6 text-primary" />
                Personal Information
              </h2>
              <p className="text-sm text-muted-foreground mt-1 font-medium">Update your display name and view your email.</p>
            </div>
          </div>
          
          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Full Name</h3>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full bg-secondary/30 border border-border/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium placeholder:text-muted-foreground/60"
                />
                <p className="text-xs text-muted-foreground font-medium italic">This is your public display name.</p>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Email Address</h3>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full bg-secondary/10 border border-border/30 rounded-xl pl-10 pr-4 py-3 text-sm text-muted-foreground cursor-not-allowed font-medium"
                  />
                </div>
                <p className="text-xs text-muted-foreground font-medium italic">Your email address cannot be changed.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="bg-card border border-border/60 rounded-[2.5rem] shadow-sm overflow-hidden transition-all hover:shadow-xl">
          <div className="p-8 border-b border-border/40 bg-secondary/10 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black flex items-center gap-2">
                <Lock className="w-6 h-6 text-primary" />
                Security
              </h2>
              <p className="text-sm text-muted-foreground mt-1 font-medium">Update your password to keep your account secure.</p>
            </div>
          </div>
          
          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Current Password</h3>
                <div className="relative">
                  <input
                    type={showCurrent ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full bg-secondary/30 border border-border/50 rounded-xl pl-4 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium placeholder:text-muted-foreground/60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    title={showCurrent ? "Hide password" : "Show password"}
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">New Password</h3>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full bg-secondary/30 border border-border/50 rounded-xl pl-4 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium placeholder:text-muted-foreground/60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    title={showNew ? "Hide password" : "Show password"}
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Confirm Password</h3>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full bg-secondary/30 border border-border/50 rounded-xl pl-4 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium placeholder:text-muted-foreground/60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    title={showConfirm ? "Hide password" : "Show password"}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </section>

        <div className="flex justify-end pt-4">
          <button 
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex items-center gap-3 bg-primary text-primary-foreground px-10 py-5 rounded-3xl font-black text-sm hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save Profile
          </button>
        </div>
      </div>
    </div>
  )
}
