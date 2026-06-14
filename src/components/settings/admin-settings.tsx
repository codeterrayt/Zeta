"use client"

import React, { useState, useEffect } from "react"
import { 
  testSmtpConnection, saveSmtpSettings, saveAiSettings, 
  getSystemSettings, sendInvitation, getInvitations, 
  revokeInvitation, toggleUserPrivilege, listSystemUsers 
} from "@/actions/mail"
import { 
  Server, Sparkles, MailPlus, UserCheck, CheckCircle2, 
  XCircle, Loader2, KeyRound, UserX 
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface AdminSettingsProps {
  currentUserId: string
  isOwner: boolean
}

export function AdminSettings({ currentUserId, isOwner }: AdminSettingsProps) {
  const [activeTab, setActiveTab] = useState<"smtp" | "ai" | "invites" | "privileges">("smtp")
  const [loading, setLoading] = useState(false)
  const [testingSmtp, setTestingSmtp] = useState(false)
  const [smtpStatus, setSmtpStatus] = useState<{ success?: boolean; error?: string } | null>(null)

  // SMTP form states
  const [smtpHost, setSmtpHost] = useState("")
  const [smtpPort, setSmtpPort] = useState(587)
  const [smtpUser, setSmtpUser] = useState("")
  const [smtpPass, setSmtpPass] = useState("")
  const [smtpFrom, setSmtpFrom] = useState("")
  const [smtpSecure, setSmtpSecure] = useState(false)

  // AI form states
  const [aiEnabled, setAiEnabled] = useState(true)
  const [aiModel, setAiModel] = useState("gemini-1.5-pro")
  const [aiApiKey, setAiApiKey] = useState("")

  // Invites states
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"USER" | "ADMIN">("USER")
  const [invites, setInvites] = useState<any[]>([])

  // Privileges states
  const [users, setUsers] = useState<any[]>([])

  // Load configuration and data
  useEffect(() => {
    async function loadConfig() {
      setLoading(true)
      const res = await getSystemSettings()
      if (res.success && res.settings) {
        const s = res.settings
        setSmtpHost(s.smtpHost || "")
        setSmtpPort(s.smtpPort || 587)
        setSmtpUser(s.smtpUser || "")
        setSmtpPass(s.smtpPass === "••••••••" ? "" : s.smtpPass || "")
        setSmtpFrom(s.smtpFrom || "")
        setSmtpSecure(s.smtpSecure || false)
        setAiEnabled(s.aiEnabled ?? true)
        setAiModel(s.aiModel || "gemini-1.5-pro")
        setAiApiKey(s.aiApiKey === "••••••••" ? "" : s.aiApiKey || "")
      }
      setLoading(false)
    }
    loadConfig()
  }, [])

  // Load invites when invites tab is active
  useEffect(() => {
    if (activeTab === "invites") {
      fetchInvites()
    } else if (activeTab === "privileges" && isOwner) {
      fetchUsers()
    }
  }, [activeTab, isOwner])

  const fetchInvites = async () => {
    const res = await getInvitations()
    if (res.success && res.invites) {
      setInvites(res.invites)
    }
  }

  const fetchUsers = async () => {
    const res = await listSystemUsers()
    if (res.success && res.users) {
      setUsers(res.users)
    }
  }

  // Test SMTP connections with Client Validation
  const handleTestSmtp = async (e: React.MouseEvent) => {
    e.preventDefault()
    setSmtpStatus(null)

    // Client-side validations
    if (!smtpHost.trim()) {
      toast.error("SMTP Host is required for testing connection.")
      return
    }
    if (!smtpPort || smtpPort <= 0 || smtpPort > 65535) {
      toast.error("Please enter a valid SMTP port (1-65535).")
      return
    }
    if (!smtpUser.trim()) {
      toast.error("SMTP Username is required for testing connection.")
      return
    }

    setTestingSmtp(true)

    const res = await testSmtpConnection({
      smtpHost: smtpHost.trim(),
      smtpPort: Number(smtpPort),
      smtpUser: smtpUser.trim(),
      smtpPass,
      smtpSecure
    })

    setTestingSmtp(false)
    if (res.success) {
      setSmtpStatus({ success: true })
      toast.success("SMTP Connection test passed!")
    } else {
      setSmtpStatus({ success: false, error: res.error })
      toast.error("SMTP Connection test failed.")
    }
  }

  // Save SMTP settings
  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!smtpHost.trim() || !smtpUser.trim() || !smtpFrom.trim()) {
      toast.error("Please fill in all required fields.")
      return
    }

    setLoading(true)

    const res = await saveSmtpSettings({
      smtpHost: smtpHost.trim(),
      smtpPort: Number(smtpPort),
      smtpUser: smtpUser.trim(),
      smtpPass,
      smtpFrom: smtpFrom.trim(),
      smtpSecure
    })

    setLoading(true)
    // Reload settings from database to properly update masked values
    const reloadRes = await getSystemSettings()
    if (reloadRes.success && reloadRes.settings) {
      const s = reloadRes.settings
      setSmtpPass(s.smtpPass === "••••••••" ? "" : s.smtpPass || "")
    }
    setLoading(false)

    if (res.success) {
      toast.success("SMTP configuration saved successfully.")
    } else {
      toast.error(res.error || "Failed to save configuration.")
    }
  }

  // Save AI settings
  const handleSaveAi = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const res = await saveAiSettings({
      aiEnabled,
      aiModel,
      aiApiKey
    })

    setLoading(true)
    const reloadRes = await getSystemSettings()
    if (reloadRes.success && reloadRes.settings) {
      setAiApiKey(reloadRes.settings.aiApiKey === "••••••••" ? "" : reloadRes.settings.aiApiKey || "")
    }
    setLoading(false)

    if (res.success) {
      toast.success("AI configurations saved successfully.")
    } else {
      toast.error(res.error || "Failed to save AI configuration.")
    }
  }

  // Send new invitation
  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) {
      toast.error("Please enter a valid email address.")
      return
    }

    setLoading(true)
    const res = await sendInvitation(inviteEmail.trim(), inviteRole)
    setLoading(false)

    if (res.success) {
      toast.success(`Invitation queued and sent to ${inviteEmail}`)
      setInviteEmail("")
      fetchInvites()
    } else {
      toast.error(res.error || "Failed to send invitation.")
    }
  }

  // Revoke invitation
  const handleRevokeInvite = async (inviteId: string) => {
    if (!confirm("Are you sure you want to revoke this invitation?")) return

    setLoading(true)
    const res = await revokeInvitation(inviteId)
    setLoading(false)

    if (res.success) {
      toast.success("Invitation revoked successfully.")
      fetchInvites()
    } else {
      toast.error(res.error || "Failed to revoke invitation.")
    }
  }

  // Toggle user admin privileges
  const handleToggleAdmin = async (targetUserId: string, makeAdmin: boolean) => {
    const text = makeAdmin 
      ? "Are you sure you want to grant this user ADMIN privileges? They will have access to SMTP and AI settings." 
      : "Are you sure you want to revoke this user's ADMIN privileges?"
      
    if (!confirm(text)) return

    setLoading(true)
    const res = await toggleUserPrivilege(targetUserId, makeAdmin)
    setLoading(false)

    if (res.success) {
      toast.success("User privilege updated successfully.")
      fetchUsers()
    } else {
      toast.error(res.error || "Failed to update user privilege.")
    }
  }

  if (loading && smtpHost === "") {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8 w-full max-w-6xl mx-auto">
      {/* Sub tabs nav */}
      <div className="flex bg-secondary/15 p-1.5 rounded-2xl w-full md:w-max gap-1">
        {[
          { id: "smtp", label: "SMTP Server", icon: Server },
          { id: "ai", label: "AI Engine", icon: Sparkles },
          { id: "invites", label: "User Invites", icon: MailPlus },
          ...(isOwner ? [{ id: "privileges", label: "Privileges", icon: UserCheck }] : [])
        ].map((t) => {
          const Icon = t.icon
          const isActive = activeTab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer select-none",
                isActive 
                  ? "bg-card text-foreground shadow-sm ring-1 ring-border/20" 
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              )}
            >
              <Icon className="w-4 h-4 text-primary" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Tab Contents */}
      <div className="transition-all duration-300">
        {/* SMTP Tab */}
        {activeTab === "smtp" && (
          <section className="bg-card border border-border/60 rounded-[2.5rem] shadow-sm overflow-hidden transition-all hover:shadow-xl">
            <div className="p-8 border-b border-border/40 bg-secondary/10 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black flex items-center gap-2">
                  <Server className="w-6 h-6 text-primary" />
                  SMTP Server Configuration
                </h2>
                <p className="text-sm text-muted-foreground mt-1 font-medium">
                  Configure outgoing mail settings for account verification, invitations, and password resets.
                </p>
              </div>
            </div>

            <div className="p-8 space-y-8">
              <form onSubmit={handleSaveSmtp} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">SMTP Host Address</label>
                    <input
                      type="text"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      placeholder="smtp.mailgun.org"
                      className="w-full bg-background border border-border/60 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">SMTP Port</label>
                    <input
                      type="number"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(Number(e.target.value))}
                      placeholder="587"
                      className="w-full bg-background border border-border/60 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">SMTP Username / Email</label>
                    <input
                      type="text"
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                      placeholder="postmaster@yourdomain.com"
                      className="w-full bg-background border border-border/60 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">SMTP Password</label>
                    <input
                      type="password"
                      value={smtpPass}
                      onChange={(e) => setSmtpPass(e.target.value)}
                      placeholder={smtpHost ? "••••••••••••••••" : "Enter Password"}
                      className="w-full bg-background border border-border/60 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Default Sender Email (From)</label>
                    <input
                      type="text"
                      value={smtpFrom}
                      onChange={(e) => setSmtpFrom(e.target.value)}
                      placeholder="Zeta Platform <noreply@zeta.com>"
                      className="w-full bg-background border border-border/60 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                      required
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-6">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={smtpSecure}
                        onChange={(e) => setSmtpSecure(e.target.checked)}
                      />
                      <div className="w-14 h-7 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                    </label>
                    <div>
                      <span className="text-sm font-bold text-foreground block">Use Secure Connection</span>
                      <span className="text-xs text-muted-foreground block">Enable SSL/TLS protocols (typically required for port 465).</span>
                    </div>
                  </div>
                </div>

                {smtpStatus && (
                  <div className={cn(
                    "p-5 rounded-2xl border text-sm flex items-start gap-3.5 shadow-sm",
                    smtpStatus.success 
                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                      : "bg-destructive/10 text-destructive border-destructive/20"
                  )}>
                    {smtpStatus.success ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                        <span className="font-medium">SMTP credentials are valid and connection was established successfully!</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <span className="font-bold block">SMTP connection failed:</span>
                          <span className="text-xs font-mono leading-tight block break-all">{smtpStatus.error}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-border/40 pt-6">
                  <button
                    type="button"
                    onClick={handleTestSmtp}
                    disabled={testingSmtp}
                    className="flex items-center gap-2 border border-border/60 hover:bg-secondary/40 px-8 py-3.5 rounded-2xl font-bold text-sm transition-all cursor-pointer disabled:opacity-50 select-none"
                  >
                    {testingSmtp ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        Testing Connection...
                      </>
                    ) : (
                      "Test Connection"
                    )}
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3.5 rounded-2xl font-black text-sm hover:bg-primary/90 transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer select-none"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Save SMTP settings
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}

        {/* AI Tab */}
        {activeTab === "ai" && (
          <section className="bg-card border border-border/60 rounded-[2.5rem] shadow-sm overflow-hidden transition-all hover:shadow-xl">
            <div className="p-8 border-b border-border/40 bg-secondary/10 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-primary" />
                  Global AI Summarization Engine
                </h2>
                <p className="text-sm text-muted-foreground mt-1 font-medium">
                  Configure global Google Gemini AI model parameters and keys.
                </p>
              </div>
            </div>

            <div className="p-8 space-y-8">
              <form onSubmit={handleSaveAi} className="space-y-8">
                <div className="flex items-center justify-between p-6 bg-secondary/10 border border-border/50 rounded-[1.5rem]">
                  <div>
                    <label className="text-sm font-black text-foreground block">Global AI Enable Status</label>
                    <span className="text-xs text-muted-foreground block mt-1">Activate or deactivate thread summaries and analysis features globally.</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={aiEnabled}
                      onChange={(e) => setAiEnabled(e.target.checked)}
                    />
                    <div className="w-14 h-7 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary shadow-inner"></div>
                  </label>
                </div>

                <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-8 transition-all duration-300", !aiEnabled && "opacity-40 pointer-events-none")}>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Gemini Model version</label>
                    <select
                      value={aiModel}
                      onChange={(e) => setAiModel(e.target.value)}
                      className="w-full bg-background border border-border/60 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                    >
                      <option value="gemini-1.5-pro">Gemini 1.5 Pro (Deep reasoning)</option>
                      <option value="gemini-1.5-flash">Gemini 1.5 Flash (Fast performance)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Google Gemini API Key</label>
                    <input
                      type="password"
                      value={aiApiKey}
                      onChange={(e) => setAiApiKey(e.target.value)}
                      placeholder={aiApiKey ? "••••••••••••••••" : "Enter Google API Key"}
                      className="w-full bg-background border border-border/60 rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="flex justify-end border-t border-border/40 pt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3.5 rounded-2xl font-black text-sm hover:bg-primary/90 transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer select-none"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Save AI settings
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}

        {/* User Invites Tab */}
        {activeTab === "invites" && (
          <section className="bg-card border border-border/60 rounded-[2.5rem] shadow-sm overflow-hidden transition-all hover:shadow-xl">
            <div className="p-8 border-b border-border/40 bg-secondary/10 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black flex items-center gap-2">
                  <MailPlus className="w-6 h-6 text-primary" />
                  Workspace Invitation Manager
                </h2>
                <p className="text-sm text-muted-foreground mt-1 font-medium">
                  Invite new collaborators to join the Zeta workspace.
                </p>
              </div>
            </div>

            <div className="p-8 space-y-8">
              <form onSubmit={handleInviteUser} className="flex flex-col md:flex-row gap-6 items-end p-6 bg-secondary/10 rounded-[1.5rem] border border-border/40">
                <div className="flex-1 w-full space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Email Address</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@yourcompany.com"
                    className="w-full bg-background border border-border/60 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                    required
                  />
                </div>
                <div className="w-full md:w-64 space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Assigned Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="w-full bg-background border border-border/60 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                  >
                    <option value="USER">User (Standard Access)</option>
                    <option value="ADMIN">Admin (Full System Settings)</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={loading || !inviteEmail}
                  className="w-full md:w-auto px-8 py-3 bg-primary hover:bg-primary/95 text-primary-foreground text-sm font-black rounded-2xl transition-all cursor-pointer disabled:opacity-50 h-[46px] shrink-0"
                >
                  Send Invitation
                </button>
              </form>

              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-muted-foreground">Pending / Sent Invites</h3>
                <div className="border border-border/60 rounded-2xl overflow-hidden bg-background">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-secondary/10 border-b border-border/60 text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                        <th className="p-4">Email</th>
                        <th className="p-4">Assigned Role</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Expiration Date</th>
                        <th className="p-4 text-right">Revocation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 text-sm">
                      {invites.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-muted-foreground italic font-medium">
                            No active invitations sent yet.
                          </td>
                        </tr>
                      ) : (
                        invites.map((invite) => {
                          const expired = new Date(invite.expiresAt) < new Date()
                          return (
                            <tr key={invite.id} className="hover:bg-secondary/10 transition-colors">
                              <td className="p-4 font-bold text-foreground">{invite.email}</td>
                              <td className="p-4">
                                <span className="px-2.5 py-1 rounded-full text-[9px] font-black bg-secondary text-muted-foreground border border-border/60 uppercase tracking-wide">
                                  {invite.role}
                                </span>
                              </td>
                              <td className="p-4">
                                {invite.isUsed ? (
                                  <span className="text-emerald-500 font-black flex items-center gap-1">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Active
                                  </span>
                                ) : expired ? (
                                  <span className="text-destructive font-black">Expired</span>
                                ) : (
                                  <span className="text-amber-500 font-black">Pending</span>
                                )}
                              </td>
                              <td className="p-4 text-muted-foreground text-xs font-medium">
                                {new Date(invite.expiresAt).toLocaleString()}
                              </td>
                              <td className="p-4 text-right">
                                <button
                                  onClick={() => handleRevokeInvite(invite.id)}
                                  className="p-2 hover:bg-destructive/15 text-muted-foreground hover:text-destructive rounded-xl transition-all cursor-pointer"
                                  title="Revoke invitation link"
                                >
                                  <UserX className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Privileges Tab (Owner Only) */}
        {activeTab === "privileges" && isOwner && (
          <section className="bg-card border border-border/60 rounded-[2.5rem] shadow-sm overflow-hidden transition-all hover:shadow-xl">
            <div className="p-8 border-b border-border/40 bg-secondary/10 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black flex items-center gap-2">
                  <UserCheck className="w-6 h-6 text-primary" />
                  Administrative Role Delegation
                </h2>
                <p className="text-sm text-muted-foreground mt-1 font-medium">
                  Authorise or revoke administrator privileges for workspace members.
                </p>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div className="border border-border/60 rounded-2xl overflow-hidden bg-background">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-secondary/10 border-b border-border/60 text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                      <th className="p-4">Member Name</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Role status</th>
                      <th className="p-4 text-right font-black">Authorisation actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-sm">
                    {users.map((user) => {
                      const isSelf = user.id === currentUserId
                      return (
                        <tr key={user.id} className="hover:bg-secondary/10 transition-colors">
                          <td className="p-4 font-bold text-foreground">
                            {user.name || "Unnamed Member"} 
                            {user.isOwner && (
                              <span className="ml-2 px-2 py-0.5 bg-primary/15 text-primary rounded-md text-[9px] font-black uppercase tracking-wider">
                                Workspace Owner
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-muted-foreground font-medium">{user.email}</td>
                          <td className="p-4">
                            <span className={cn(
                              "px-2.5 py-1 rounded-full text-[9px] font-black uppercase border tracking-wide",
                              user.role === "ADMIN" 
                                ? "bg-primary/10 text-primary border-primary/20" 
                                : "bg-secondary text-muted-foreground border-border/40"
                            )}>
                              {user.role}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            {user.isOwner || isSelf ? (
                              <span className="text-xs text-muted-foreground italic select-none font-medium px-3 py-1 bg-secondary/35 rounded-xl border border-border/20">
                                Protected System Account
                              </span>
                            ) : (
                              <button
                                onClick={() => handleToggleAdmin(user.id, user.role !== "ADMIN")}
                                className={cn(
                                  "px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer border select-none",
                                  user.role === "ADMIN" 
                                    ? "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20" 
                                    : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                                )}
                              >
                                {user.role === "ADMIN" ? "Revoke Admin" : "Authorize Admin"}
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
