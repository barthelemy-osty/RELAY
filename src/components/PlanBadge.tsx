import { useSubscription } from '../hooks/useSubscription'

interface PlanBadgeProps {
  plan?: 'free' | 'pro'
  className?: string
}

export function PlanBadge({ plan: overridePlan, className = '' }: PlanBadgeProps) {
  const { plan: currentPlan, isLoading } = useSubscription()
  const plan = overridePlan ?? currentPlan

  if (isLoading || plan !== 'pro') return null

  return (
    <span
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold tracking-wide bg-amber-500/20 text-amber-400 border border-amber-500/30 ${className}`}
    >
      ✦ PRO
    </span>
  )
}
