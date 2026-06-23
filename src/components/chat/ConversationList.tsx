import { useState } from 'react'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { useChatStore } from '../../store/chatStore'
import { useAuthStore } from '../../store/authStore'
import type { Conversation } from '../../types'
import { NewConversation } from './NewConversation'

function getConvName(conv: Conversation, currentUserId: string): string {
  if (conv.is_group) return conv.name ?? 'Groupe sans nom'
  const other = conv.participants?.find(p => p.user_id !== currentUserId)
  return other?.user?.username ?? 'Utilisateur inconnu'
}

function getConvAvatar(conv: Conversation, currentUserId: string): string | null {
  if (conv.is_group) return conv.avatar_url ?? null
  const other = conv.participants?.find(p => p.user_id !== currentUserId)
  return other?.user?.avatar_url ?? null
}

export function ConversationList() {
  const { user } = useAuthStore()
  const { conversations } = useChatStore()
  const { activeConversationId, setActiveConversation } = useChatStore()
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)

  const filtered = conversations.filter(c => {
    const name = getConvName(c, user?.id ?? '')
    return name.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <aside className="flex flex-col h-full w-full bg-gray-950 border-r border-white/6">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <h1 className="text-lg font-bold text-white tracking-tight">r3lay</h1>
        <Button variant="ghost" size="icon" onClick={() => setShowNew(true)} title="Nouvelle conversation">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v16m8-8H4" />
          </svg>
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <Input
          placeholder="Rechercher..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          icon={
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M16.65 10.5a6.15 6.15 0 11-12.3 0 6.15 6.15 0 0112.3 0z" />
            </svg>
          }
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-1 scrollbar-thin">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-600">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-sm">Aucune conversation</p>
          </div>
        )}
        {filtered.map(conv => {
          const name = getConvName(conv, user?.id ?? '')
          const avatarUrl = getConvAvatar(conv, user?.id ?? '')
          const isActive = activeConversationId === conv.id
          const lastMsg = conv.last_message

          return (
            <button
              key={conv.id}
              onClick={() => setActiveConversation(conv.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mx-1 transition-all duration-100 text-left group
                ${isActive ? 'bg-accent/15 text-white' : 'hover:bg-white/5 text-gray-300'}`}
            >
              <div className="relative">
                <Avatar name={name} src={avatarUrl} size="md" />
                {conv.is_group && (
                  <span className="absolute -bottom-0.5 -right-0.5 bg-gray-800 rounded-full p-0.5">
                    <svg className="w-2.5 h-2.5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-1a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v1h-3zM4.75 12.094A5.973 5.973 0 004 15v1H1v-1a3 3 0 013.75-2.906z" />
                    </svg>
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm truncate">{name}</span>
                  {lastMsg && (
                    <span className="text-[10px] text-gray-600 flex-shrink-0 ml-2">
                      {new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {lastMsg?.decrypted ?? (conv.is_group ? `${conv.participants?.length ?? 0} membres` : 'Nouvelle conversation')}
                </p>
              </div>
              {(conv.unread_count ?? 0) > 0 && (
                <span className="flex-shrink-0 bg-accent text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {conv.unread_count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <NewConversation open={showNew} onClose={() => setShowNew(false)} />
    </aside>
  )
}
