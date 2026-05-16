"use client"

import * as React from "react"
import { UserX, UserPlus, Shield, Eye, GitBranch } from "lucide-react"
import { addProjectMember, removeProjectMember } from "@/actions/project-members"
import { useRouter } from "next/navigation"

type Member = {
  id: string
  role: string
  createdAt: Date
  user: { id: string; name: string | null; email: string | null; image: string | null }
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  ADMIN: <Shield className="w-3 h-3" />,
  CONTRIBUTOR: <GitBranch className="w-3 h-3" />,
  MEMBER: <GitBranch className="w-3 h-3" />,
  VIEWER: <Eye className="w-3 h-3" />,
}

export function ProjectSettingsView({ projectId, initialMembers }: { projectId: string; initialMembers: Member[] }) {
  const [members, setMembers] = React.useState(initialMembers)
  const [email, setEmail] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")
  const [success, setSuccess] = React.useState("")
  const router = useRouter()

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")
    const res = await addProjectMember(projectId, email)
    setLoading(false)
    if (!res.success) {
      setError(res.error || "Failed to add member")
    } else {
      setSuccess(`Successfully added ${email}`)
      setEmail("")
      router.refresh()
    }
  }

  const handleRemove = async (userId: string, name: string | null) => {
    if (!confirm(`Remove ${name ?? "this user"} from the project?`)) return
    await removeProjectMember(projectId, userId)
    router.refresh()
  }

  return (
    <div className="max-w-3xl space-y-8">
      {/* Add Member */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border bg-secondary/20">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Add Project Member
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Add any registered OpenJira user by their email address.
          </p>
        </div>
        <div className="p-6">
          <form onSubmit={handleAdd} className="flex gap-3">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="user@example.com"
              className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add Member"}
            </button>
          </form>
          {error && <p className="text-destructive text-sm mt-2">{error}</p>}
          {success && <p className="text-emerald-500 text-sm mt-2">{success}</p>}
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border bg-secondary/20">
          <h2 className="text-lg font-semibold">Project Members ({members.length})</h2>
        </div>
        <div className="divide-y divide-border">
          {members.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No members yet. Add team members above.
            </div>
          )}
          {members.map(member => (
            <div key={member.id} className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-semibold text-sm uppercase">
                  {member.user.name?.[0] ?? member.user.email?.[0] ?? "?"}
                </div>
                <div>
                  <div className="font-medium text-sm">{member.user.name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{member.user.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground bg-secondary px-2 py-1 rounded-full">
                  {ROLE_ICONS[member.role] ?? null}
                  {member.role}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(member.createdAt).toLocaleDateString()}
                </span>
                <button
                  onClick={() => handleRemove(member.user.id, member.user.name)}
                  className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  title="Remove member"
                >
                  <UserX className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
