import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useChatStore } from '../store/chatStore'
import { useAuthStore } from '../store/authStore'
import type { Conversation, Message } from '../types'

export function useMessages(conversation: Conversation | null) {
  const { user, privateKey } = useAuthStore()
  const { messages, setMessages, addMessage, getGroupKey } = useChatStore()

  const conversationId = conversation?.id ?? null
  const currentMessages = conversationId ? (messages[conversationId] ?? []) : []

  useEffect(() => {
    if (!conversationId || !user || !privateKey) return
    fetchMessages()

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, async (payload) => {
        const msg = payload.new as Message
        let sender = undefined
        if (msg.sender_id) {
          const senderFromParticipants = conversation?.participants?.find(
            p => p.user_id === msg.sender_id
          )?.user
          if (senderFromParticipants) {
            sender = senderFromParticipants
          } else {
            const { data: fetchedSender } = await supabase
              .from('users')
              .select('*')
              .eq('id', msg.sender_id)
              .single()
            sender = fetchedSender
          }
        }
        const decrypted = await decryptMsg({ ...msg, sender })
        addMessage(conversationId, decrypted)
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const updated = payload.new as Message
        setMessages(conversationId, currentMessages.map(m =>
          m.id === updated.id ? { ...m, ...updated } : m
        ))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversationId, privateKey])

  async function decryptMsg(msg: Message): Promise<Message> {
    if (!privateKey || !conversation) return msg
    if (msg.deleted_for_all) return { ...msg, decrypted: undefined }
    if (user && msg.deleted_for?.includes(user.id)) return { ...msg, decrypted: undefined }

    try {
      if (conversation.is_group) {
        const groupKey = getGroupKey(conversation.id)
        if (!groupKey) return { ...msg, decrypted: '[Clé de groupe indisponible]' }
        const { decryptGroupMessage } = await import('../lib/crypto')
        const text = await decryptGroupMessage(msg.ciphertext, msg.nonce, groupKey)
        return { ...msg, decrypted: text }
      } else {
        if (!msg.sender_id) return { ...msg, decrypted: '[Message d\'un utilisateur supprimé]' }
        const { decryptMessage } = await import('../lib/crypto')
        const isMine = msg.sender_id === user?.id
        if (isMine) {
          const recipient = conversation.participants?.find(p => p.user_id !== user?.id)
          const recipientPubKey = recipient?.user?.public_key
          if (!recipientPubKey) return { ...msg, decrypted: '[Clé destinataire introuvable]' }
          const text = await decryptMessage(msg.ciphertext, msg.nonce, recipientPubKey, privateKey)
          return { ...msg, decrypted: text }
        } else {
          const senderPubKey = msg.sender?.public_key
          if (!senderPubKey) return { ...msg, decrypted: '[Clé expéditeur introuvable]' }
          const text = await decryptMessage(msg.ciphertext, msg.nonce, senderPubKey, privateKey)
          return { ...msg, decrypted: text }
        }
      }
    } catch {
      return { ...msg, decrypted: '[Impossible de déchiffrer]' }
    }
  }

  async function fetchMessages() {
    if (!conversationId) return
    const { data } = await supabase
      .from('messages')
      .select('*, sender:users(*), reply_to:messages(*, sender:users(*)), reactions:message_reactions(*)')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(100)

    if (!data) return
    const decrypted = await Promise.all(data.map(msg => decryptMsg(msg as Message)))
    setMessages(conversationId, decrypted)

    if (user) {
      await supabase
        .from('messages')
        .update({ status: 'delivered' })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id)
        .eq('status', 'sent')
    }
  }

  async function markAsRead(messageId?: string) {
    if (!user || !conversationId) return
    const query = supabase
      .from('messages')
      .update({ status: 'read' })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id)
    if (messageId) query.eq('id', messageId)
    await query
  }

  async function sendMessage(plaintext: string, replyToId?: string) {
    if (!user || !privateKey || !conversation) throw new Error('Non authentifié')

    let ciphertext: string
    let nonce: string

    if (conversation.is_group) {
      const groupKey = getGroupKey(conversation.id)
      if (!groupKey) throw new Error('Clé de groupe indisponible')
      const { encryptGroupMessage } = await import('../lib/crypto')
      const encrypted = await encryptGroupMessage(plaintext, groupKey)
      ciphertext = encrypted.ciphertext
      nonce = encrypted.nonce
    } else {
      const recipient = conversation.participants?.find(p => p.user_id !== user.id)
      if (!recipient?.user?.public_key) throw new Error('Destinataire introuvable')
      const { encryptMessage } = await import('../lib/crypto')
      const encrypted = await encryptMessage(plaintext, recipient.user.public_key, privateKey)
      ciphertext = encrypted.ciphertext
      nonce = encrypted.nonce
    }

    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      sender_id: user.id,
      ciphertext,
      nonce,
      reply_to_id: replyToId ?? null,
      status: 'sent',
    })
  }

  async function deleteMessage(messageId: string, forAll: boolean) {
    if (!user) return
    if (forAll) {
      await supabase
        .from('messages')
        .update({ deleted_for_all: true })
        .eq('id', messageId)
        .eq('sender_id', user.id)
    } else {
      await supabase.rpc('append_deleted_for', {
        p_message_id: messageId,
        p_user_id: user.id,
      })
    }
  }

  async function toggleReaction(messageId: string, emoji: string) {
    if (!user) return
    const { data: existing } = await supabase
      .from('message_reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji)
      .single()

    if (existing) {
      await supabase.from('message_reactions').delete().eq('id', existing.id)
    } else {
      await supabase.from('message_reactions').insert({
        message_id: messageId,
        user_id: user.id,
        emoji,
      })
    }
  }

  return { messages: currentMessages, sendMessage, deleteMessage, toggleReaction, markAsRead }
}
