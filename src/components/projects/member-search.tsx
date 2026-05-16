"use client"

import * as React from "react"
import { Search, UserPlus, Loader2, User } from "lucide-react"
import { searchUsers } from "@/actions/user"
import { addProjectMemberById } from "@/actions/project-members"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface UserResult {
  id: string
  name: string | null
  email: string | null
  image: string | null
}

export function MemberSearch({ projectId }: { projectId: string }) {
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<UserResult[]>([])
  const [searching, setSearching] = React.useState(false)
  const [addingId, setAddingId] = React.useState<string | null>(null)
  const [error, setError] = React.useState("")
  const router = useRouter()

  React.useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length >= 2) {
        setSearching(true)
        const users = await searchUsers(query, projectId)
        setResults(users)
        setSearching(false)
      } else {
        setResults([])
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [query])

  const handleAdd = async (userId: string) => {
    setAddingId(userId)
    setError("")
    const res = await addProjectMemberById(projectId, userId)
    setAddingId(null)
    
    if (res.success) {
      setQuery("")
      setResults([])
      router.refresh()
    } else {
      setError(res.error || "Failed to add member")
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>

      {results.length > 0 && (
        <div className="bg-card border border-border rounded-xl shadow-xl overflow-hidden max-h-[300px] overflow-y-auto custom-scrollbar">
          <div className="p-2 space-y-1">
            {results.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-2 hover:bg-secondary/50 rounded-lg transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs overflow-hidden shrink-0">
                    {user.image ? (
                      <img src={user.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      user.name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? "?"
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{user.name ?? "Unknown"}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleAdd(user.id)}
                  disabled={addingId === user.id}
                  className="p-2 rounded-md bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all disabled:opacity-50"
                >
                  {addingId === user.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <UserPlus className="w-3 h-3" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {query.length >= 2 && !searching && results.length === 0 && (
        <div className="p-8 text-center bg-secondary/10 rounded-xl border border-dashed border-border/50">
          <User className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground font-medium">No users found matching "{query}"</p>
        </div>
      )}

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-xs font-bold">
          {error}
        </div>
      )}
    </div>
  )
}
