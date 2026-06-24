import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export function Register() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 12) {
      setError('Le mot de passe doit contenir au moins 12 caractères.')
      return
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    setLoading(true)
    try {
      await register(username, password)
      navigate('/chat')
    } catch (err: any) {
      setError(err.message ?? 'Erreur lors de la création du compte')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-accent/15 rounded-2xl mb-4">
            <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-6a2 2 0 100-4 2 2 0 000 4z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">r3lay</h1>
          <p className="text-sm text-gray-500 mt-1">Messagerie chiffrée & anonyme</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/4 border border-white/8 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-white">Créer un compte</h2>

          {/* Avertissement mot de passe */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <span className="text-xs font-semibold text-amber-400">Mot de passe irrécupérable</span>
            </div>
            <p className="text-xs text-amber-200/70 leading-relaxed">
              Ton mot de passe est la <strong className="text-amber-300">seule clé</strong> qui chiffre tes messages.
              Aucun email, aucune récupération possible — c'est le prix de l'anonymat complet.
              Si tu le perds, ton compte et tes messages sont <strong className="text-amber-300">définitivement inaccessibles</strong>.
            </p>
          </div>

          <Input
            label="Nom d'utilisateur"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            autoComplete="username"
          />

          <div>
            <Input
              label="Mot de passe secret"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            <p className="text-xs text-gray-600 mt-1.5">Minimum 12 caractères.</p>
          </div>

          <Input
            label="Confirmer le mot de passe"
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
          />

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <Button type="submit" className="w-full" loading={loading}>
            {loading ? 'Génération des clés…' : 'Créer mon compte'}
          </Button>

          <p className="text-sm text-center text-gray-500">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-accent hover:underline">Se connecter</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
