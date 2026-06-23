import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Avatar } from '../ui/Avatar'
import { useAuthStore } from '../../store/authStore'
import { useAdmin } from '../../hooks/useAdmin'
import type { Conversation, Participant } from '../../types'

interface GroupInfoProps {
  open: boolean
  onClose: () => void
  conversation: Conversation
}

const roleLabel = { owner: 'Créateur', admin: 'Admin', member: 'Membre' }
const roleBadge = {
  owner: 'bg-amber-500/15 text-amber-400',
  admin: 'bg-violet-500/15 text-violet-400',
  member: 'bg-white/5 text-gray-500',
}

export function GroupInfo({ open, onClose, conversation }: GroupInfoProps) {
  const { user } = useAuthStore()
  const { kickFromGroup, setMemberRole } = useAdmin()
  const [loading, setLoading] = useState<string | null>(null)

  const myRole = conversation.participants?.find(p => p.user_id === user?.id)?.role
  const canManage = myRole === 'owner' || myRole === 'admin'

  async function handleKick(participant: Participant) {
    if (!confirm(`Exclure ${participant.user?.username} du groupe ?`)) return
    setLoading(participant.user_id)
    try {
      await kickFromGroup(conversation.id, participant.user_id)
    } finally {
      setLoading(null)
    }
  }

  async function handleToggleAdmin(participant: Participant) {
    const newRole = participant.role === 'admin' ? 'member' : 'admin'
    setLoading(participant.user_id)
    try {
      await setMemberRole(conversation.id, participant.user_id, newRole)
    } finally {
      setLoading(null)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={conversation.name ?? 'Groupe'} size="md">
      {conversation.description && (
        <p className="text-sm text-gray-400 mb-4 pb-4 border-b border-white/8">{conversation.description}</p>
      )}

      <p className="text-xs text-gray-600 font-medium uppercase tracking-wider mb-2">
        Membres · {conversation.participants?.length ?? 0}
      </p>

      <div className="space-y-1 max-h-72 overflow-y-auto">
        {conversation.participants?.map(p => {
          const isMe = p.user_id === user?.id
          const isOwner = p.role === 'owner'

          return (
            <div key={p.user_id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/4 transition-colors">
              <Avatar name={p.user?.username} src={p.user?.avatar_url} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white truncate">
                    {p.user?.username ?? 'Inconnu'}
                    {isMe && <span className="text-gray-600 font-normal"> (vous)</span>}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${roleBadge[p.role]}`}>
                    {roleLabel[p.role]}
                  </span>
                </div>
              </div>

              {/* Actions (visible to owner/admin, not on self or other owner) */}
              {canManage && !isMe && !isOwner && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {myRole === 'owner' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleAdmin(p)}
                      loading={loading === p.user_id}
                      title={p.role === 'admin' ? 'Rétrograder' : 'Promouvoir admin'}
                    >
                      {p.role === 'admin' ? '↓' : '↑ Admin'}
                    </Button>
                  )}
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleKick(p)}
                    loading={loading === p.user_id}
                  >
                    Exclure
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Security info */}
      <div className="mt-4 pt-4 border-t border-white/8 flex items-start gap-2">
        <svg className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <p className="text-xs text-gray-600 leading-relaxed">
          Les messages de ce groupe sont chiffrés de bout en bout. Même r3lay ne peut pas les lire.
          La clé de groupe est chiffrée individuellement pour chaque membre.
        </p>
      </div>
    </Modal>
  )
}
