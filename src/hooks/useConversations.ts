import { useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useChatStore } from '../store/chatStore'
import { useAuthStore } from '../store/authStore'
import type { Conversation, Participant } from '../types'

let activeChannel: ReturnType<typeof supabase.channel> | null = null
let activeUserId: string | null = null

export function useConversations() {
  const { user, privateKey } = useAuthStore()
  const { conversations, setConversations, setGroupKey } = useChatStore()

  const fetchConversations = useCallback(async () => {
    if (!user || !privateKey) return

    const { data } = await supabase
      .from('conversation_participants')
      .select(`
        conversation_id,
        encrypted_group_key,
        group_key_nonce,
        conversations (
          id, name, is_group, avatar_url, description, created_by, created_at,
          conversation_participants (
            user_id, role,
            users ( id, username, avatar_url, public_key )
          )
        )
      `)
      .eq('user_id', user.id)

    if (!data) return

    const convs: Conversation[] = []
    for (const row of data) {
      const rawConv = row.conversations as any
      if (!rawConv) continue

      const participants: Participant[] = (rawConv.conversation_participants ?? []).map((p: any) => ({
        ...p,
        user: p.users ?? null,
      }))

      const conv: Conversation = {
        ...rawConv,
        participants,
      }

      if (conv.is_group && row.encrypted_group_key && row.group_key_nonce) {
        try {
          const { decryptGroupKey } = await import('../lib/crypto')
          const ownerParticipant = participants.find(p => p.role === 'owner')
          if (ownerParticipant?.user?.public_key) {
            const groupKey = await decryptGroupKey(
              row.encrypted_group_key,
              row.group_key_nonce,
              ownerParticipant.user.public_key,
              privateKey
            )
            setGroupKey(conv.id, groupKey)
          }
        } catch { /* key not available yet */ }
      }

      convs.push(conv)
    }

    setConversations(convs)
  }, [user?.id, privateKey, setConversations, setGroupKey])

  useEffect(() => {
    if (!user || !privateKey) return

    if (activeUserId === user.id && activeChannel) {
      fetchConversations()
      return
    }

    if (activeChannel) {
      supabase.removeChannel(activeChannel)
      activeChannel = null
      activeUserId = null
    }

    fetchConversations()

    activeUserId = user.id
    activeChannel = supabase
      .channel(`conversations-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversation_participants',
        filter: `user_id=eq.${user.id}`,
      }, () => fetchConversations())
      .subscribe()

    return () => {}
  }, [user?.id, privateKey, fetchConversations])

  useEffect(() => {
    if (!user && activeChannel) {
      supabase.removeChannel(activeChannel)
      activeChannel = null
      activeUserId = null
    }
  }, [user])

  async function createDirectConversation(recipientId: string): Promise<string> {
    console.log('createDirectConversation called', { user, privateKey })
    if (!user || !privateKey) throw new Error('Non authentifié')

    const existing = conversations.find(c =>
      !c.is_group &&
      c.participants?.some(p => p.user_id === recipientId) &&
      c.participants?.some(p => p.user_id === user.id)
    )
    if (existing) return existing.id

    const { data: conv, error } = await supabase
      .from('conversations')
      .insert({ is_group: false, created_by: user.id })
      .select()
      .single()

    if (error || !conv) throw new Error(`Erreur création conversation: ${error?.message}`)

    const { error: partError } = await supabase.from('conversation_participants').insert([
      { conversation_id: conv.id, user_id: user.id, role: 'owner' },
      { conversation_id: conv.id, user_id: recipientId, role: 'member' },
    ])

    if (partError) throw new Error(`Erreur ajout participants: ${partError.message}`)

    await fetchConversations()
    return conv.id
  }

  async function createGroupConversation(
    name: string,
    memberIds: string[],
    description?: string
  ): Promise<string> {
    if (!user || !privateKey) throw new Error('Non authentifié')

    // Guard plan gratuit : max 3 groupes
    const { data: planData } = await supabase.rpc('get_user_plan', { p_user_id: user.id })
    const plan = planData ?? 'free'
    if (plan === 'free') {
      const groupCount = conversations.filter(c => c.is_group).length
      if (groupCount >= 3) {
        throw new Error('UPGRADE_REQUIRED: Le plan gratuit est limité à 3 groupes. Passez à Pro pour créer des groupes illimités.')
      }
    }

    const { generateGroupKey, encryptGroupKeyForMember } = await import('../lib/crypto')
    const groupKey = await generateGroupKey()

    const { data: conv } = await supabase
      .from('conversations')
      .insert({ name, is_group: true, created_by: user.id, description: description ?? null })
      .select()
      .single()

    const allMemberIds = [user.id, ...memberIds.filter(id => id !== user.id)]

    const { data: members } = await supabase
      .from('users')
      .select('id, public_key')
      .in('id', allMemberIds)

    if (!members) throw new Error('Membres introuvables')

    const participants = []
    for (const member of members) {
      const { encryptedGroupKey, nonce } = await encryptGroupKeyForMember(
        groupKey,
        member.public_key,
        privateKey
      )
      participants.push({
        conversation_id: conv.id,
        user_id: member.id,
        role: member.id === user.id ? 'owner' : 'member',
        encrypted_group_key: encryptedGroupKey,
        group_key_nonce: nonce,
      })
    }

    await supabase.from('conversation_participants').insert(participants)
    setGroupKey(conv.id, groupKey)
    await fetchConversations()
    return conv.id
  }

  return { conversations, createDirectConversation, createGroupConversation }
}
