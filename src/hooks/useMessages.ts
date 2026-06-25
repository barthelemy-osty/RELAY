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
        // Chercher le sender dans les participants déjà chargés pour éviter un appel réseau
        const senderFromParticipants = conversation?.participants?.find(p => p.user_id === msg.sender_id)?.user
        let sender = senderFromParticipants
        if (!sender) {
          const { data: fetchedSender } = await supabase
            .from('users')
            .select('*')
            .eq('id', msg.sender_id)
            .single()
          sender = fetchedSender
        }
        const decrypted = await decryptMsg({ ...msg, sender })
        addMessage(conversationId, decrypted)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversationId, privateKey])

  async function decryptMsg(msg: Message): Promise<Message> {
    if (!privateKey || !conversation) return msg
    try {
      if (conversation.is_group) {
        const groupKey = getGroupKey(conversation.id)
        if (!groupKey) return { ...msg, decrypted: '[Clé de groupe indisponible]' }
        const { decryptGroupMessage } = await import('../lib/crypto')
        const text = await decryptGroupMessage(msg.ciphertext, msg.nonce, groupKey)
        return { ...msg, decrypted: text }
      } else {
        const { decryptMessage } = await import('../lib/crypto')
        const isMine = msg.sender_id === user?.id
        if (isMine) {
          // Pour mes propres messages : j'ai chiffré avec la clé publique du destinataire
          // et ma clé privée. Pour déchiffrer, j'ai besoin de la clé publique du destinataire + ma clé privée.
          const recipient = conversation.participants?.find(p => p.user_id !== user?.id)
          const recipientPubKey = recipient?.user?.public_key
          if (!recipientPubKey) return { ...msg, decrypted: '[Clé destinataire introuvable]' }
          const text = await decryptMessage(msg.ciphertext, msg.nonce, recipientPubKey, privateKey)
          return { ...msg, decrypted: text }
        } else {
          // Pour les messages reçus : chiffrés avec ma clé publique + clé privée de l'expéditeur
          // Pour déchiffrer : clé publique de l'expéditeur + ma clé privée
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
      .select('*, sender:users(*), reply_to:messages(*, sender:users(*))')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(100)

    if (!data) return
    const decrypted = await Promise.all(data.map(msg => decryptMsg(msg as Message)))
    setMessages(conversationId, decrypted)
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
    })
  }

  return { messages: currentMessages, sendMessage }
}
