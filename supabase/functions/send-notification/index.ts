import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { type, ...payload } = await req.json()

  if (type === 'sms') return sendSMS(payload)
  if (type === 'email') return sendEmail(payload)

  return new Response(JSON.stringify({ error: 'Unknown type. Use "sms" or "email".' }), { status: 400 })
})

async function sendSMS({ to, message }: { to: string; message: string }) {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
  const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER')

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({ To: to, From: fromNumber!, Body: message })
    }
  )

  const result = await response.json()
  return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } })
}

async function sendEmail({ to, subject, bookingId }: { to: string; subject: string; bookingId: string }) {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!)
  const { data: booking } = await supabase
    .from('bookings')
    .select('*, restaurants(name, address)')
    .eq('id', bookingId)
    .single()

  const restaurantName = booking?.restaurants?.name ?? 'Restaurante'
  const bookingDate = booking?.booking_date ?? ''
  const bookingTime = booking?.booking_time?.slice(0, 5) ?? ''
  const partySize = booking?.party_size ?? ''
  const refCode = booking?.reference_code ?? bookingId

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Da Mesa <reservas@damesa.pt>',
      to: [to],
      subject,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#fff;">
          <h1 style="font-family:Georgia,serif;color:#1c1612;margin-bottom:4px;">✅ Reserva Confirmada</h1>
          <p style="color:#7a6a5e;margin-top:0;">A sua reserva foi confirmada com sucesso.</p>
          <div style="background:#f3ede3;border-radius:8px;padding:20px;margin:24px 0;">
            <p style="margin:6px 0;"><strong>Restaurante:</strong> ${restaurantName}</p>
            <p style="margin:6px 0;"><strong>Data:</strong> ${bookingDate}</p>
            <p style="margin:6px 0;"><strong>Hora:</strong> ${bookingTime}</p>
            <p style="margin:6px 0;"><strong>Pessoas:</strong> ${partySize}</p>
            <p style="margin:6px 0;"><strong>Referência:</strong> #${refCode}</p>
          </div>
          <p style="color:#7a6a5e;font-size:13px;">Para cancelar ou alterar a reserva, responda a este email.</p>
          <hr style="border:none;border-top:1px solid #e8dfd4;margin:24px 0;" />
          <p style="color:#b0a090;font-size:12px;">Da Mesa — Sem taxas de reserva · <a href="https://damesa.pt" style="color:#b0a090;">damesa.pt</a></p>
        </div>
      `
    })
  })

  const result = await response.json()
  return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } })
}
