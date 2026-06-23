import { useEffect, useRef } from 'react'
import { Avatar } from '../ui/Avatar'
import { useAuthStore } from '../../store/authStore'
import { useSettingsStore } from '../../store/settingsStore'
import type { Conversation, Message } from '../../types'

interface MessageThreadProps {
  conversation: Conversation
  messages: Message[]
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

export function MessageThread({ conversation, messages }: MessageThreadProps) {
  const { user } = useAuthStore()
  const { settings } = useSettingsStore()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

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

  // Group messages by date and consecutive sender
  let lastDate = ''
  let lastSenderId = ''

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5 scrollbar-thin">
      {messages.map((msg) => {
        const isMine = msg.sender_id === user?.id
        const msgDate = formatDate(msg.created_at)
        const showDate = msgDate !== lastDate
        const showAvatar = !isMine && (lastSenderId !== msg.sender_id || showDate)
        lastDate = msgDate
        lastSenderId = msg.sender_id

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
              {/* Avatar placeholder for alignment */}
              {!isMine && (
                <div className="w-7 flex-shrink-0">
                  {showAvatar && <Avatar name={msg.sender?.username} src={msg.sender?.avatar_url} size="xs" />}
                </div>
              )}

              <div className={`flex flex-col gap-0.5 max-w-[65%] ${isMine ? 'items-end' : 'items-start'}`}>
                {showAvatar && !isMine && conversation.is_group && (
                  <span className="text-[11px] text-gray-500 ml-1">{msg.sender?.username}</span>
                )}

                {/* Reply preview */}
                {msg.reply_to && (
                  <div className={`text-xs px-3 py-1.5 rounded-xl border border-white/8 bg-white/5 text-gray-400 max-w-full truncate`}>
                    <span className="text-accent font-medium">{msg.reply_to.sender?.username}</span>
                    {' · '}
                    {msg.reply_to.decrypted ?? '🔒'}
                  </div>
                )}

                {/* Bubble */}
                <div
                  className={`
                    px-3.5 py-2 text-sm leading-relaxed
                    ${bubbleStyle}
                    ${isMine
                      ? 'bg-accent text-white rounded-br-sm'
                      : 'bg-white/8 text-gray-100 rounded-bl-sm'
                    }
                  `}
                >
                  {msg.decrypted ?? (
                    <span className="text-gray-400 italic flex items-center gap-1.5 text-xs">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-6a2 2 0 100-4 2 2 0 000 4z" />
                      </svg>
                      Chiffré
                    </span>
                  )}
                </div>

                {settings.showTimestamps && (
                  <span className="text-[10px] text-gray-700 px-1">{formatTime(msg.created_at)}</span>
                )}
              </div>
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
