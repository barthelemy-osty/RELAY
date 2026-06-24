import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate('/chat')
    } catch (err: any) {
      setError(err.message ?? 'Erreur de connexion')
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
          <h2 className="text-base font-semibold text-white">Connexion</h2>

          <Input
            label="Nom d'utilisateur"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
          <Input
            label="Mot de passe secret"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <Button type="submit" className="w-full" loading={loading}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </Button>

          <div className="bg-gray-900/60 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-600 leading-relaxed">
              🔒 Mot de passe oublié = compte inaccessible.<br />
              Aucune récupération possible — c'est ça, l'anonymat complet.
            </p>
          </div>

          <p className="text-sm text-center text-gray-500">
            Pas encore de compte ?{' '}
            <Link to="/register" className="text-accent hover:underline">Créer un compte</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
