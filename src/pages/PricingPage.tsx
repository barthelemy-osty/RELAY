import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSubscription } from '../hooks/useSubscription'
import { Button } from '../components/ui/Button'

// Remplacez par votre vrai Price ID Stripe
const PRO_PRICE_ID = 'price_REPLACE_WITH_YOUR_STRIPE_PRICE_ID'

const FREE_FEATURES = [
  'Messagerie chiffrée E2E',
  'Conversations directes illimitées',
  "Jusqu'à 3 groupes",
  'Historique 30 jours',
]

const PRO_FEATURES = [
  'Tout ce qui est gratuit',
  'Groupes illimités',
  'Historique illimité',
  'Réactions emoji avancées',
  'Badge PRO sur votre profil',
  'Support prioritaire',
]

export function PricingPage() {
  const { plan, isPro } = useSubscription()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleUpgrade() {
    setLoading(true)
    setError('')
    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-checkout', {
        body: { priceId: PRO_PRICE_ID },
      })
      if (fnError) throw fnError
      if (data?.url) window.location.href = data.url
    } catch (err: any) {
      setError(err.message ?? 'Erreur lors de la création du paiement.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white mb-2">Choisissez votre plan</h1>
          <p className="text-gray-500">Relay est gratuit. Passez Pro pour débloquer toutes les fonctionnalités.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Plan Gratuit */}
          <div className={`rounded-2xl border p-6 flex flex-col gap-4 ${plan === 'free' ? 'border-white/20 bg-white/4' : 'border-white/8 bg-white/2'}`}>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Gratuit</p>
              <p className="text-4xl font-bold text-white">
                0 €<span className="text-lg font-normal text-gray-500">/mois</span>
              </p>
            </div>
            <ul className="space-y-2.5 flex-1">
              {FREE_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-400">
                  <span className="text-gray-600 mt-0.5">✓</span> {f}
                </li>
              ))}
            </ul>
            {plan === 'free' && (
              <div className="text-center py-2 rounded-xl bg-white/5 text-sm text-gray-500 font-medium">
                Plan actuel
              </div>
            )}
          </div>

          {/* Plan Pro */}
          <div className={`rounded-2xl border p-6 flex flex-col gap-4 relative overflow-hidden ${isPro ? 'border-amber-500/40 bg-amber-500/5' : 'border-accent/40 bg-accent/5'}`}>
            <div className="absolute top-3 right-3">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                ✦ POPULAIRE
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">Pro</p>
              <p className="text-4xl font-bold text-white">
                4,99 €<span className="text-lg font-normal text-gray-500">/mois</span>
              </p>
            </div>
            <ul className="space-y-2.5 flex-1">
              {PRO_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-white">
                  <span className="text-amber-400 mt-0.5">✦</span> {f}
                </li>
              ))}
            </ul>
            {error && <p className="text-xs text-rose-400">{error}</p>}
            {isPro ? (
              <div className="text-center py-2 rounded-xl bg-amber-500/10 text-sm text-amber-400 font-medium border border-amber-500/20">
                ✦ Vous êtes Pro !
              </div>
            ) : (
              <Button onClick={handleUpgrade} loading={loading} className="w-full">
                Passer à Pro
              </Button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-700 mt-6">
          Paiement sécurisé via Stripe · Résiliation à tout moment · TVA incluse
        </p>
      </div>
    </div>
  )
}
