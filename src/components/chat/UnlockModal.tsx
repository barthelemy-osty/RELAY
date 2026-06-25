import { useState } from 'react'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { useAuthStore } from '../../store/authStore'
import { decryptPrivateKey } from '../../lib/crypto'

/**
 * Affiché quand l'utilisateur a une session Supabase valide mais que la
 * privateKey a disparu de sessionStorage (ex: après un refresh de page).
 * On lui demande son mot de passe pour redéchiffrer la clé depuis localStorage.
 */
export function UnlockModal() {
  const { user, setPrivateKey, logout } = useAuthStore()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setError('')
    setLoading(true)
    try {
      const stored = localStorage.getItem(`r3lay-pk-${user.id}`)
      if (!stored) {
        setError('Clé introuvable sur cet appareil. Utilisez l\'appareil sur lequel vous avez créé le compte.')
        return
      }
      const { encryptedKey, salt, nonce } = JSON.parse(stored)
      const pk = await decryptPrivateKey(encryptedKey, salt, nonce, password)
      sessionStorage.setItem(`r3lay-pk-${user.id}`, pk)
      setPrivateKey(pk)
    } catch {
      setError('Mot de passe incorrect.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-accent/15 rounded-2xl mb-4">
            <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-6a2 2 0 100-4 2 2 0 000 4z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white">Déverrouiller</h1>
          <p className="text-sm text-gray-500 mt-1">
            Bienvenue, <span className="text-gray-300">{user?.username}</span>.<br />
            Entrez votre mot de passe pour déchiffrer vos clés.
          </p>
        </div>

        <form onSubmit={handleUnlock} className="bg-white/4 border border-white/8 rounded-2xl p-6 space-y-4">
          <Input
            label="Mot de passe secret"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            autoFocus
            required
          />

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <Button type="submit" className="w-full" loading={loading}>
            {loading ? 'Déchiffrement…' : 'Déverrouiller'}
          </Button>

          <button
            type="button"
            onClick={() => logout()}
            className="w-full text-sm text-gray-600 hover:text-gray-400 transition-colors text-center"
          >
            Se déconnecter
          </button>
        </form>
      </div>
    </div>
  )
}
