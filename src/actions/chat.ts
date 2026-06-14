"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

const MAX_CHAR_LIMIT = 4000

// Helper to strip HTML tags and get plain text length
function getPlainTextLength(html: string): number {
  if (!html) return 0
  const plainText = html.replace(/<[^>]*>/g, "")
  return plainText.length
}

// Helper to extract user mentions (returns user IDs)
function extractUserMentions(html: string): string[] {
  if (!html) return []
  const ids: string[] = []
  const regex = /<span[^>]*class=["']mention["'][^>]*data-id=["']([^"']+)["'][^>]*>/g
  let match
  while ((match = regex.exec(html)) !== null) {
    if (match[1] && !ids.includes(match[1])) {
      ids.push(match[1])
    }
  }
  return ids
}

/**
 * Fetch all chat groups/conversations the current user is part of.
 */
export async function getChatGroups() {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return { success: false, error: "Unauthorized" }

    const memberships = await prisma.chatMember.findMany({
      where: { userId },
      select: { chatGroupId: true }
    })

    const groupIds = memberships.map((m: any) => m.chatGroupId)

    const groups = await prisma.chatGroup.findMany({
      where: { id: { in: groupIds } },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true }
            }
          }
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            sender: {
              select: { id: true, name: true }
            }
          }
        }
      },
      orderBy: { updatedAt: "desc" }
    })

    return { success: true, groups }
  } catch (error) {
    console.error("getChatGroups error:", error)
    return { success: false, error: "Failed to fetch chat groups" }
  }
}

/**
 * Fetch a single chat group details including members and messages.
 */
export async function getChatGroup(chatGroupId: string) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return { success: false, error: "Unauthorized" }

    // Security check: must be a member
    const member = await prisma.chatMember.findUnique({
      where: { chatGroupId_userId: { chatGroupId, userId } }
    })
    if (!member) return { success: false, error: "Forbidden: Not a member of this chat group" }

    const group = await prisma.chatGroup.findUnique({
      where: { id: chatGroupId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true }
            }
          }
        },
        messages: {
          orderBy: { createdAt: "asc" },
          include: {
            sender: {
              select: { id: true, name: true, email: true, image: true }
            },
            attachments: true
          }
        }
      }
    })

    if (!group) return { success: false, error: "Chat group not found" }

    return { success: true, group }
  } catch (error) {
    console.error("getChatGroup error:", error)
    return { success: false, error: "Failed to fetch chat group" }
  }
}

/**
 * Create a new chat group or locate/create a 1-1 chat.
 */
export async function createChatGroup(name: string | null, userIds: string[], isGroup: boolean) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return { success: false, error: "Unauthorized" }

    // Unique userIds list (including the creator)
    const allUserIds = Array.from(new Set([...userIds, userId]))

    if (allUserIds.length < 2 && !isGroup) {
      return { success: false, error: "1-1 chat requires at least one other user" }
    }

    if (!isGroup) {
      // Check if a 1-1 chat between the exact two users already exists
      const otherUserId = allUserIds.find(id => id !== userId)
      if (!otherUserId) return { success: false, error: "Invalid user selection" }

      const existing1to1 = await prisma.chatGroup.findFirst({
        where: {
          isGroup: false,
          AND: [
            { members: { some: { userId } } },
            { members: { some: { userId: otherUserId } } }
          ]
        },
        include: {
          members: {
            include: {
              user: { select: { id: true, name: true, email: true, image: true } }
            }
          }
        }
      })

      if (existing1to1) {
        return { success: true, group: existing1to1, existed: true }
      }
    }

    // Create the group
    const group = await prisma.chatGroup.create({
      data: {
        name: isGroup ? (name || "Unnamed Group") : null,
        isGroup,
        ownerId: isGroup ? userId : null,
        members: {
          create: allUserIds.map(uid => ({
            userId: uid,
            isAdmin: isGroup ? (uid === userId) : false, // Creator is admin in groups
          }))
        }
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, image: true } }
          }
        }
      }
    })

    return { success: true, group, existed: false }
  } catch (error) {
    console.error("createChatGroup error:", error)
    return { success: false, error: "Failed to create chat group" }
  }
}

