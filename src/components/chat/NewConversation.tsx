import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { Avatar } from '../ui/Avatar'
import { supabase } from '../../lib/supabase'
import { useConversations } from '../../hooks/useConversations'
import { useChatStore } from '../../store/chatStore'
import type { User } from '../../types'

interface NewConversationProps {
  open: boolean
  onClose: () => void
}

export function NewConversation({ open, onClose }: NewConversationProps) {
  const [tab, setTab] = useState<'direct' | 'group'>('direct')
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<User[]>([])
  const [selected, setSelected] = useState<User[]>([])
  const [groupName, setGroupName] = useState('')
  const [groupDesc, setGroupDesc] = useState('')
  const [loading, setLoading] = useState(false)
  const { createDirectConversation, createGroupConversation } = useConversations()
  const { setActiveConversation } = useChatStore()

  async function handleSearch(query: string) {
    setSearch(query)
    if (query.length < 2) { setResults([]); return }
    const { data } = await supabase
      .from('users')
      .select('id, username, avatar_url, public_key, email, key_fingerprint, bio, created_at')
      .ilike('username', `%${query}%`)
      .limit(8)
    setResults((data as User[]) ?? [])
  }

  function toggleSelect(user: User) {
    setSelected(prev =>
      prev.find(u => u.id === user.id)
        ? prev.filter(u => u.id !== user.id)
        : [...prev, user]
    )
  }

  async function handleCreate() {
    if (loading) return
    setLoading(true)
    try {
      if (tab === 'direct') {
        if (selected.length !== 1) return
        const id = await createDirectConversation(selected[0].id)
        setActiveConversation(id)
      } else {
        if (!groupName.trim() || selected.length === 0) return
        const id = await createGroupConversation(groupName, selected.map(u => u.id), groupDesc)
        setActiveConversation(id)
      }
      onClose()
      setSelected([])
      setSearch('')
      setGroupName('')
      setGroupDesc('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nouvelle conversation">
      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-4">
        {(['direct', 'group'] as const).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setSelected([]) }}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-accent text-white' : 'text-gray-400 hover:text-white'}`}
          >
            {t === 'direct' ? 'Direct' : 'Groupe'}
          </button>
        ))}
      </div>

      {tab === 'group' && (
        <div className="space-y-2 mb-4">
          <Input
            placeholder="Nom du groupe"
            value={groupName}
            onChange={e => setGroupName(e.target.value)}
          />
          <Input
            placeholder="Description (optionnel)"
            value={groupDesc}
            onChange={e => setGroupDesc(e.target.value)}
          />
        </div>
      )}

      <Input
        placeholder="Rechercher un utilisateur..."
        value={search}
        onChange={e => handleSearch(e.target.value)}
      />

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {selected.map(u => (
            <button
              key={u.id}
              onClick={() => toggleSelect(u)}
              className="flex items-center gap-1.5 bg-accent/20 text-accent text-xs px-2.5 py-1 rounded-full hover:bg-accent/30 transition-colors"
            >
              {u.username}
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="mt-3 space-y-0.5">
          {results.map(u => {
            const isSelected = selected.some(s => s.id === u.id)
            return (
              <button
                key={u.id}
                onClick={() => tab === 'direct' ? setSelected([u]) : toggleSelect(u)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-left ${isSelected ? 'bg-accent/15' : 'hover:bg-white/5'}`}
              >
                <Avatar name={u.username} src={u.avatar_url} size="sm" />
                <div>
                  <p className="text-sm font-medium text-white">{u.username}</p>
                  <p className="text-xs text-gray-500 font-mono">{u.key_fingerprint}</p>
                </div>
                {isSelected && (
                  <svg className="ml-auto w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}

      <Button
        className="w-full mt-4"
        onClick={handleCreate}
        loading={loading}
        disabled={tab === 'direct' ? selected.length !== 1 : selected.length === 0 || !groupName.trim()}
      >
        {tab === 'direct' ? 'Ouvrir la conversation' : `Créer le groupe (${selected.length + 1})`}
      </Button>
    </Modal>
  )
}
