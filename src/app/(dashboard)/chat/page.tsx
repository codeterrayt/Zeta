"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useRealtime } from "@/components/providers/realtime-provider"
import { 
  getChatGroups, createChatGroup, renameChatGroup, 
  toggleAllowMemberRename, addChatGroupMembers, 
  removeChatGroupMember, updateMemberAdminStatus, muteChatGroup 
} from "@/actions/chat"
import { searchUsers } from "@/actions/user"
import { ChatWindow } from "@/components/chat/chat-window"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { 
  MessageSquare, Plus, Search, Settings, UserPlus, Users, 
  VolumeX, Volume2, Shield, Trash2, Edit3, X, LogOut, Check,
  ChevronRight, Sparkles, UserCheck, Key, ShieldCheck, Loader2
} from "lucide-react"
import { toast } from "sonner"

export default function ChatPage() {
  const { data: session } = useSession()
  const currentUserId = session?.user?.id
  const searchParams = useSearchParams()
  const router = useRouter()
  const { socket } = useRealtime()

  // Selected chat room
  const [activeGroupId, setActiveGroupId] = React.useState<string | null>(null)
  
  // Chats list
  const [chatGroups, setChatGroups] = React.useState<any[]>([])
  const [searchQuery, setSearchQuery] = React.useState("")
  const [loading, setLoading] = React.useState(true)

  // Modals state
  const [showCreateModal, setShowCreateModal] = React.useState(false)
  const [showAddMemberModal, setShowAddMemberModal] = React.useState(false)
  const [showMuteModal, setShowMuteModal] = React.useState(false)

  // Creation form state
  const [newChatName, setNewChatName] = React.useState("")
  const [isGroupType, setIsGroupType] = React.useState(false)
  const [selectedUserIds, setSelectedUserIds] = React.useState<string[]>([])
  const [userSearchText, setUserSearchText] = React.useState("")
  const [searchedUsers, setSearchedUsers] = React.useState<any[]>([])
  const [creating, setCreating] = React.useState(false)

  // Add members state
  const [addMembersSearchText, setAddMembersSearchText] = React.useState("")
  const [addMembersSearchedUsers, setAddMembersSearchedUsers] = React.useState<any[]>([])
  const [addMembersSelectedIds, setAddMembersSelectedIds] = React.useState<string[]>([])
  const [addingMembers, setAddingMembers] = React.useState(false)

  // Group settings/details column states
  const [editingName, setEditingName] = React.useState(false)
  const [renameValue, setRenameValue] = React.useState("")
  const [showCustomMuteDate, setShowCustomMuteDate] = React.useState(false)
  const [customMuteDate, setCustomMuteDate] = React.useState("")

  // Active chat details
  const activeGroup = React.useMemo(() => {
    return chatGroups.find(cg => cg.id === activeGroupId)
  }, [chatGroups, activeGroupId])

  const loadGroups = React.useCallback(async () => {
    setLoading(true)
    const res = await getChatGroups()
    if (res.success && res.groups) {
      setChatGroups(res.groups)
    }
    setLoading(false)
  }, [])

  React.useEffect(() => {
    loadGroups()
  }, [loadGroups])

  // Check query params on mount/change to auto-select a group
  React.useEffect(() => {
    const chatGroupId = searchParams.get("chatGroupId")
    if (chatGroupId) {
      setActiveGroupId(chatGroupId)
    }
  }, [searchParams])

  // Real-time updates for the list of chats
  React.useEffect(() => {
    if (!socket) return

    const handleMessageReceivedGlobal = (data: any) => {
      // Refresh chat list to show last message
      loadGroups()
    }

    const handleGroupUpdatedGlobal = (group: any) => {
      setChatGroups(prev => {
        const exists = prev.some(g => g.id === group.id)
        if (exists) {
          return prev.map(g => g.id === group.id ? { ...g, ...group } : g)
        }
        return [group, ...prev]
      })
    }

    const handleGroupRemovedGlobal = (data: any) => {
      setChatGroups(prev => prev.filter(g => g.id !== data.chatGroupId))
      if (activeGroupId === data.chatGroupId) {
        setActiveGroupId(null)
      }
    }

    socket.on("chat_message_received", handleMessageReceivedGlobal)
    socket.on("chat_group_updated_global", handleGroupUpdatedGlobal)
    socket.on("chat_group_removed_global", handleGroupRemovedGlobal)

    return () => {
      socket.off("chat_message_received", handleMessageReceivedGlobal)
      socket.off("chat_group_updated_global", handleGroupUpdatedGlobal)
      socket.off("chat_group_removed_global", handleGroupRemovedGlobal)
    }
  }, [socket, activeGroupId, loadGroups])

  // User search for new chat creation
  React.useEffect(() => {
    if (userSearchText.trim().length < 2) {
      setSearchedUsers([])
      return
    }
    const timer = setTimeout(async () => {
      const users = await searchUsers(userSearchText)
      // Exclude logged in user
      setSearchedUsers(users.filter((u: any) => u.id !== currentUserId))
    }, 300)
    return () => clearTimeout(timer)
  }, [userSearchText, currentUserId])

  // User search for adding members
  React.useEffect(() => {
    if (addMembersSearchText.trim().length < 2) {
      setAddMembersSearchedUsers([])
      return
    }
    const timer = setTimeout(async () => {
      const users = await searchUsers(addMembersSearchText)
      // Exclude logged in user and existing members
      const existingIds = activeGroup?.members?.map((m: any) => m.userId) || []
      setAddMembersSearchedUsers(users.filter((u: any) => u.id !== currentUserId && !existingIds.includes(u.id)))
    }, 300)
    return () => clearTimeout(timer)
  }, [addMembersSearchText, activeGroup, currentUserId])

  // Create Chat/Group Handler
  const handleCreateChat = async () => {
    if (isGroupType && !newChatName.trim()) {
      toast.error("Please provide a group name")
      return
    }
    if (selectedUserIds.length === 0) {
      toast.error("Please select at least one participant")
      return
    }

    setCreating(true)
    const res = await createChatGroup(
      isGroupType ? newChatName : null,
      selectedUserIds,
      isGroupType
    )

    if (res.success && res.group) {
      toast.success(isGroupType ? "Group created successfully" : "Direct chat started")
      setShowCreateModal(false)
      setNewChatName("")
      setSelectedUserIds([])
      setUserSearchText("")
      await loadGroups()
      setActiveGroupId(res.group.id)
    } else {
      toast.error(res.error || "Failed to create chat")
    }
    setCreating(false)
  }

  // Rename Group Handler
  const handleRenameGroup = async () => {
    if (!activeGroupId || !renameValue.trim()) return
    const res = await renameChatGroup(activeGroupId, renameValue)
    if (res.success) {
      toast.success("Group renamed successfully")
      setEditingName(false)
      await loadGroups()
    } else {
      toast.error(res.error || "Failed to rename group")
    }
  }

  // Toggle Rename Permissions settings
  const handleToggleRenameSetting = async (allow: boolean) => {
    if (!activeGroupId) return
    const res = await toggleAllowMemberRename(activeGroupId, allow)
    if (res.success) {
      toast.success(allow ? "Anyone can now rename the group" : "Only admins/owner can rename the group")
      await loadGroups()
    } else {
      toast.error(res.error || "Failed to change permission")
    }
  }

  // Add group members handler
  const handleAddMembers = async () => {
    if (!activeGroupId || addMembersSelectedIds.length === 0) return
    setAddingMembers(true)
    const res = await addChatGroupMembers(activeGroupId, addMembersSelectedIds)
    if (res.success) {
      toast.success("Members added successfully")
      setShowAddMemberModal(false)
      setAddMembersSelectedIds([])
      setAddMembersSearchText("")
      await loadGroups()
    } else {
      toast.error(res.error || "Failed to add members")
    }
    setAddingMembers(false)
  }

  // Demote or promote admin status
  const handleUpdateAdmin = async (targetUserId: string, isAdmin: boolean) => {
    if (!activeGroupId) return
    const res = await updateMemberAdminStatus(activeGroupId, targetUserId, isAdmin)
    if (res.success) {
      toast.success(isAdmin ? "Member promoted to admin" : "Admin status revoked")
      await loadGroups()
    } else {
      toast.error(res.error || "Failed to change admin role")
    }
  }

  // Remove member or Leave group
  const handleRemoveMember = async (targetUserId: string) => {
    if (!activeGroupId) return
    const isSelf = targetUserId === currentUserId
    const confirmMsg = isSelf 
      ? "Are you sure you want to leave this group?" 
      : "Are you sure you want to remove this participant?"

    if (!confirm(confirmMsg)) return

    const res = await removeChatGroupMember(activeGroupId, targetUserId)
    if (res.success) {
      toast.success(isSelf ? "You have left the group" : "Participant removed")
      if (isSelf) {
        setActiveGroupId(null)
      }
      await loadGroups()
    } else {
      toast.error(res.error || "Failed to remove member")
    }
  }

  // Mute Group handler
  const handleMuteChat = async (durationType: any) => {
    if (!activeGroupId) return
    
    if (durationType === "custom" && !showCustomMuteDate) {
      setShowCustomMuteDate(true)
      return
    }

    const res = await muteChatGroup(
      activeGroupId, 
      durationType, 
      durationType === "custom" ? customMuteDate : undefined
    )

    if (res.success) {
      toast.success(durationType === "unmute" ? "Conversation unmuted" : "Conversation muted")
      setShowMuteModal(false)
      setShowCustomMuteDate(false)
      setCustomMuteDate("")
      await loadGroups()
    } else {
      toast.error(res.error || "Mute failed")
    }
  }

  // Render last message excerpt safely
  const renderLastMessage = (group: any) => {
    const lastMsg = group.messages?.[0]
    if (!lastMsg) return <span className="italic">No messages yet</span>
    
    const plainText = lastMsg.content.replace(/<[^>]*>/g, "")
    const text = lastMsg.isDeleted 
      ? "[Deleted by the Sender]" 
      : plainText.length > 20 
        ? plainText.substring(0, 20) + "..." 
        : plainText
    
    const sender = lastMsg.senderId === currentUserId ? "You: " : `${lastMsg.sender?.name || 'Someone'}: `
    return (
      <span className="truncate block">
        <strong className="text-foreground/80 font-bold">{sender}</strong>
        <span className={lastMsg.isDeleted ? "italic opacity-60" : ""}>{text}</span>
      </span>
    )
  }

  const getFilteredGroups = () => {
    return chatGroups.filter(g => {
      const name = g.isGroup 
        ? g.name 
        : g.members.find((m: any) => m.userId !== currentUserId)?.user?.name || "Direct Chat"
      return name?.toLowerCase().includes(searchQuery.toLowerCase())
    })
  }

  const getChatPartnerName = (group: any) => {
    if (!group) return "Chat"
    if (group.isGroup) return group.name || "Group Chat"
    const partner = group.members?.find((m: any) => m.userId !== currentUserId)
    return partner?.user?.name || partner?.user?.email || "Direct Chat"
  }

  const getChatPartnerImage = (group: any) => {
    if (!group || group.isGroup) return null
    const partner = group.members?.find((m: any) => m.userId !== currentUserId)
    return partner?.user?.image
  }

  const isMuted = (group: any) => {
    if (!group || !group.members) return false
    const currentMember = group.members.find((m: any) => m.userId === currentUserId)
    return !!(currentMember?.mutedUntil && new Date(currentMember.mutedUntil) > new Date())
  }

  const getAdminStatus = () => {
    if (!activeGroup || !activeGroup.members) return { isOwner: false, isAdmin: false }
    const currentMember = activeGroup.members.find((m: any) => m.userId === currentUserId)
    return {
      isOwner: activeGroup.ownerId === currentUserId,
      isAdmin: !!currentMember?.isAdmin
    }
  }

  const { isOwner, isAdmin } = getAdminStatus()

  return (
    <div className="flex-1 flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
      {/* COLUMN 1: Sidebar list */}
      <div className="w-80 shrink-0 border-r border-border bg-card flex flex-col h-full">
        <div className="p-4 border-b border-border space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Conversations
            </h2>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="p-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl transition-all cursor-pointer"
              title="Start Chat / Create Group"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search chat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-secondary/35 border border-border rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:bg-background transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
          ) : getFilteredGroups().length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground italic">
              No conversations found. Start one!
            </div>
          ) : (
            getFilteredGroups().map((group) => {
              const active = group.id === activeGroupId
              const muted = isMuted(group)
              const avatar = getChatPartnerImage(group)
              const name = getChatPartnerName(group)

              return (
                <button
                  key={group.id}
                  onClick={() => {
                    setActiveGroupId(group.id)
                    router.push(`/chat?chatGroupId=${group.id}`)
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all border text-left cursor-pointer ${
                    active 
                      ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/10" 
                      : "hover:bg-secondary/50 text-muted-foreground border-transparent"
                  }`}
                >
                  <div className="relative shrink-0">
                    {avatar ? (
                      <img src={avatar} alt="" className="w-10 h-10 rounded-full object-cover border border-border" />
                    ) : (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm uppercase ${
                        active ? "bg-primary-foreground/20 text-white" : "bg-primary/10 text-primary"
                      }`}>
                        {group.isGroup ? <Users className="w-4 h-4" /> : name[0]}
                      </div>
                    )}
                    {muted && (
                      <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 border border-border">
                        <VolumeX className="w-3 h-3 text-destructive" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className={`font-black text-xs truncate ${active ? "text-white" : "text-foreground"}`}>{name}</span>
                    </div>
                    <div className={`text-[10px] truncate ${active ? "text-white/80" : "text-muted-foreground"}`}>
                      {renderLastMessage(group)}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* COLUMN 2: Chat window (Center) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-border">
        {activeGroupId ? (
          <ChatWindow chatGroupId={activeGroupId} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground gap-3">
            <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center text-primary shadow-inner">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <p className="font-black text-foreground">Select a conversation</p>
              <p className="text-xs max-w-[280px] mt-1">Choose an existing chat thread or create a new group to start pair programming discussions.</p>
            </div>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="mt-2 flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-xs font-black rounded-xl hover:bg-primary/95 transition-all cursor-pointer shadow-lg shadow-primary/15"
            >
              <Plus className="w-4 h-4" /> Start New Chat
            </button>
          </div>
        )}
      </div>

      {/* COLUMN 3: Settings panel (Right) */}
      {activeGroupId && activeGroup && (
        <div className="w-72 shrink-0 bg-card flex flex-col h-full overflow-y-auto p-4 space-y-6 custom-scrollbar">
          <div className="text-center pb-4 border-b border-border">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-xl mb-3 shadow-inner">
              {activeGroup.isGroup ? <Users className="w-6 h-6" /> : getChatPartnerName(activeGroup)[0]}
            </div>
            
            {editingName ? (
              <div className="flex gap-1.5 mt-2">
                <input 
                  type="text" 
                  value={renameValue} 
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="flex-1 text-xs border border-border rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button onClick={handleRenameGroup} className="p-1 bg-emerald-500 text-white rounded hover:bg-emerald-600">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setEditingName(false)} className="p-1 bg-secondary text-foreground rounded hover:bg-secondary/80">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-1.5 group/title">
                <h3 className="font-black text-sm truncate max-w-[180px]">{getChatPartnerName(activeGroup)}</h3>
                {activeGroup.isGroup && (isOwner || isAdmin || activeGroup.allowMemberRename) && (
                  <button 
                    onClick={() => {
                      setRenameValue(activeGroup.name || "")
                      setEditingName(true)
                    }}
                    className="p-1 rounded text-muted-foreground hover:bg-secondary opacity-0 group-hover/title:opacity-100 transition-opacity"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
            <p className="text-[10px] text-muted-foreground mt-1">
              {activeGroup.isGroup ? "Group Chat" : "Private Chat"}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Options</h4>
            
            <button 
              onClick={() => setShowMuteModal(true)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-secondary/60 text-xs font-bold text-muted-foreground transition-all"
            >
              <span className="flex items-center gap-2">
                {isMuted(activeGroup) ? <VolumeX className="w-4 h-4 text-destructive" /> : <Volume2 className="w-4 h-4 text-primary" />}
                {isMuted(activeGroup) ? "Muted" : "Mute Notifications"}
              </span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            {activeGroup.isGroup && (isOwner || isAdmin) && (
              <button 
                onClick={() => setShowAddMemberModal(true)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-secondary/60 text-xs font-bold text-muted-foreground transition-all"
              >
                <span className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-primary" />
                  Add Participants
                </span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}

            {activeGroup.isGroup && !isOwner && (
              <button 
                onClick={() => handleRemoveMember(currentUserId || "")}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-destructive/10 text-xs font-bold text-destructive transition-all"
              >
                <span className="flex items-center gap-2">
                  <LogOut className="w-4 h-4" />
                  Leave Group
                </span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Permissions (Owner Only) */}
          {activeGroup.isGroup && isOwner && (
            <div className="space-y-2 border-t border-border pt-4">
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1">Permissions</h4>
              <div className="flex items-center justify-between px-3 py-1 text-xs">
                <span className="text-muted-foreground">Members can rename</span>
                <input 
                  type="checkbox" 
                  checked={activeGroup.allowMemberRename}
                  onChange={(e) => handleToggleRenameSetting(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-0 focus:ring-offset-0 shrink-0"
                />
              </div>
            </div>
          )}

          {/* Participants List */}
          {activeGroup.isGroup && (
            <div className="space-y-3 border-t border-border pt-4 flex-1">
              <div className="flex justify-between items-center px-1">
                <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Participants</h4>
                <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-full font-bold">{activeGroup.members.length}</span>
              </div>

              <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar p-1">
                {activeGroup.members.map((member: any) => {
                  const isUserOwner = activeGroup.ownerId === member.userId
                  const isUserAdmin = member.isAdmin
                  const isTargetSelf = member.userId === currentUserId

                  return (
                    <div key={member.id} className="flex items-center justify-between gap-2 p-1.5 hover:bg-secondary/30 rounded-xl transition-all">
                      <div className="flex items-center gap-2 min-w-0">
                        {member.user.image ? (
                          <img src={member.user.image} alt="" className="w-6 h-6 rounded-full object-cover shrink-0 border border-border" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-secondary text-[10px] font-bold flex items-center justify-center uppercase shrink-0">
                            {member.user.name?.[0] || member.user.email?.[0]}
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] font-bold truncate">
                            {member.user.name || member.user.email}
                            {isTargetSelf && <span className="text-[9px] opacity-60 ml-1 font-normal">(you)</span>}
                          </span>
                          <span className="text-[8px] text-muted-foreground flex items-center gap-1 font-semibold">
                            {isUserOwner ? (
                              <span className="text-amber-500 flex items-center gap-0.5 font-bold"><Key className="w-2.5 h-2.5" /> Owner</span>
                            ) : isUserAdmin ? (
                              <span className="text-primary flex items-center gap-0.5"><ShieldCheck className="w-2.5 h-2.5" /> Admin</span>
                            ) : (
                              <span>Member</span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Controls */}
                      {isOwner && !isUserOwner && (
                        <div className="flex gap-0.5">
                          <button 
                            onClick={() => handleUpdateAdmin(member.userId, !isUserAdmin)}
                            className="p-1 hover:bg-primary/15 rounded text-muted-foreground hover:text-primary transition-all shrink-0 cursor-pointer"
                            title={isUserAdmin ? "Revoke Admin" : "Make Admin"}
                          >
                            <Shield className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={() => handleRemoveMember(member.userId)}
                            className="p-1 hover:bg-destructive/15 rounded text-muted-foreground hover:text-destructive transition-all shrink-0 cursor-pointer"
                            title="Remove Member"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {isAdmin && !isOwner && !isUserOwner && !isUserAdmin && (
                        <button 
                          onClick={() => handleRemoveMember(member.userId)}
                          className="p-1 hover:bg-destructive/15 rounded text-muted-foreground hover:text-destructive transition-all shrink-0 cursor-pointer"
                          title="Remove Member"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CREATE CHAT / GROUP DIALOG */}
      <DialogPrimitive.Root open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[99999] bg-background/80 backdrop-blur-sm animate-in fade-in duration-200" />
          <DialogPrimitive.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[99999] w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in duration-300">
            <div className="flex justify-between items-center">
              <DialogPrimitive.Title className="text-base font-black tracking-tight">
                New Conversation
              </DialogPrimitive.Title>
              <DialogPrimitive.Close className="p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground">
                <X className="w-4 h-4" />
              </DialogPrimitive.Close>
            </div>

            <div className="flex border-b border-border">
              <button 
                onClick={() => setIsGroupType(false)}
                className={`flex-1 pb-2 text-xs font-black border-b-2 transition-all cursor-pointer ${!isGroupType ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
              >
                1-1 Private Chat
              </button>
              <button 
                onClick={() => setIsGroupType(true)}
                className={`flex-1 pb-2 text-xs font-black border-b-2 transition-all cursor-pointer ${isGroupType ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
              >
                Group Chat
              </button>
            </div>

            {isGroupType && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Group Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Frontend Development"
                  value={newChatName}
                  onChange={(e) => setNewChatName(e.target.value)}
                  className="w-full bg-secondary/30 border border-border rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Add Participants</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Search users by name or email..."
                  value={userSearchText}
                  onChange={(e) => setUserSearchText(e.target.value)}
                  className="w-full bg-secondary/30 border border-border rounded-xl pl-9 pr-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Searched Users List */}
              {searchedUsers.length > 0 && (
                <div className="max-h-[150px] overflow-y-auto border border-border/70 rounded-xl p-1 bg-secondary/15 space-y-0.5 custom-scrollbar">
                  {searchedUsers.map((user) => {
                    const selected = selectedUserIds.includes(user.id)
                    return (
                      <button
                        key={user.id}
                        onClick={() => {
                          if (selected) {
                            setSelectedUserIds(prev => prev.filter(id => id !== user.id))
                          } else {
                            if (!isGroupType) {
                              // 1-1 chat supports only 1 recipient
                              setSelectedUserIds([user.id])
                            } else {
                              setSelectedUserIds(prev => [...prev, user.id])
                            }
                          }
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors text-left ${
                          selected ? "bg-primary/10 text-primary" : "hover:bg-secondary/60 text-muted-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-secondary overflow-hidden flex items-center justify-center shrink-0 border border-border text-[8px] font-bold">
                            {user.image ? <img src={user.image} alt="" className="w-full h-full object-cover" /> : user.name?.[0] || user.email?.[0]}
                          </div>
                          <span>{user.name || user.email}</span>
                        </div>
                        {selected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Selected Members Chips */}
            {selectedUserIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 py-1 border-t border-border/30">
                {chatGroups.length > 0 && selectedUserIds.map((id) => {
                  // Find name from searched list or state
                  const foundUser = searchedUsers.find(u => u.id === id)
                  return (
                    <div key={id} className="flex items-center gap-1 bg-primary/10 text-primary text-[10px] font-bold px-2.5 py-1 rounded-full border border-primary/20">
                      <span>{foundUser?.name || "Selected User"}</span>
                      <button 
                        onClick={() => setSelectedUserIds(prev => prev.filter(uid => uid !== id))}
                        className="hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            <button
              onClick={handleCreateChat}
              disabled={creating || selectedUserIds.length === 0}
              className={`w-full py-2.5 bg-primary text-primary-foreground font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center cursor-pointer ${
                creating || selectedUserIds.length === 0 ? "opacity-50 pointer-events-none" : "hover:bg-primary/95 shadow-primary/15 hover:scale-[1.01]"
              }`}
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Conversation"}
            </button>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* ADD PARTICIPANTS DIALOG */}
      <DialogPrimitive.Root open={showAddMemberModal} onOpenChange={setShowAddMemberModal}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[99999] bg-background/80 backdrop-blur-sm animate-in fade-in duration-200" />
          <DialogPrimitive.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[99999] w-full max-w-sm bg-card border border-border rounded-2xl p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in duration-300">
            <div className="flex justify-between items-center">
              <DialogPrimitive.Title className="text-base font-black tracking-tight">
                Add Participants
              </DialogPrimitive.Title>
              <DialogPrimitive.Close className="p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground">
                <X className="w-4 h-4" />
              </DialogPrimitive.Close>
            </div>

            <div className="flex flex-col gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Search users..."
                  value={addMembersSearchText}
                  onChange={(e) => setAddMembersSearchText(e.target.value)}
                  className="w-full bg-secondary/30 border border-border rounded-xl pl-9 pr-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Searched list */}
              {addMembersSearchedUsers.length > 0 && (
                <div className="max-h-[180px] overflow-y-auto border border-border/70 rounded-xl p-1 bg-secondary/15 space-y-0.5 custom-scrollbar">
                  {addMembersSearchedUsers.map((user) => {
                    const selected = addMembersSelectedIds.includes(user.id)
                    return (
                      <button
                        key={user.id}
                        onClick={() => {
                          if (selected) {
                            setAddMembersSelectedIds(prev => prev.filter(id => id !== user.id))
                          } else {
                            setAddMembersSelectedIds(prev => [...prev, user.id])
                          }
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors text-left ${
                          selected ? "bg-primary/10 text-primary" : "hover:bg-secondary/60 text-muted-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-secondary overflow-hidden flex items-center justify-center shrink-0 border border-border text-[8px] font-bold">
                            {user.image ? <img src={user.image} alt="" className="w-full h-full object-cover" /> : user.name?.[0] || user.email?.[0]}
                          </div>
                          <span>{user.name || user.email}</span>
                        </div>
                        {selected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <button
              onClick={handleAddMembers}
              disabled={addingMembers || addMembersSelectedIds.length === 0}
              className={`w-full py-2.5 bg-primary text-primary-foreground font-black text-xs rounded-xl shadow-lg transition-all flex items-center justify-center cursor-pointer ${
                addingMembers || addMembersSelectedIds.length === 0 ? "opacity-50 pointer-events-none" : "hover:bg-primary/95 shadow-primary/15"
              }`}
            >
              {addingMembers ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add to Group"}
            </button>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* MUTE CONFIGURATION DIALOG */}
      <DialogPrimitive.Root open={showMuteModal} onOpenChange={setShowMuteModal}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[99999] bg-background/80 backdrop-blur-sm animate-in fade-in duration-200" />
          <DialogPrimitive.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[99999] w-full max-w-xs bg-card border border-border rounded-2xl p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in duration-300">
            <div className="flex justify-between items-center">
              <DialogPrimitive.Title className="text-base font-black tracking-tight flex items-center gap-2 text-foreground">
                <VolumeX className="w-5 h-5 text-destructive" />
                Mute Thread
              </DialogPrimitive.Title>
              <DialogPrimitive.Close className="p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground">
                <X className="w-4 h-4" />
              </DialogPrimitive.Close>
            </div>

            <div className="flex flex-col gap-1.5">
              {isMuted(activeGroup) && (
                <button 
                  onClick={() => handleMuteChat("unmute")}
                  className="w-full text-left px-3 py-2 text-xs font-black hover:bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/20 mb-2 cursor-pointer flex items-center gap-1.5"
                >
                  <Volume2 className="w-4 h-4" /> Unmute Conversation
                </button>
              )}

              <button onClick={() => handleMuteChat("1hr")} className="w-full text-left px-3.5 py-2.5 hover:bg-secondary rounded-xl text-xs font-bold text-muted-foreground transition-all cursor-pointer">
                Mute for 1 Hour
              </button>
              <button onClick={() => handleMuteChat("8hr")} className="w-full text-left px-3.5 py-2.5 hover:bg-secondary rounded-xl text-xs font-bold text-muted-foreground transition-all cursor-pointer">
                Mute for 8 Hours
              </button>
              <button onClick={() => handleMuteChat("1D")} className="w-full text-left px-3.5 py-2.5 hover:bg-secondary rounded-xl text-xs font-bold text-muted-foreground transition-all cursor-pointer">
                Mute for 24 Hours
              </button>
              <button onClick={() => handleMuteChat("3D")} className="w-full text-left px-3.5 py-2.5 hover:bg-secondary rounded-xl text-xs font-bold text-muted-foreground transition-all cursor-pointer">
                Mute for 3 Days
              </button>
              <button onClick={() => handleMuteChat("7D")} className="w-full text-left px-3.5 py-2.5 hover:bg-secondary rounded-xl text-xs font-bold text-muted-foreground transition-all cursor-pointer">
                Mute for 1 Week
              </button>
              <button onClick={() => handleMuteChat("lifetime")} className="w-full text-left px-3.5 py-2.5 hover:bg-secondary rounded-xl text-xs font-bold text-muted-foreground transition-all cursor-pointer">
                Until I unmute (Lifetime)
              </button>
              
              <button 
                onClick={() => handleMuteChat("custom")}
                className="w-full text-left px-3.5 py-2.5 hover:bg-secondary rounded-xl text-xs font-bold text-muted-foreground transition-all cursor-pointer flex justify-between items-center"
              >
                <span>Custom Duration...</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {showCustomMuteDate && (
                <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-border/30 animate-in slide-in-from-top duration-300">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Select Mute Date/Time</label>
                  <input 
                    type="datetime-local" 
                    value={customMuteDate}
                    onChange={(e) => setCustomMuteDate(e.target.value)}
                    className="w-full text-xs bg-secondary/30 border border-border rounded-xl px-2 py-2"
                  />
                  <button 
                    onClick={() => handleMuteChat("custom")}
                    disabled={!customMuteDate}
                    className="py-2 bg-primary text-primary-foreground font-black text-xs rounded-xl shadow-lg transition-all"
                  >
                    Confirm Custom Mute
                  </button>
                </div>
              )}
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  )
}
