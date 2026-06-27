import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

export type SubscriptionPlan = 'free' | 'pro'

interface Subscription {
  plan: SubscriptionPlan
  status: string
  current_period_end: string | null
  stripe_customer_id: string | null
}

interface UseSubscriptionReturn {
  plan: SubscriptionPlan
  subscription: Subscription | null
  isPro: boolean
  isLoading: boolean
  refresh: () => Promise<void>
}

export function useSubscription(): UseSubscriptionReturn {
  const { user } = useAuthStore()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  async function fetchSubscription() {
    if (!user) { setIsLoading(false); return }
    setIsLoading(true)
    const { data } = await supabase
      .from('subscriptions')
      .select('plan, status, current_period_end, stripe_customer_id')
      .eq('user_id', user.id)
      .single()
    setSubscription(data as Subscription | null)
    setIsLoading(false)
  }

  useEffect(() => {
    fetchSubscription()

    if (!user) return
    const channel = supabase
      .channel(`subscription:${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'subscriptions',
        filter: `user_id=eq.${user.id}`,
      }, () => fetchSubscription())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user?.id])

  const plan: SubscriptionPlan = (() => {
    if (!subscription) return 'free'
    const isActive =
      subscription.status === 'active' ||
      subscription.status === 'trialing'
    const notExpired =
      !subscription.current_period_end ||
      new Date(subscription.current_period_end) > new Date()
    return isActive && notExpired ? (subscription.plan as SubscriptionPlan) : 'free'
  })()

  return {
    plan,
    subscription,
    isPro: plan === 'pro',
    isLoading,
    refresh: fetchSubscription,
  }
}