/**
 * Rename a group chat.
 */
export async function renameChatGroup(chatGroupId: string, newName: string) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return { success: false, error: "Unauthorized" }

    const group = await prisma.chatGroup.findUnique({
      where: { id: chatGroupId },
      include: { members: true }
    })
    if (!group) return { success: false, error: "Chat group not found" }
    if (!group.isGroup) return { success: false, error: "Cannot rename a 1-1 chat" }

    const member = group.members.find((m: any) => m.userId === userId)
    if (!member) return { success: false, error: "Forbidden" }

    // Security check: Only owner/admins, or anyone if allowMemberRename is true
    const isOwner = group.ownerId === userId
    const isAdmin = member.isAdmin
    if (!isOwner && !isAdmin && !group.allowMemberRename) {
      return { success: false, error: "Only admins or the owner can rename this group" }
    }

    const updated = await prisma.chatGroup.update({
      where: { id: chatGroupId },
      data: { name: newName }
    })

    return { success: true, group: updated }
  } catch (error) {
    console.error("renameChatGroup error:", error)
    return { success: false, error: "Failed to rename group" }
  }
}

/**
 * Toggle whether ordinary members can rename a group chat (Owner only).
 */
export async function toggleAllowMemberRename(chatGroupId: string, allow: boolean) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return { success: false, error: "Unauthorized" }

    const group = await prisma.chatGroup.findUnique({
      where: { id: chatGroupId }
    })
    if (!group) return { success: false, error: "Chat group not found" }
    if (group.ownerId !== userId) return { success: false, error: "Only the group owner can change this setting" }

    await prisma.chatGroup.update({
      where: { id: chatGroupId },
      data: { allowMemberRename: allow }
    })

    return { success: true }
  } catch (error) {
    console.error("toggleAllowMemberRename error:", error)
    return { success: false, error: "Failed to update rename setting" }
  }
}

/**
 * Add members to a group chat (Admins/Owner only).
 */
export async function addChatGroupMembers(chatGroupId: string, userIds: string[]) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return { success: false, error: "Unauthorized" }

    const group = await prisma.chatGroup.findUnique({
      where: { id: chatGroupId },
      include: { members: true }
    })
    if (!group) return { success: false, error: "Chat group not found" }
    if (!group.isGroup) return { success: false, error: "Cannot add members to 1-1 chat" }

    const member = group.members.find((m: any) => m.userId === userId)
    if (!member) return { success: false, error: "Forbidden" }

    // Security check: Admin or Owner only
    const isOwner = group.ownerId === userId
    const isAdmin = member.isAdmin
    if (!isOwner && !isAdmin) {
      return { success: false, error: "Only group admins can add new members" }
    }

    // Filter out existing members
    const newMembers = userIds.filter((uid: string) => !group.members.some((m: any) => m.userId === uid))

    if (newMembers.length === 0) {
      return { success: true, message: "No new members to add" }
    }

    await prisma.chatMember.createMany({
      data: newMembers.map(uid => ({
        chatGroupId,
        userId: uid,
        isAdmin: false
      }))
    })

    // Touch group timestamp
    await prisma.chatGroup.update({
      where: { id: chatGroupId },
      data: { updatedAt: new Date() }
    })

    return { success: true }
  } catch (error) {
    console.error("addChatGroupMembers error:", error)
    return { success: false, error: "Failed to add members" }
  }
}

/**
 * Remove a member from a group chat (Admins/Owner, or leaving).
 */
