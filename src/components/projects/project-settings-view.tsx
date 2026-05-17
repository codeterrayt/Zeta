"use client"

import * as React from "react"
import { UserX, UserPlus, Shield, Eye, GitBranch, Trash2, AlertTriangle } from "lucide-react"
import { addProjectMember, removeProjectMember } from "@/actions/project-members"
import { deleteProject } from "@/actions/project"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { KanbanSettings } from "./kanban-settings"
import { MemberSearch } from "./member-search"

type Member = {
  id: string
  role: string
  createdAt: Date
  user: { id: string; name: string | null; email: string | null; image: string | null }
}

type Section = {
  id: string
  name: string
  order: number
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  ADMIN: <Shield className="w-3 h-3" />,
  CONTRIBUTOR: <GitBranch className="w-3 h-3" />,
  MEMBER: <GitBranch className="w-3 h-3" />,
  VIEWER: <Eye className="w-3 h-3" />,
}

export function ProjectSettingsView({
  projectId,
  initialMembers,
  initialSections
}: {
  projectId: string;
  initialMembers: Member[];
  initialSections: Section[];
}) {
  const [members, setMembers] = React.useState(initialMembers)
  const router = useRouter()

  React.useEffect(() => {
    setMembers(initialMembers)
  }, [initialMembers])

  const { data: session } = useSession()
  const currentUserId = session?.user?.id
  const isAdmin = members.some(m => m.user.id === currentUserId && m.role === "ADMIN")


  const handleRemove = async (userId: string, name: string | null) => {
    if (!confirm(`Remove ${name ?? "this user"} from the project?`)) return
    await removeProjectMember(projectId, userId)
    router.refresh()
  }

  const handleDeleteProject = async () => {
    if (!confirm("Are you absolutely sure you want to delete this project? This action cannot be undone and all tasks, sprints, and data will be permanently deleted.")) {
      return
    }

    if (typeof window !== "undefined") {
      (window as any).__deletingProject = projectId
    }

    const res = await deleteProject(projectId)
    if (res.success) {
      router.push("/projects")
    } else {
      alert(res.error || "Failed to delete project")
      if (typeof window !== "undefined") {
        delete (window as any).__deletingProject
      }
    }
  }

  return (
    <div className="max-w-3xl space-y-8 pb-12">
      {/* Kanban Settings */}
      <KanbanSettings projectId={projectId} initialSections={initialSections} />

      {/* Add Member */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border bg-secondary/20">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Add Project Member
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Search for any registered Zeta user by name or email.
          </p>
        </div>
        <div className="p-6">
          <MemberSearch projectId={projectId} />
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

      {/* Danger Zone */}
      <div className="bg-destructive/5 border border-destructive/20 rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-destructive/20 bg-destructive/10">
          <h2 className="text-lg font-semibold text-destructive flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Danger Zone
          </h2>
          <p className="text-sm text-destructive/80 mt-1">
            Irreversible actions for this project.
          </p>
        </div>
        <div className="p-6 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">Delete this project</h3>
            <p className="text-xs text-muted-foreground">Once deleted, there is no going back. Please be certain.</p>
            {!isAdmin && (
              <p className="text-[10px] text-destructive font-bold uppercase tracking-wider mt-2">
                Only project admins can perform this operation
              </p>
            )}
          </div>
          <button
            onClick={handleDeleteProject}
            disabled={!isAdmin}
            className="bg-destructive text-destructive-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-destructive/90 transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            Delete Project
          </button>
        </div>
      </div>
    </div>
  )
}
