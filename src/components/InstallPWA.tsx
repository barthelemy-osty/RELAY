import { useEffect, useState } from 'react'
import { Button } from './ui/Button'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPWA() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!prompt || dismissed) return null

  async function handleInstall() {
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted' || outcome === 'dismissed') {
      setDismissed(true)
      setPrompt(null)
    }
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 border border-white/10 shadow-2xl rounded-2xl px-4 py-3">
      <span className="text-xl">📲</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">Installer Relay</p>
        <p className="text-xs text-gray-500">Accédez plus vite depuis votre écran d'accueil</p>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={() => setDismissed(true)}>
          Plus tard
        </Button>
        <Button size="sm" onClick={handleInstall}>
          Installer
        </Button>
      </div>
    </div>
  )
}
