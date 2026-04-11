import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { name, slug, city, address, phone, email, password, cuisineType, priceRange } = await req.json()

    if (!name || !slug || !email || !password) {
      return new Response(JSON.stringify({ error: 'name, slug, email e password são obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      'https://jdkbywroucgwrfpirloa.supabase.co',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const damesaEmail = `${slug}@damesa.pt`

    // 1. Create Supabase auth user with @damesa.pt email
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: damesaEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, role: 'restaurant_owner' },
    })

    if (authError) throw new Error(`Auth error: ${authError.message}`)
    const userId = authData.user.id

    // 2. Upsert profile
    await supabase.from('profiles').upsert({
      id: userId,
      email: damesaEmail,
      full_name: name,
      role: 'restaurant_owner',
    })

    // 3. Create restaurant record
    const { data: restaurant, error: restError } = await supabase
      .from('restaurants')
      .insert({
        name,
        slug,
        city: city || 'Lisboa',
        address: address || null,
        phone: phone || null,
        email,           // real contact email
        cuisine_type: cuisineType || null,
        price_range: priceRange || '€€',
        status: 'active',
        owner_id: userId,
        damesa_email: damesaEmail,
      })
      .select('id, name, slug, damesa_email')
      .single()

    if (restError) throw new Error(`Restaurant error: ${restError.message}`)

    return new Response(JSON.stringify({ success: true, restaurant, damesaEmail }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('create-restaurant error:', err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