export async function removeChatGroupMember(chatGroupId: string, userIdToRemove: string) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return { success: false, error: "Unauthorized" }

    const group = await prisma.chatGroup.findUnique({
      where: { id: chatGroupId },
      include: { members: true }
    })
    if (!group) return { success: false, error: "Chat group not found" }
    if (!group.isGroup) return { success: false, error: "Cannot remove members from 1-1 chat" }

    const member = group.members.find((m: any) => m.userId === userId)
    if (!member) return { success: false, error: "Forbidden" }

    const targetMember = group.members.find((m: any) => m.userId === userIdToRemove)
    if (!targetMember) return { success: false, error: "Target member not found in group" }

    const isSelf = userId === userIdToRemove
    const isOwner = group.ownerId === userId
    const isAdmin = member.isAdmin

    if (isSelf) {
      // Owner cannot leave without transfer or deleting
      if (isOwner) {
        return { success: false, error: "Owner cannot leave the group. You must transfer ownership or delete the group." }
      }
      // Allowed to leave
    } else {
      // Security check for removing others: Must be admin/owner
      if (!isOwner && !isAdmin) {
        return { success: false, error: "Only admins or the owner can remove members" }
      }
      // Admin cannot remove owner
      if (group.ownerId === userIdToRemove) {
        return { success: false, error: "Cannot remove the group owner" }
      }
      // Admin cannot remove other admins (only owner can)
      if (isAdmin && !isOwner && targetMember.isAdmin) {
        return { success: false, error: "Only the owner can remove other admins" }
      }
    }

    await prisma.chatMember.delete({
      where: { id: targetMember.id }
    })

    // Touch group timestamp
    await prisma.chatGroup.update({
      where: { id: chatGroupId },
      data: { updatedAt: new Date() }
    })

    return { success: true }
  } catch (error) {
    console.error("removeChatGroupMember error:", error)
    return { success: false, error: "Failed to remove member" }
  }
}

/**
 * Update member admin status (Owner only).
 */
export async function updateMemberAdminStatus(chatGroupId: string, targetUserId: string, isAdmin: boolean) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return { success: false, error: "Unauthorized" }

    const group = await prisma.chatGroup.findUnique({
      where: { id: chatGroupId },
      include: { members: true }
    })
    if (!group) return { success: false, error: "Chat group not found" }
    if (!group.isGroup) return { success: false, error: "Cannot set admins in 1-1 chat" }

    // Security check: must be owner
    if (group.ownerId !== userId) {
      return { success: false, error: "Only the group owner can manage admin roles" }
    }

    const targetMember = group.members.find((m: any) => m.userId === targetUserId)
    if (!targetMember) return { success: false, error: "Member not found" }

    // Cannot demote owner
    if (group.ownerId === targetUserId) {
      return { success: false, error: "Cannot change the admin status of the group owner" }
    }

    await prisma.chatMember.update({
      where: { id: targetMember.id },
      data: { isAdmin }
    })

    return { success: true }
  } catch (error) {
    console.error("updateMemberAdminStatus error:", error)
    return { success: false, error: "Failed to update admin status" }
  }
}

/**
 * Mute/Unmute a chat group for different durations.
 */
export async function muteChatGroup(
  chatGroupId: string,
  durationType: "1hr" | "8hr" | "1D" | "3D" | "7D" | "lifetime" | "unmute" | "custom",
  customDate?: string
) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return { success: false, error: "Unauthorized" }

    const member = await prisma.chatMember.findUnique({
      where: { chatGroupId_userId: { chatGroupId, userId } }
    })
    if (!member) return { success: false, error: "Forbidden: Not a member" }

    let mutedUntil: Date | null = null

    if (durationType !== "unmute") {
      const now = new Date()
      switch (durationType) {
        case "1hr":
          mutedUntil = new Date(now.getTime() + 60 * 60 * 1000)
          break
        case "8hr":
          mutedUntil = new Date(now.getTime() + 8 * 60 * 60 * 1000)
          break
        case "1D":
          mutedUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000)
          break
        case "3D":
          mutedUntil = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
          break
        case "7D":
          mutedUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
          break
        case "lifetime":
          mutedUntil = new Date(now.getFullYear() + 100, now.getMonth(), now.getDate())
          break
        case "custom":
          if (!customDate) return { success: false, error: "Custom date is required" }
          mutedUntil = new Date(customDate)
          if (isNaN(mutedUntil.getTime())) return { success: false, error: "Invalid date format" }
          if (mutedUntil <= now) return { success: false, error: "Mute duration must be in the future" }
          break
      }
    }

    await prisma.chatMember.update({
      where: { id: member.id },
      data: { mutedUntil }
    })

    return { success: true, mutedUntil }
  } catch (error) {
    console.error("muteChatGroup error:", error)
    return { success: false, error: "Failed to mute chat group" }
  }
}

