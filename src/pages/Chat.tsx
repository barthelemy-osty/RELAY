import { useState } from 'react'
import { ConversationList } from '../components/chat/ConversationList'
import { MessageThread } from '../components/chat/MessageThread'
import { MessageInput } from '../components/chat/MessageInput'
import { GroupInfo } from '../components/chat/GroupInfo'
import { UnlockModal } from '../components/chat/UnlockModal'
import { InstallPWA } from '../components/InstallPWA'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { useChatStore } from '../store/chatStore'
import { useAuthStore } from '../store/authStore'
import { useConversations } from '../hooks/useConversations'
import { useMessages } from '../hooks/useMessages'
import { useNavigate } from 'react-router-dom'

function getConvName(conv: any, userId: string): string {
  if (conv.is_group) return conv.name ?? 'Groupe'
  const other = conv.participants?.find((p: any) => p.user_id !== userId)
  return other?.user?.username ?? 'Inconnu'
}

export function Chat() {
  const { user, privateKey } = useAuthStore()
  const { conversations, activeConversationId } = useChatStore()
  const activeConversation = conversations.find(c => c.id === activeConversationId) ?? null
  const { messages, sendMessage, deleteMessage, toggleReaction } = useMessages(activeConversation)
  const { createDirectConversation, createGroupConversation } = useConversations()
  const [showGroupInfo, setShowGroupInfo] = useState(false)
  const navigate = useNavigate()

  const convName = activeConversation ? getConvName(activeConversation, user?.id ?? '') : null
  const otherParticipant = activeConversation?.is_group ? null :
    activeConversation?.participants?.find(p => p.user_id !== user?.id)

  if (!privateKey) return <UnlockModal />

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      <InstallPWA />

      <div className="w-72 flex-shrink-0 flex flex-col">
        <ConversationList
          createDirectConversation={createDirectConversation}
          createGroupConversation={createGroupConversation}
        />
        <div className="flex items-center gap-1 px-3 py-3 border-t border-white/6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/settings')} title="Paramètres">
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Button>
          <div className="flex items-center gap-2 ml-auto">
            <Avatar name={user?.username} src={user?.avatar_url} size="xs" />
            <span className="text-xs text-gray-500 truncate max-w-[80px]">{user?.username}</span>
          </div>
        </div>
      </div>

      <main className="flex-1 flex flex-col min-w-0 border-l border-white/6">
        {activeConversation ? (
          <>
            <header className="flex items-center gap-3 px-5 py-3.5 border-b border-white/6 bg-gray-950/80 backdrop-blur-sm">
              <Avatar
                name={convName ?? ''}
                src={activeConversation.is_group ? activeConversation.avatar_url : otherParticipant?.user?.avatar_url}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-white truncate">{convName}</p>
                <p className="text-xs text-gray-600">
                  {activeConversation.is_group
                    ? `${activeConversation.participants?.length ?? 0} membres · Chiffré E2E`
                    : 'Chiffré de bout en bout'}
                </p>
              </div>
              {activeConversation.is_group && (
                <Button variant="ghost" size="icon" onClick={() => setShowGroupInfo(true)} title="Infos du groupe">
                  <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </Button>
              )}
            </header>

            <MessageThread
              conversation={activeConversation}
              messages={messages}
              onDeleteMessage={deleteMessage}
              onToggleReaction={toggleReaction}
            />
            <MessageInput onSend={sendMessage} />

            {activeConversation.is_group && (
              <GroupInfo
                open={showGroupInfo}
                onClose={() => setShowGroupInfo(false)}
                conversation={activeConversation}
              />
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-700">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-sm">Sélectionnez une conversation</p>
          </div>
        )}
      </main>
    </div>
  )
}
