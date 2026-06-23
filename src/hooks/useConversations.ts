import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useChatStore } from '../store/chatStore'
import { useAuthStore } from '../store/authStore'
import type { Conversation } from '../types'

export function useConversations() {
  const { user, privateKey } = useAuthStore()
  const { conversations, setConversations, setGroupKey } = useChatStore()

  useEffect(() => {
    if (!user || !privateKey) return
    fetchConversations()

    const channel = supabase
      .channel('conversations')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversation_participants',
        filter: `user_id=eq.${user.id}`,
      }, () => fetchConversations())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user?.id, privateKey])

  async function fetchConversations() {
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
      const conv = row.conversations as unknown as Conversation
      if (!conv) continue

      // Decrypt group key if group conversation
      if (conv.is_group && row.encrypted_group_key && row.group_key_nonce) {
        try {
          const { decryptGroupKey } = await import('../lib/crypto')
          const creatorParticipant = conv.participants?.find(p => p.role === 'owner')
          if (creatorParticipant?.user?.public_key) {
            const groupKey = await decryptGroupKey(
              row.encrypted_group_key,
              row.group_key_nonce,
              creatorParticipant.user.public_key,
              privateKey
            )
            setGroupKey(conv.id, groupKey)
          }
        } catch { /* key not available yet */ }
      }

      convs.push(conv)
    }

    setConversations(convs)
  }

  async function createDirectConversation(recipientId: string): Promise<string> {
    if (!user || !privateKey) throw new Error('Non authentifié')

    const { data: conv } = await supabase
      .from('conversations')
      .insert({ is_group: false, created_by: user.id })
      .select()
      .single()

    await supabase.from('conversation_participants').insert([
      { conversation_id: conv.id, user_id: user.id, role: 'owner' },
      { conversation_id: conv.id, user_id: recipientId, role: 'member' },
    ])

    await fetchConversations()
    return conv.id
  }

  async function createGroupConversation(
    name: string,
    memberIds: string[],
    description?: string
  ): Promise<string> {
    if (!user || !privateKey) throw new Error('Non authentifié')

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
