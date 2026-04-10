import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// STRIPE_SECRET_KEY is stored as a Supabase secret: STRIPE_SECRET_KEY
// Set it with: npx supabase secrets set STRIPE_SECRET_KEY=sk_live_... --project-ref jdkbywroucgwrfpirloa
const STRIPE_API = 'https://api.stripe.com/v1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Flatten nested objects to bracket notation for Stripe form-encoded bodies
function flattenParams(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}[${key}]` : key
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenParams(value as Record<string, unknown>, fullKey))
    } else if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (typeof item === 'object' && item !== null) {
          Object.assign(result, flattenParams(item as Record<string, unknown>, `${fullKey}[${i}]`))
        } else {
          result[`${fullKey}[${i}]`] = String(item)
        }
      })
    } else if (value !== undefined && value !== null) {
      result[fullKey] = String(value)
    }
  }
  return result
}

async function stripePost(path: string, body: Record<string, unknown>) {
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')!
  const flat = flattenParams(body)
  const encoded = new URLSearchParams(flat).toString()
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: encoded,
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(`Stripe error on ${path}: ${data?.error?.message ?? JSON.stringify(data)}`)
  }
  return data
}

async function stripeGet(path: string) {
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')!
  const res = await fetch(`${STRIPE_API}${path}`, {
    headers: { 'Authorization': `Bearer ${stripeKey}` },
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(`Stripe GET error on ${path}: ${data?.error?.message ?? JSON.stringify(data)}`)
  }
  return data
}

function endOfMonthTimestamp(): number {
  const now = new Date()
  // Last day of current month at 23:59:59 UTC
  const lastDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59))
  return Math.floor(lastDay.getTime() / 1000)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { restaurantId, iban, ownerName, ownerEmail } = await req.json()

    if (!restaurantId || !iban || !ownerName || !ownerEmail) {
      return new Response(JSON.stringify({ error: 'Missing required fields: restaurantId, iban, ownerName, ownerEmail' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      'https://jdkbywroucgwrfpirloa.supabase.co',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // 1. Create Stripe Customer
    const customer = await stripePost('/customers', {
      name: ownerName,
      email: ownerEmail,
      metadata: { restaurant_id: restaurantId },
    })

    // 2. Create SEPA Direct Debit PaymentMethod
    const paymentMethod = await stripePost('/payment_methods', {
      type: 'sepa_debit',
      sepa_debit: { iban },
      billing_details: { name: ownerName, email: ownerEmail },
    })

    // 3. Attach PaymentMethod to Customer
    await stripePost(`/payment_methods/${paymentMethod.id}/attach`, {
      customer: customer.id,
    })

    // 4. Set as default payment method on customer
    await stripePost(`/customers/${customer.id}`, {
      invoice_settings: { default_payment_method: paymentMethod.id },
    })

    // 5. Find or create Da Mesa product
    const productsRes = await stripeGet('/products?limit=100')
    let product = productsRes.data?.find((p: { metadata?: { damesa?: string } }) => p.metadata?.damesa === 'platform')
    if (!product) {
      product = await stripePost('/products', {
        name: 'Da Mesa — Plataforma de Reservas',
        metadata: { damesa: 'platform' },
      })
    }

    // Find or create €40/month price for this product
    const pricesRes = await stripeGet(`/prices?product=${product.id}&limit=100`)
    let price = pricesRes.data?.find((p: { unit_amount?: number; currency?: string; recurring?: { interval?: string } }) =>
      p.unit_amount === 4000 && p.currency === 'eur' && p.recurring?.interval === 'month'
    )
    if (!price) {
      price = await stripePost('/prices', {
        product: product.id,
        unit_amount: 4000, // €40.00 in cents
        currency: 'eur',
        recurring: { interval: 'month' },
      })
    }

    // 6. Find or create IVA Tax Rate (23%)
    const taxRatesRes = await stripeGet('/tax_rates?limit=100')
    let taxRate = taxRatesRes.data?.find((t: { percentage?: number; display_name?: string; country?: string; active?: boolean }) =>
      t.percentage === 23 && t.display_name === 'IVA' && t.country === 'PT' && t.active
    )
    if (!taxRate) {
      taxRate = await stripePost('/tax_rates', {
        display_name: 'IVA',
        percentage: '23',
        country: 'PT',
        inclusive: 'false',
        jurisdiction: 'PT',
      })
    }

    // 7. Billing cycle anchor = end of current month
    const billingCycleAnchor = endOfMonthTimestamp()

    // 8. Create Subscription
    const subscription = await stripePost('/subscriptions', {
      customer: customer.id,
      items: [{ price: price.id, tax_rates: [taxRate.id] }],
      billing_cycle_anchor: billingCycleAnchor,
      proration_behavior: 'none',
      default_payment_method: paymentMethod.id,
      payment_settings: {
        payment_method_types: ['sepa_debit'],
        save_default_payment_method: 'on_subscription',
      },
    })

    // 9. Update restaurant in DB
    const { error: dbError } = await supabase
      .from('restaurants')
      .update({
        stripe_customer_id: customer.id,
        stripe_subscription_id: subscription.id,
        billing_status: 'active',
        owner_iban: iban,
        owner_legal_name: ownerName,
      })
      .eq('id', restaurantId)

    if (dbError) {
      throw new Error(`DB update error: ${dbError.message}`)
    }

    // 10. Return success
    return new Response(JSON.stringify({
      success: true,
      customerId: customer.id,
      subscriptionId: subscription.id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('setup-billing error:', err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