/**
 * Send a chat message, parse user mentions, associate attachments, and create notifications.
 */
export async function sendChatMessage(chatGroupId: string, content: string, attachmentIds: string[] = []) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return { success: false, error: "Unauthorized" }

    // Security check: Must be member
    const member = await prisma.chatMember.findUnique({
      where: { chatGroupId_userId: { chatGroupId, userId } }
    })
    if (!member) return { success: false, error: "Forbidden: Not a member" }

    // Character limit verification
    const textLength = getPlainTextLength(content)
    if (textLength > MAX_CHAR_LIMIT) {
      return { success: false, error: `Message exceeds character limit of ${MAX_CHAR_LIMIT} characters` }
    }

    // Create the message
    const message = await prisma.chatMessage.create({
      data: {
        chatGroupId,
        senderId: userId,
        content,
        isDeleted: false
      }
    })

    // Associate attachments
    if (attachmentIds.length > 0) {
      await prisma.attachment.updateMany({
        where: { id: { in: attachmentIds }, userId },
        data: {
          chatGroupId,
          chatMessageId: message.id
        }
      })
    }

    // Fetch sender name
    const senderName = session.user.name || session.user.email || "Someone"

    // Fetch group details for notifications
    const group = await prisma.chatGroup.findUnique({
      where: { id: chatGroupId },
      include: {
        members: {
          select: {
            userId: true,
            mutedUntil: true
          }
        }
      }
    })

    if (group) {
      // Touch group updatedAt
      await prisma.chatGroup.update({
        where: { id: chatGroupId },
        data: { updatedAt: new Date() }
      })

      // Extract user mentions from rich HTML content
      const mentionedUserIds = extractUserMentions(content)

      for (const mId of mentionedUserIds) {
        // Skip self
        if (mId === userId) continue

        // Check if recipient is a member of the group
        const recipientMember = group.members.find((m: any) => m.userId === mId)
        if (!recipientMember) continue

        // Check if the group is muted for the recipient
        const isMuted = recipientMember.mutedUntil && new Date(recipientMember.mutedUntil) > new Date()
        if (isMuted) continue

        // Create notification
        await prisma.notification.create({
          data: {
            userId: mId,
            type: "MENTION",
            title: group.isGroup ? `Mentioned in ${group.name}` : "Mentioned in Chat",
            content: `${senderName} mentioned you in ${group.isGroup ? `group "${group.name}"` : "a private chat"}.`,
            link: `/chat?chatGroupId=${chatGroupId}`
          }
        })
      }
    }

    return { success: true, messageId: message.id }
  } catch (error) {
    console.error("sendChatMessage error:", error)
    return { success: false, error: "Failed to send message" }
  }
}

/**
 * Delete a sent message (marked as deleted).
 */
export async function deleteChatMessage(messageId: string) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId) return { success: false, error: "Unauthorized" }

    const message = await prisma.chatMessage.findUnique({
      where: { id: messageId }
    })
    if (!message) return { success: false, error: "Message not found" }

    // Security check: Only the sender can delete their own message
    if (message.senderId !== userId) {
      return { success: false, error: "Forbidden: You can only delete your own messages" }
    }

    const updated = await prisma.chatMessage.update({
      where: { id: messageId },
      data: { isDeleted: true }
    })

    return { success: true, message: updated }
  } catch (error) {
    console.error("deleteChatMessage error:", error)
    return { success: false, error: "Failed to delete message" }
  }
}
