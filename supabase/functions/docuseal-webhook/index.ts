import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    console.log('DocuSeal webhook received:', JSON.stringify(body))

    const eventType = body.event_type ?? body.type
    if (eventType !== 'submission.completed') {
      return new Response(JSON.stringify({ received: true, action: 'ignored', event_type: eventType }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // DocuSeal webhook body structure: { event_type, data: { submission: { id, ... } } }
    const submissionId = body.data?.submission?.id ?? body.submission?.id ?? body.id
    if (!submissionId) {
      console.warn('No submission ID found in webhook body:', JSON.stringify(body))
      return new Response(JSON.stringify({ received: true, error: 'No submission ID in body' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      'https://jdkbywroucgwrfpirloa.supabase.co',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Find restaurant by contract_envelope_id matching submission ID
    const { data: restaurant, error: findError } = await supabase
      .from('restaurants')
      .select('id, name, contract_envelope_id')
      .eq('contract_envelope_id', String(submissionId))
      .single()

    if (findError || !restaurant) {
      console.warn(`No restaurant found with contract_envelope_id = ${submissionId}`)
      return new Response(JSON.stringify({ received: true, warning: 'No matching restaurant found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Update contract_status to 'signed'
    const { error: updateError } = await supabase
      .from('restaurants')
      .update({ contract_status: 'signed' })
      .eq('id', restaurant.id)

    if (updateError) {
      throw new Error(`DB update error: ${updateError.message}`)
    }

    console.log(`Contract signed for restaurant: ${restaurant.name} (${restaurant.id})`)

    return new Response(JSON.stringify({ received: true, restaurant_id: restaurant.id, contract_status: 'signed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('docuseal-webhook error:', err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
