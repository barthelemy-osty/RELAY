import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

export interface BannedUser {
  id: string
  banned_user_id: string
  reason: string | null
  banned_at: string
  banned_by: string
  user?: {
    id: string
    username: string
    email: string
    avatar_url: string | null
  }
}

export function useAdmin() {
  const { user } = useAuthStore()
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // App-level admin: only the app creator (set via env or first user)
  // Check if current user has admin flag
  const [isAppAdmin, setIsAppAdmin] = useState(false)

  useEffect(() => {
    if (!user) return
    checkAdminStatus()
  }, [user?.id])

  async function checkAdminStatus() {
    if (!user) return
    const { data } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    setIsAppAdmin(data?.is_admin ?? false)
  }

  async function fetchBannedUsers() {
    if (!isAppAdmin) return
    setIsLoading(true)
    const { data } = await supabase
      .from('banned_users')
      .select('*, user:users!banned_user_id(id, username, email, avatar_url)')
      .order('banned_at', { ascending: false })
    setBannedUsers((data as BannedUser[]) ?? [])
    setIsLoading(false)
  }

  async function banUser(targetUserId: string, reason?: string) {
    if (!user || !isAppAdmin) throw new Error('Permission refusée')

    // Insert ban record
    const { error } = await supabase.from('banned_users').insert({
      banned_user_id: targetUserId,
      banned_by: user.id,
      reason: reason ?? null,
    })
    if (error) throw error

    // Revoke all active sessions for that user
    await supabase.from('users').update({ is_banned: true }).eq('id', targetUserId)

    await fetchBannedUsers()
  }

  async function unbanUser(targetUserId: string) {
    if (!user || !isAppAdmin) throw new Error('Permission refusée')

    const { error } = await supabase
      .from('banned_users')
      .delete()
      .eq('banned_user_id', targetUserId)
    if (error) throw error

    await supabase.from('users').update({ is_banned: false }).eq('id', targetUserId)
    await fetchBannedUsers()
  }

  // Group-level: kick a member from a group (owner or admin only)
  async function kickFromGroup(conversationId: string, targetUserId: string) {
    if (!user) throw new Error('Non authentifié')

    // Verify caller is owner or admin of the group
    const { data: caller } = await supabase
      .from('conversation_participants')
      .select('role')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single()

    if (!caller || (caller.role !== 'owner' && caller.role !== 'admin')) {
      throw new Error('Permission refusée')
    }

    // Cannot kick the owner
    const { data: target } = await supabase
      .from('conversation_participants')
      .select('role')
      .eq('conversation_id', conversationId)
      .eq('user_id', targetUserId)
      .single()

    if (target?.role === 'owner') throw new Error('Impossible d\'exclure le créateur du groupe')

    await supabase
      .from('conversation_participants')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', targetUserId)
  }

  // Group-level: promote/demote a member
  async function setMemberRole(
    conversationId: string,
    targetUserId: string,
    role: 'admin' | 'member'
  ) {
    if (!user) throw new Error('Non authentifié')

    const { data: caller } = await supabase
      .from('conversation_participants')
      .select('role')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single()

    if (caller?.role !== 'owner') throw new Error('Seul le créateur peut modifier les rôles')

    await supabase
      .from('conversation_participants')
      .update({ role })
      .eq('conversation_id', conversationId)
      .eq('user_id', targetUserId)
  }

  // Search all users (admin only)
  async function searchUsers(query: string) {
    if (!isAppAdmin) return []
    const { data } = await supabase
      .from('users')
      .select('id, username, email, avatar_url, is_banned, created_at')
      .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(20)
    return data ?? []
  }

  return {
    isAppAdmin,
    bannedUsers,
    isLoading,
    fetchBannedUsers,
    banUser,
    unbanUser,
    kickFromGroup,
    setMemberRole,
    searchUsers,
  }
}
