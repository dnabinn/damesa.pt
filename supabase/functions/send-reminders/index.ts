import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (_req) => {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')!
  const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')!
  const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER')!

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Find bookings in ~24 hours that haven't been reminded yet
  const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const in25h = new Date(Date.now() + 25 * 60 * 60 * 1000)

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('*, restaurants(name)')
    .eq('status', 'confirmed')
    .eq('reminder_sent', false)
    .gte('booking_date', in24h.toISOString().split('T')[0])
    .lte('booking_date', in25h.toISOString().split('T')[0])

  if (error) {
    return new Response(JSON.stringify({ error }), { status: 500 })
  }

  const results = []
  for (const booking of bookings ?? []) {
    const restaurantName = booking.restaurants?.name ?? 'o restaurante'
    const time = booking.booking_time?.slice(0, 5) ?? ''
    const message = `⏰ Lembrete Da Mesa: amanhã às ${time} no ${restaurantName}. Ref: ${booking.reference_code}. Bom apetite!`

    try {
      await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            To: booking.diner_phone,
            From: TWILIO_PHONE_NUMBER,
            Body: message
          })
        }
      )

      // Mark reminder as sent
      await supabase
        .from('bookings')
        .update({ reminder_sent: true })
        .eq('id', booking.id)

      results.push({ id: booking.id, status: 'sent' })
    } catch (err) {
      results.push({ id: booking.id, status: 'failed', error: err })
    }
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
