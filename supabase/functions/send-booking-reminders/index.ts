import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FROM = 'Da Mesa <reservas@damesa.pt>'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Current time in Lisbon
    const nowLisbon = new Date().toLocaleString('en-CA', {
      timeZone: 'Europe/Lisbon',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).replace(',', '').trim()  // "HH:MM"

    const todayLisbon = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Lisbon' }) // "YYYY-MM-DD"

    // Compute the 45-min and 75-min windows from now (Lisbon)
    const [nowH, nowM] = nowLisbon.split(':').map(Number)
    const nowMins = nowH * 60 + nowM

    const pad = (n: number) => String(n).padStart(2, '0')
    const minsToTime = (m: number) => `${pad(Math.floor((m % 1440) / 60))}:${pad(m % 60)}`

    const minMins = nowMins + 45
    const maxMins = nowMins + 75

    // Handle day wrap — if window crosses midnight, also check tomorrow
    const dates = [todayLisbon]
    if (maxMins >= 1440) {
      const tomorrow = new Date(todayLisbon + 'T12:00:00')
      tomorrow.setDate(tomorrow.getDate() + 1)
      dates.push(tomorrow.toLocaleDateString('en-CA'))
    }

    const minTime = minsToTime(minMins) + ':00'  // "HH:MM:00" for DB comparison
    const maxTime = minsToTime(maxMins) + ':00'

    // Fetch bookings in the reminder window
    let query = supabase
      .from('bookings')
      .select('*, restaurants(name, address, email)')
      .eq('reminder_sent', false)
      .in('status', ['pending', 'confirmed'])
      .in('booking_date', dates)

    // If the window doesn't cross midnight, filter by time range directly
    if (maxMins < 1440) {
      query = query.gte('booking_time', minTime).lte('booking_time', maxTime)
    }

    const { data: bookings, error } = await query
    if (error) {
      console.error('DB query error:', error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    if (!bookings?.length) {
      return new Response(JSON.stringify({ sent: 0, message: 'No reminders due' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // For cross-midnight wraps, filter in JS to get the right time slots
    const toRemind = maxMins >= 1440
      ? bookings.filter(b => {
          const [h, m] = b.booking_time.split(':').map(Number)
          const bMins = h * 60 + m
          // Either in today's window after midnight wrap, or in tomorrow's early hours
          return (bMins >= minMins % 1440 && bMins <= maxMins % 1440) ||
                 (b.booking_date !== todayLisbon && bMins <= maxMins % 1440)
        })
      : bookings

    const sendEmail = async (to: string, subject: string, html: string) => {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: FROM, to: [to], subject, html }),
      })
      return res.json()
    }

    let sent = 0
    for (const b of toRemind) {
      const restaurant = b.restaurants
      const ref = b.reference_code ?? b.id.slice(0, 8).toUpperCase()
      const dateStr = new Date(b.booking_date + 'T12:00:00').toLocaleDateString('pt-PT', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      })
      const timeStr = b.booking_time?.slice(0, 5) ?? ''

      const html = `
<!DOCTYPE html><html lang="pt"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#faf7f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e8dfd4;">
    <div style="background:#1c1612;padding:32px 40px;">
      <div style="font-family:Georgia,serif;font-size:26px;color:#faf7f2;">Da <span style="color:#c0392b;">Mesa</span></div>
    </div>
    <div style="padding:40px;">
      <h1 style="font-family:Georgia,serif;font-size:22px;font-weight:normal;color:#1c1612;margin:0 0 8px;">A tua mesa está à espera! 🍽️</h1>
      <p style="color:#7a6a5e;margin:0 0 32px;font-size:15px;">A tua reserva em <strong style="color:#1c1612;">${restaurant.name}</strong> começa em cerca de <strong>1 hora</strong>.</p>
      <div style="background:#faf7f2;border-radius:12px;padding:24px;margin-bottom:32px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#7a6a5e;font-size:14px;width:40%;">Referência</td><td style="padding:8px 0;font-size:14px;font-weight:600;font-family:monospace;">REF #${ref}</td></tr>
          <tr><td style="padding:8px 0;color:#7a6a5e;font-size:14px;border-top:1px solid #e8dfd4;">Restaurante</td><td style="padding:8px 0;font-size:14px;border-top:1px solid #e8dfd4;">${restaurant.name}</td></tr>
          <tr><td style="padding:8px 0;color:#7a6a5e;font-size:14px;border-top:1px solid #e8dfd4;">Data</td><td style="padding:8px 0;font-size:14px;border-top:1px solid #e8dfd4;">${dateStr}</td></tr>
          <tr><td style="padding:8px 0;color:#7a6a5e;font-size:14px;border-top:1px solid #e8dfd4;">Hora</td><td style="padding:8px 0;font-size:14px;border-top:1px solid #e8dfd4;font-weight:700;color:#1c1612;">${timeStr} ⏰</td></tr>
          <tr><td style="padding:8px 0;color:#7a6a5e;font-size:14px;border-top:1px solid #e8dfd4;">Pessoas</td><td style="padding:8px 0;font-size:14px;border-top:1px solid #e8dfd4;">${b.party_size} pessoa${b.party_size !== 1 ? 's' : ''}</td></tr>
          ${restaurant.address ? `<tr><td style="padding:8px 0;color:#7a6a5e;font-size:14px;border-top:1px solid #e8dfd4;">Morada</td><td style="padding:8px 0;font-size:14px;border-top:1px solid #e8dfd4;">${restaurant.address}</td></tr>` : ''}
        </table>
      </div>
      <a href="https://maps.google.com/?q=${encodeURIComponent(restaurant.address ?? restaurant.name)}" style="display:inline-block;padding:11px 22px;background:#1c1612;color:#fff;border-radius:10px;font-size:14px;text-decoration:none;margin-right:8px;">📍 Ver no mapa</a>
    </div>
    <div style="padding:24px 40px;border-top:1px solid #e8dfd4;text-align:center;">
      <p style="margin:0;color:#7a6a5e;font-size:12px;">Da Mesa · <a href="https://damesa.pt" style="color:#7a6a5e;">damesa.pt</a></p>
    </div>
  </div>
</body></html>`

      try {
        await sendEmail(b.diner_email, `Lembrete: a tua reserva no ${restaurant.name} é hoje às ${timeStr} 🍽️`, html)
        // Mark reminder as sent
        await supabase.from('bookings').update({ reminder_sent: true }).eq('id', b.id)
        sent++
        console.log(`Reminder sent for booking ${b.id} (${b.diner_email} @ ${timeStr})`)
      } catch (e) {
        console.error(`Failed to send reminder for booking ${b.id}:`, e)
      }
    }

    return new Response(JSON.stringify({ sent, total: toRemind.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
