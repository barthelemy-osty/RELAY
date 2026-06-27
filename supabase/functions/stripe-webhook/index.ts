import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
})

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''

serve(async (req) => {
  const signature = req.headers.get('stripe-signature') ?? ''
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature invalide:', err)
    return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.supabase_user_id
        if (!userId || !session.subscription) break

        const stripeSub = await stripe.subscriptions.retrieve(session.subscription as string)
        const periodEnd = new Date(stripeSub.current_period_end * 1000).toISOString()

        await supabase
          .from('subscriptions')
          .upsert({
            user_id: userId,
            plan: 'pro',
            status: 'active',
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: stripeSub.id,
            current_period_end: periodEnd,
          }, { onConflict: 'user_id' })
        break
      }

      case 'customer.subscription.updated': {
        const stripeSub = event.data.object as Stripe.Subscription
        const customerId = stripeSub.customer as string

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (!sub) break

        const periodEnd = new Date(stripeSub.current_period_end * 1000).toISOString()
        const plan = stripeSub.status === 'active' ? 'pro' : 'free'

        await supabase
          .from('subscriptions')
          .update({
            plan,
            status: stripeSub.status,
            current_period_end: periodEnd,
            stripe_subscription_id: stripeSub.id,
          })
          .eq('user_id', sub.user_id)
        break
      }

      case 'customer.subscription.deleted': {
        const stripeSub = event.data.object as Stripe.Subscription
        const customerId = stripeSub.customer as string

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (!sub) break

        await supabase
          .from('subscriptions')
          .update({ plan: 'free', status: 'canceled', current_period_end: null })
          .eq('user_id', sub.user_id)
        break
      }

      default:
        console.log(`Événement ignoré : ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Erreur webhook:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 })
  }
})
