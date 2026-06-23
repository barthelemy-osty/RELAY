import { create } from 'zustand'
import type { Conversation, Message } from '../types'

interface ChatState {
  conversations: Conversation[]
  activeConversationId: string | null
  messages: Record<string, Message[]>
  groupKeys: Record<string, string>
  setConversations: (conversations: Conversation[]) => void
  setActiveConversation: (id: string | null) => void
  addMessage: (conversationId: string, message: Message) => void
  setMessages: (conversationId: string, messages: Message[]) => void
  setGroupKey: (conversationId: string, key: string) => void
  getGroupKey: (conversationId: string) => string | null
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  groupKeys: {},

  setConversations: (conversations) => set({ conversations }),
  setActiveConversation: (id) => set({ activeConversationId: id }),

  addMessage: (conversationId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [...(state.messages[conversationId] ?? []), message],
      },
    })),

  setMessages: (conversationId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [conversationId]: messages },
    })),

  setGroupKey: (conversationId, key) =>
    set((state) => ({
      groupKeys: { ...state.groupKeys, [conversationId]: key },
    })),

  getGroupKey: (conversationId) => get().groupKeys[conversationId] ?? null,
}))
