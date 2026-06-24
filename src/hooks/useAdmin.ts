import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

export interface BannedUser {
  id: string
  username: string
  email: string
  avatar_url: string | null
  created_at: string
}

export function useAdmin() {
  const { user } = useAuthStore()
  const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAppAdmin, setIsAppAdmin] = useState(false)

  useEffect(() => {
    if (!user) return
    checkAdminStatus()
  }, [user?.id])

  async function checkAdminStatus() {
    if (!user) return
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    setIsAppAdmin(data?.role === 'admin' || data?.role === 'moderator')
  }

  async function fetchBannedUsers() {
    setIsLoading(true)
    const { data } = await supabase
      .from('users')
      .select('id, username, email, avatar_url, created_at')
      .eq('role', 'banned')
      .order('created_at', { ascending: false })
    setBannedUsers((data as BannedUser[]) ?? [])
    setIsLoading(false)
  }

  async function banUser(targetUserId: string, _reason?: string) {
    if (!user || !isAppAdmin) throw new Error('Permission refusée')
    const { error } = await supabase
      .from('users')
      .update({ role: 'banned' })
      .eq('id', targetUserId)
      .neq('role', 'admin')
    if (error) throw error
    await fetchBannedUsers()
  }

  async function unbanUser(targetUserId: string) {
    if (!user || !isAppAdmin) throw new Error('Permission refusée')
    const { error } = await supabase
      .from('users')
      .update({ role: 'user' })
      .eq('id', targetUserId)
    if (error) throw error
    await fetchBannedUsers()
  }

  async function kickFromGroup(conversationId: string, targetUserId: string) {
    if (!user) throw new Error('Non authentifié')

    const { data: caller } = await supabase
      .from('conversation_participants')
      .select('role')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single()

    if (!caller || (caller.role !== 'owner' && caller.role !== 'admin')) {
      throw new Error('Permission refusée')
    }

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

  async function searchUsers(query: string) {
    if (!isAppAdmin) return []
    const { data } = await supabase
      .from('users')
      .select('id, username, avatar_url, role, created_at')
      .ilike('username', `%${query}%`)
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
