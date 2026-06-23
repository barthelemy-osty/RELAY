import { useState, useRef, type KeyboardEvent } from 'react'
import { Button } from '../ui/Button'
import { useSettingsStore } from '../../store/settingsStore'

interface MessageInputProps {
  onSend: (text: string) => Promise<void>
  disabled?: boolean
}

export function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const { settings } = useSettingsStore()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  async function handleSend() {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    try {
      await onSend(trimmed)
      setText('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (settings.sendOnEnter && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleInput() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }

  return (
    <div className="px-4 pb-4 pt-2">
      {/* E2E badge */}
      <div className="flex items-center justify-center mb-2">
        <span className="flex items-center gap-1 text-[10px] text-gray-700 font-medium">
          <svg className="w-2.5 h-2.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          Chiffré de bout en bout
        </span>
      </div>

      <div className="flex items-end gap-2 bg-white/5 border border-white/10 rounded-2xl px-3 py-2 focus-within:border-accent/50 transition-colors">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          disabled={disabled || sending}
          placeholder={disabled ? 'Impossible de chiffrer le message…' : 'Écrivez un message…'}
          rows={1}
          className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-600 resize-none focus:outline-none min-h-[36px] max-h-[160px] py-1.5 leading-relaxed"
        />
        <Button
          variant="primary"
          size="icon"
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          loading={sending}
          className="flex-shrink-0 mb-0.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </Button>
      </div>
      {!settings.sendOnEnter && (
        <p className="text-[10px] text-gray-700 text-center mt-1.5">Shift+Entrée pour envoyer</p>
      )}
    </div>
  )
}
