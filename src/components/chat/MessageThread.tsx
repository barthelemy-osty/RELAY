import { useEffect, useRef, useState } from 'react'
import { Avatar } from '../ui/Avatar'
import { useAuthStore } from '../../store/authStore'
import { useSettingsStore } from '../../store/settingsStore'
import type { Conversation, Message } from '../../types'

interface MessageThreadProps {
  conversation: Conversation
  messages: Message[]
  onDeleteMessage?: (id: string, forAll: boolean) => void
  onToggleReaction?: (id: string, emoji: string) => void
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui"
  if (d.toDateString() === yesterday.toDateString()) return 'Hier'
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

function StatusTicks({ status }: { status: Message['status'] }) {
  if (status === 'sent') {
    return (
      <svg className="w-3.5 h-3.5 text-gray-600 inline-block ml-1" viewBox="0 0 16 16" fill="none">
        <path d="M2 8l4 4 8-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  }
  if (status === 'delivered') {
    return (
      <svg className="w-4 h-3.5 text-gray-500 inline-block ml-1" viewBox="0 0 20 16" fill="none">
        <path d="M1 8l4 4 8-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M5 8l4 4 8-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  }
  if (status === 'read') {
    return (
      <svg className="w-4 h-3.5 text-accent inline-block ml-1" viewBox="0 0 20 16" fill="none">
        <path d="M1 8l4 4 8-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M5 8l4 4 8-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  }
  return null
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥']

function ReactionPicker({ onPick }: { onPick: (emoji: string) => void }) {
  return (
    <div className="absolute bottom-full mb-1 bg-gray-900 border border-white/10 rounded-2xl shadow-xl px-2 py-1.5 flex gap-1 z-10">
      {QUICK_EMOJIS.map(e => (
        <button
          key={e}
          onClick={() => onPick(e)}
          className="text-lg hover:scale-125 transition-transform"
        >
          {e}
        </button>
      ))}
    </div>
  )
}

function groupReactions(reactions: Message['reactions']) {
  if (!reactions?.length) return []
  const map = new Map<string, number>()
  for (const r of reactions) {
    map.set(r.emoji, (map.get(r.emoji) ?? 0) + 1)
  }
  return Array.from(map.entries()).map(([emoji, count]) => ({ emoji, count }))
}

export function MessageThread({
  conversation,
  messages,
  onDeleteMessage,
  onToggleReaction,
}: MessageThreadProps) {
  const { user } = useAuthStore()
  const { settings } = useSettingsStore()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [contextMenu, setContextMenu] = useState<{ msgId: string; x: number; y: number } | null>(null)
  const [reactionPicker, setReactionPicker] = useState<string | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  useEffect(() => {
    const close = () => { setContextMenu(null); setReactionPicker(null) }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  const densityPad = {
    compact: 'py-0.5',
    comfortable: 'py-1',
    spacious: 'py-2',
  }[settings.messageDensity]

  const bubbleStyle = {
    modern: 'rounded-2xl',
    minimal: 'rounded-md',
    rounded: 'rounded-3xl',
  }[settings.bubbleStyle]

  let lastDate = ''
  let lastSenderId = ''

  return (
    <div
      className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5 scrollbar-thin"
      onClick={() => { setContextMenu(null); setReactionPicker(null) }}
    >
      {messages.map((msg) => {
        const isMine = msg.sender_id === user?.id
        const isDeletedForAll = msg.deleted_for_all
        const isDeletedForMe = user ? msg.deleted_for?.includes(user.id) : false

        const msgDate = formatDate(msg.created_at)
        const showDate = msgDate !== lastDate
        const showAvatar = !isMine && (lastSenderId !== (msg.sender_id ?? '__deleted__') || showDate)
        lastDate = msgDate
        lastSenderId = msg.sender_id ?? '__deleted__'

        const senderName = msg.sender_id === null
          ? 'Utilisateur supprimé'
          : (msg.sender?.username ?? '?')

        const grouped = groupReactions(msg.reactions)

        return (
          <div key={msg.id}>
            {showDate && (
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-white/6" />
                <span className="text-[11px] text-gray-600 font-medium">{msgDate}</span>
                <div className="flex-1 h-px bg-white/6" />
              </div>
            )}

            <div className={`flex items-end gap-2 ${densityPad} ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
              {!isMine && (
                <div className="w-7 flex-shrink-0">
                  {showAvatar && (
                    <Avatar
                      name={msg.sender_id === null ? '?' : msg.sender?.username}
                      src={msg.sender?.avatar_url}
                      size="xs"
                    />
                  )}
                </div>
              )}

              <div className={`flex flex-col gap-0.5 max-w-[65%] ${isMine ? 'items-end' : 'items-start'}`}>
                {showAvatar && !isMine && conversation.is_group && (
                  <span className={`text-[11px] ml-1 ${msg.sender_id === null ? 'text-gray-600 italic' : 'text-gray-500'}`}>
                    {senderName}
                  </span>
                )}

                {msg.reply_to && !isDeletedForAll && !isDeletedForMe && (
                  <div className="text-xs px-3 py-1.5 rounded-xl border border-white/8 bg-white/5 text-gray-400 max-w-full truncate">
                    <span className="text-accent font-medium">
                      {msg.reply_to.sender_id === null ? 'Utilisateur supprimé' : msg.reply_to.sender?.username}
                    </span>
                    {' · '}
                    {msg.reply_to.decrypted ?? '🔒'}
                  </div>
                )}

                <div className="relative group">
                  {!isDeletedForAll && !isDeletedForMe && onToggleReaction && (
                    <button
                      className={`absolute top-1 ${isMine ? 'left-[-2rem]' : 'right-[-2rem]'} opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 hover:text-gray-300 text-base`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setReactionPicker(reactionPicker === msg.id ? null : msg.id)
                      }}
                      title="Réagir"
                    >
                      😊
                    </button>
                  )}

                  {reactionPicker === msg.id && onToggleReaction && (
                    <ReactionPicker onPick={(emoji) => {
                      onToggleReaction(msg.id, emoji)
                      setReactionPicker(null)
                    }} />
                  )}

                  <div
                    className={`
                      px-3.5 py-2 text-sm leading-relaxed cursor-default select-text
                      ${bubbleStyle}
                      ${isMine
                        ? 'bg-accent text-white rounded-br-sm'
                        : 'bg-white/8 text-gray-100 rounded-bl-sm'
                      }
                      ${isDeletedForAll || isDeletedForMe ? 'opacity-50 italic' : ''}
                    `}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setContextMenu({ msgId: msg.id, x: e.clientX, y: e.clientY })
                    }}
                  >
                    {isDeletedForAll ? (
                      <span className="text-gray-400 text-xs flex items-center gap-1">🚫 Message supprimé</span>
                    ) : isDeletedForMe ? (
                      <span className="text-gray-400 text-xs flex items-center gap-1">🚫 Vous avez supprimé ce message</span>
                    ) : msg.decrypted != null ? (
                      msg.decrypted
                    ) : (
                      <span className="text-gray-400 italic flex items-center gap-1.5 text-xs">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-6a2 2 0 100-4 2 2 0 000 4z" />
                        </svg>
                        Chiffré
                      </span>
                    )}
                  </div>
                </div>

                {grouped.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {grouped.map(({ emoji, count }) => (
                      <button
                        key={emoji}
                        onClick={() => onToggleReaction?.(msg.id, emoji)}
                        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-white/8 text-xs hover:bg-white/12 transition-colors border border-white/8"
                      >
                        {emoji} <span className="text-gray-400">{count}</span>
                      </button>
                    ))}
                  </div>
                )}

                {settings.showTimestamps && (
                  <span className="text-[10px] text-gray-700 px-1 flex items-center">
                    {formatTime(msg.created_at)}
                    {isMine && settings.showReadReceipts && <StatusTicks status={msg.status ?? 'sent'} />}
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />

      {contextMenu && (
        <div
          className="fixed bg-gray-900 border border-white/10 rounded-xl shadow-2xl py-1 z-50 min-w-[160px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {onToggleReaction && (
            <button
              className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors"
              onClick={() => { setReactionPicker(contextMenu.msgId); setContextMenu(null) }}
            >
              😊 Réagir
            </button>
          )}
          {onDeleteMessage && (
            <>
              <button
                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors"
                onClick={() => { onDeleteMessage(contextMenu.msgId, false); setContextMenu(null) }}
              >
                🗑️ Supprimer pour moi
              </button>
              <button
                className="w-full text-left px-4 py-2 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
                onClick={() => { onDeleteMessage(contextMenu.msgId, true); setContextMenu(null) }}
              >
                🗑️ Supprimer pour tous
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
