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
    const body = await req.json()
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    let booking: any

    if (body.bookingId) {
      // Mode 1: existing booking — just send emails
      const { data, error } = await supabase
        .from('bookings')
        .select('*, restaurants(name, address, phone, email)')
        .eq('id', body.bookingId)
        .single()
      if (error || !data) {
        return new Response(JSON.stringify({ error: 'Booking not found' }), { status: 404 })
      }
      booking = data
    } else if (body.bookingData) {
      // Mode 2: create booking then send emails (used by anonymous widget)
      const ref = 'DM-' + Math.random().toString(36).slice(2, 7).toUpperCase()
      const { data, error } = await supabase
        .from('bookings')
        .insert({ ...body.bookingData, reference_code: ref, status: 'pending' })
        .select('*, restaurants(name, address, phone, email)')
        .single()
      if (error || !data) {
        console.error('Booking insert error:', error)
        return new Response(JSON.stringify({ error: 'Failed to create booking', details: error }), { status: 500 })
      }
      booking = data
    } else if (body.statusChange) {
      // Mode 3: status changed by restaurant — notify diner
      const { bookingId, newStatus } = body.statusChange
      if (!bookingId || !newStatus) {
        return new Response(JSON.stringify({ error: 'bookingId and newStatus required' }), { status: 400 })
      }
      const { data, error } = await supabase
        .from('bookings')
        .select('*, restaurants(name, address, phone, email)')
        .eq('id', bookingId)
        .single()
      if (error || !data) {
        return new Response(JSON.stringify({ error: 'Booking not found' }), { status: 404 })
      }
      booking = data

      const ref = booking.reference_code ?? booking.id.slice(0, 8).toUpperCase()
      const dateStr = new Date(booking.booking_date + 'T12:00:00').toLocaleDateString('pt-PT', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      })
      const timeStr = booking.booking_time?.slice(0, 5) ?? ''
      const restaurant = booking.restaurants

      let subject = ''
      let bodyHtml = ''

      if (newStatus === 'confirmed') {
        subject = `Reserva confirmada pelo restaurante — ${restaurant.name} · REF #${ref}`
        bodyHtml = `
<!DOCTYPE html><html lang="pt"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#faf7f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e8dfd4;">
    <div style="background:#1c1612;padding:32px 40px;">
      <div style="font-family:Georgia,serif;font-size:26px;color:#faf7f2;">Da <span style="color:#c0392b;">Mesa</span></div>
    </div>
    <div style="padding:40px;">
      <h1 style="font-family:Georgia,serif;font-size:22px;font-weight:normal;color:#1c1612;margin:0 0 8px;">Reserva confirmada pelo restaurante ✅</h1>
      <p style="color:#7a6a5e;margin:0 0 32px;font-size:15px;">O restaurante <strong style="color:#1c1612;">${restaurant.name}</strong> confirmou a tua reserva.</p>
      <div style="background:#faf7f2;border-radius:12px;padding:24px;margin-bottom:32px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#7a6a5e;font-size:14px;width:40%;">Referência</td><td style="padding:8px 0;font-size:14px;font-weight:600;font-family:monospace;">REF #${ref}</td></tr>
          <tr><td style="padding:8px 0;color:#7a6a5e;font-size:14px;border-top:1px solid #e8dfd4;">Restaurante</td><td style="padding:8px 0;font-size:14px;border-top:1px solid #e8dfd4;">${restaurant.name}</td></tr>
          <tr><td style="padding:8px 0;color:#7a6a5e;font-size:14px;border-top:1px solid #e8dfd4;">Data</td><td style="padding:8px 0;font-size:14px;border-top:1px solid #e8dfd4;">${dateStr}</td></tr>
          <tr><td style="padding:8px 0;color:#7a6a5e;font-size:14px;border-top:1px solid #e8dfd4;">Hora</td><td style="padding:8px 0;font-size:14px;border-top:1px solid #e8dfd4;">${timeStr}</td></tr>
          <tr><td style="padding:8px 0;color:#7a6a5e;font-size:14px;border-top:1px solid #e8dfd4;">Pessoas</td><td style="padding:8px 0;font-size:14px;border-top:1px solid #e8dfd4;">${booking.party_size}</td></tr>
          <tr><td style="padding:8px 0;color:#7a6a5e;font-size:14px;border-top:1px solid #e8dfd4;">Morada</td><td style="padding:8px 0;font-size:14px;border-top:1px solid #e8dfd4;">${restaurant.address ?? '—'}</td></tr>
        </table>
      </div>
      <p style="color:#7a6a5e;font-size:13px;margin:0;">Até já! 🍽</p>
    </div>
    <div style="padding:24px 40px;border-top:1px solid #e8dfd4;text-align:center;">
      <p style="margin:0;color:#7a6a5e;font-size:12px;">Da Mesa · <a href="https://damesa.pt" style="color:#7a6a5e;">damesa.pt</a></p>
    </div>
  </div>
</body></html>`
      } else if (newStatus === 'cancelled') {
        subject = `Reserva cancelada — ${restaurant.name} · REF #${ref}`
        bodyHtml = `
<!DOCTYPE html><html lang="pt"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#faf7f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e8dfd4;">
    <div style="background:#1c1612;padding:32px 40px;">
      <div style="font-family:Georgia,serif;font-size:26px;color:#faf7f2;">Da <span style="color:#c0392b;">Mesa</span></div>
    </div>
    <div style="padding:40px;">
      <h1 style="font-family:Georgia,serif;font-size:22px;font-weight:normal;color:#1c1612;margin:0 0 8px;">Reserva cancelada ❌</h1>
      <p style="color:#7a6a5e;margin:0 0 32px;font-size:15px;">A tua reserva em <strong style="color:#1c1612;">${restaurant.name}</strong> foi cancelada pelo restaurante. Pedimos desculpa pelo inconveniente.</p>
      <div style="background:#faf7f2;border-radius:12px;padding:24px;margin-bottom:32px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#7a6a5e;font-size:14px;width:40%;">Referência</td><td style="padding:8px 0;font-size:14px;font-weight:600;font-family:monospace;">REF #${ref}</td></tr>
          <tr><td style="padding:8px 0;color:#7a6a5e;font-size:14px;border-top:1px solid #e8dfd4;">Restaurante</td><td style="padding:8px 0;font-size:14px;border-top:1px solid #e8dfd4;">${restaurant.name}</td></tr>
          <tr><td style="padding:8px 0;color:#7a6a5e;font-size:14px;border-top:1px solid #e8dfd4;">Data</td><td style="padding:8px 0;font-size:14px;border-top:1px solid #e8dfd4;">${dateStr}</td></tr>
          <tr><td style="padding:8px 0;color:#7a6a5e;font-size:14px;border-top:1px solid #e8dfd4;">Hora</td><td style="padding:8px 0;font-size:14px;border-top:1px solid #e8dfd4;">${timeStr}</td></tr>
          <tr><td style="padding:8px 0;color:#7a6a5e;font-size:14px;border-top:1px solid #e8dfd4;">Pessoas</td><td style="padding:8px 0;font-size:14px;border-top:1px solid #e8dfd4;">${booking.party_size}</td></tr>
        </table>
      </div>
      <p style="color:#7a6a5e;font-size:13px;margin:0 0 8px;">Podes fazer uma nova reserva em <a href="https://damesa.pt" style="color:#c0392b;">damesa.pt</a>.</p>
    </div>
    <div style="padding:24px 40px;border-top:1px solid #e8dfd4;text-align:center;">
      <p style="margin:0;color:#7a6a5e;font-size:12px;">Da Mesa · <a href="https://damesa.pt" style="color:#7a6a5e;">damesa.pt</a></p>
    </div>
  </div>
</body></html>`
      } else {
        return new Response(JSON.stringify({ success: true, skipped: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const sendEmail = async (to: string, subject: string, html: string) => {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: FROM, to: [to], subject, html }),
        })
        return res.json()
      }

      const result = await sendEmail(booking.diner_email, subject, bodyHtml)
      console.log('Status email result:', JSON.stringify(result))
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    } else if (body.cancelToken) {
      // Mode 4: customer cancelled via manage-booking page — email diner + restaurant
      const { data, error } = await supabase
        .from('bookings')
        .select('*, restaurants(name, address, phone, email)')
        .eq('cancel_token', body.cancelToken)
        .single()
      if (error || !data) {
        return new Response(JSON.stringify({ error: 'Booking not found' }), { status: 404 })
      }
      const b = data
      const restaurant = b.restaurants
      const ref = b.reference_code ?? b.id.slice(0, 8).toUpperCase()
      const dateStr = new Date(b.booking_date + 'T12:00:00').toLocaleDateString('pt-PT', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      })
      const timeStr = b.booking_time?.slice(0, 5) ?? ''

      const sendEmail = async (to: string, subject: string, html: string) => {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: FROM, to: [to], subject, html }),
        })
        return res.json()
      }

      // Email to diner
      const dinerCancelHtml = `
<!DOCTYPE html><html lang="pt"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#faf7f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e8dfd4;">
    <div style="background:#1c1612;padding:32px 40px;"><div style="font-family:Georgia,serif;font-size:26px;color:#faf7f2;">Da <span style="color:#c0392b;">Mesa</span></div></div>
    <div style="padding:40px;">
      <h1 style="font-family:Georgia,serif;font-size:22px;font-weight:normal;color:#1c1612;margin:0 0 8px;">Reserva cancelada ❌</h1>
      <p style="color:#7a6a5e;margin:0 0 32px;font-size:15px;">Cancelaste a tua reserva em <strong style="color:#1c1612;">${restaurant.name}</strong>.</p>
      <div style="background:#faf7f2;border-radius:12px;padding:24px;margin-bottom:32px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#7a6a5e;font-size:14px;width:40%;">Referência</td><td style="padding:8px 0;font-size:14px;font-weight:600;font-family:monospace;">REF #${ref}</td></tr>
          <tr><td style="padding:8px 0;color:#7a6a5e;font-size:14px;border-top:1px solid #e8dfd4;">Restaurante</td><td style="padding:8px 0;font-size:14px;border-top:1px solid #e8dfd4;">${restaurant.name}</td></tr>
          <tr><td style="padding:8px 0;color:#7a6a5e;font-size:14px;border-top:1px solid #e8dfd4;">Data</td><td style="padding:8px 0;font-size:14px;border-top:1px solid #e8dfd4;">${dateStr}</td></tr>
          <tr><td style="padding:8px 0;color:#7a6a5e;font-size:14px;border-top:1px solid #e8dfd4;">Hora</td><td style="padding:8px 0;font-size:14px;border-top:1px solid #e8dfd4;">${timeStr}</td></tr>
          <tr><td style="padding:8px 0;color:#7a6a5e;font-size:14px;border-top:1px solid #e8dfd4;">Pessoas</td><td style="padding:8px 0;font-size:14px;border-top:1px solid #e8dfd4;">${b.party_size}</td></tr>
        </table>
      </div>
      <p style="color:#7a6a5e;font-size:13px;margin:0 0 8px;">Podes fazer uma nova reserva em <a href="https://damesa.pt" style="color:#c0392b;">damesa.pt</a>.</p>
    </div>
    <div style="padding:24px 40px;border-top:1px solid #e8dfd4;text-align:center;">
      <p style="margin:0;color:#7a6a5e;font-size:12px;">Da Mesa · <a href="https://damesa.pt" style="color:#7a6a5e;">damesa.pt</a></p>
    </div>
  </div>
</body></html>`

      // Email to restaurant
      const restCancelHtml = `
<!DOCTYPE html><html lang="pt"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#faf7f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e8dfd4;">
    <div style="background:#1c1612;padding:32px 40px;"><div style="font-family:Georgia,serif;font-size:26px;color:#faf7f2;">Da <span style="color:#c0392b;">Mesa</span></div><div style="color:#c0a882;font-size:13px;margin-top:6px;">Painel do restaurante</div></div>
    <div style="padding:40px;">
      <h1 style="font-family:Georgia,serif;font-size:22px;font-weight:normal;color:#1c1612;margin:0 0 8px;">Reserva cancelada pelo cliente ❌</h1>
      <p style="color:#7a6a5e;margin:0 0 32px;font-size:15px;">O cliente cancelou a reserva abaixo. O horário ficou disponível automaticamente.</p>
      <div style="background:#faf7f2;border-radius:12px;padding:24px;margin-bottom:32px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#7a6a5e;font-size:14px;width:40%;">Referência</td><td style="padding:8px 0;font-size:14px;font-weight:600;font-family:monospace;">REF #${ref}</td></tr>
          <tr><td style="padding:8px 0;color:#7a6a5e;font-size:14px;border-top:1px solid #e8dfd4;">Cliente</td><td style="padding:8px 0;font-size:14px;border-top:1px solid #e8dfd4;">${b.diner_name}</td></tr>
          <tr><td style="padding:8px 0;color:#7a6a5e;font-size:14px;border-top:1px solid #e8dfd4;">Contacto</td><td style="padding:8px 0;font-size:14px;border-top:1px solid #e8dfd4;">${b.diner_phone ?? '—'} · ${b.diner_email}</td></tr>
          <tr><td style="padding:8px 0;color:#7a6a5e;font-size:14px;border-top:1px solid #e8dfd4;">Data</td><td style="padding:8px 0;font-size:14px;border-top:1px solid #e8dfd4;">${dateStr}</td></tr>
          <tr><td style="padding:8px 0;color:#7a6a5e;font-size:14px;border-top:1px solid #e8dfd4;">Hora</td><td style="padding:8px 0;font-size:14px;border-top:1px solid #e8dfd4;">${timeStr}</td></tr>
          <tr><td style="padding:8px 0;color:#7a6a5e;font-size:14px;border-top:1px solid #e8dfd4;">Pessoas</td><td style="padding:8px 0;font-size:14px;border-top:1px solid #e8dfd4;">${b.party_size}</td></tr>
        </table>
      </div>
      <a href="https://damesa.pt/pages/owner-dashboard.html" style="display:inline-block;padding:13px 28px;background:#1c1612;color:#fff;border-radius:10px;font-size:14px;text-decoration:none;">Ver painel →</a>
    </div>
    <div style="padding:24px 40px;border-top:1px solid #e8dfd4;text-align:center;">
      <p style="margin:0;color:#7a6a5e;font-size:12px;">Da Mesa · <a href="https://damesa.pt" style="color:#7a6a5e;">damesa.pt</a></p>
    </div>
  </div>
</body></html>`

      const emails = [sendEmail(b.diner_email, `Cancelamento confirmado — ${restaurant.name} · REF #${ref}`, dinerCancelHtml)]
      if (restaurant.email) {
        emails.push(sendEmail(restaurant.email, `Reserva cancelada pelo cliente — ${b.diner_name} · ${dateStr} às ${timeStr}`, restCancelHtml))
      }
      const results = await Promise.allSettled(emails)
      console.log('Cancel email results:', JSON.stringify(results))
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    } else {
      return new Response(JSON.stringify({ error: 'bookingId or bookingData required' }), { status: 400 })
    }

    const restaurant = booking.restaurants
    const ref = booking.reference_code ?? booking.id.slice(0, 8).toUpperCase()
    const dateStr = new Date(booking.booking_date + 'T12:00:00').toLocaleDateString('pt-PT', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })
    const timeStr = booking.booking_time?.slice(0, 5) ?? ''

    // ── 1. Email to CUSTOMER ──────────────────────────────────────────────────
    const customerHtml = `
<!DOCTYPE html>
<html lang="pt">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#faf7f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e8dfd4;">
    <!-- Header -->
    <div style="background:#1c1612;padding:32px 40px;">
      <div style="font-family:Georgia,serif;font-size:26px;color:#faf7f2;">Da <span style="color:#c0392b;">Mesa</span></div>
    </div>
    <!-- Body -->
    <div style="padding:40px;">
      <h1 style="font-family:Georgia,serif;font-size:22px;font-weight:normal;color:#1c1612;margin:0 0 8px;">Reserva confirmada ✅</h1>
      <p style="color:#7a6a5e;margin:0 0 32px;font-size:15px;">A tua reserva em <strong style="color:#1c1612;">${restaurant.name}</strong> foi recebida com sucesso.</p>

      <!-- Booking details box -->
      <div style="background:#faf7f2;border-radius:12px;padding:24px;margin-bottom:32px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#7a6a5e;font-size:14px;width:40%;">Referência</td>
            <td style="padding:8px 0;font-size:14px;font-weight:600;font-family:monospace;">REF #${ref}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#7a6a5e;font-size:14px;border-top:1px solid #e8dfd4;">Restaurante</td>
            <td style="padding:8px 0;font-size:14px;border-top:1px solid #e8dfd4;">${restaurant.name}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#7a6a5e;font-size:14px;border-top:1px solid #e8dfd4;">Data</td>
            <td style="padding:8px 0;font-size:14px;border-top:1px solid #e8dfd4;">${dateStr}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#7a6a5e;font-size:14px;border-top:1px solid #e8dfd4;">Hora</td>
            <td style="padding:8px 0;font-size:14px;border-top:1px solid #e8dfd4;">${timeStr}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#7a6a5e;font-size:14px;border-top:1px solid #e8dfd4;">Pessoas</td>
            <td style="padding:8px 0;font-size:14px;border-top:1px solid #e8dfd4;">${booking.party_size}</td>
          </tr>
          ${booking.special_requests ? `
          <tr>
            <td style="padding:8px 0;color:#7a6a5e;font-size:14px;border-top:1px solid #e8dfd4;">Pedido especial</td>
            <td style="padding:8px 0;font-size:14px;border-top:1px solid #e8dfd4;">${booking.special_requests}</td>
          </tr>` : ''}
          <tr>
            <td style="padding:8px 0;color:#7a6a5e;font-size:14px;border-top:1px solid #e8dfd4;">Morada</td>
            <td style="padding:8px 0;font-size:14px;border-top:1px solid #e8dfd4;">${restaurant.address ?? '—'}</td>
          </tr>
        </table>
      </div>

      <p style="color:#7a6a5e;font-size:13px;margin:0 0 8px;">Para alterar ou cancelar a reserva, acede à tua conta em <a href="https://damesa.pt/pages/dashboard.html" style="color:#c0392b;">damesa.pt</a>.</p>
      <p style="color:#7a6a5e;font-size:13px;margin:0;">Até já! 🍽</p>
    </div>
    <!-- Footer -->
    <div style="padding:24px 40px;border-top:1px solid #e8dfd4;text-align:center;">
      <p style="margin:0;color:#7a6a5e;font-size:12px;">Da Mesa · Reservas sem taxas em Lisboa · <a href="https://damesa.pt" style="color:#7a6a5e;">damesa.pt</a></p>
    </div>
  </div>
</body>
</html>`

    // ── 2. Email to RESTAURANT ────────────────────────────────────────────────
    const restaurantHtml = `
<!DOCTYPE html>
<html lang="pt">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#faf7f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e8dfd4;">
    <div style="background:#1c1612;padding:32px 40px;">
      <div style="font-family:Georgia,serif;font-size:26px;color:#faf7f2;">Da <span style="color:#c0392b;">Mesa</span></div>
      <div style="color:#c0a882;font-size:13px;margin-top:6px;">Painel do restaurante</div>
    </div>
    <div style="padding:40px;">
      <h1 style="font-family:Georgia,serif;font-size:22px;font-weight:normal;color:#1c1612;margin:0 0 8px;">Nova reserva recebida 🔔</h1>
      <p style="color:#7a6a5e;margin:0 0 32px;font-size:15px;">Recebeste uma nova reserva em <strong style="color:#1c1612;">${restaurant.name}</strong>.</p>

      <div style="background:#faf7f2;border-radius:12px;padding:24px;margin-bottom:32px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#7a6a5e;font-size:14px;width:40%;">Referência</td>
            <td style="padding:8px 0;font-size:14px;font-weight:600;font-family:monospace;">REF #${ref}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#7a6a5e;font-size:14px;border-top:1px solid #e8dfd4;">Cliente</td>
            <td style="padding:8px 0;font-size:14px;border-top:1px solid #e8dfd4;">${booking.diner_name}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#7a6a5e;font-size:14px;border-top:1px solid #e8dfd4;">Contacto</td>
            <td style="padding:8px 0;font-size:14px;border-top:1px solid #e8dfd4;">${booking.diner_phone ?? '—'} · ${booking.diner_email}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#7a6a5e;font-size:14px;border-top:1px solid #e8dfd4;">Data</td>
            <td style="padding:8px 0;font-size:14px;border-top:1px solid #e8dfd4;">${dateStr}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#7a6a5e;font-size:14px;border-top:1px solid #e8dfd4;">Hora</td>
            <td style="padding:8px 0;font-size:14px;border-top:1px solid #e8dfd4;">${timeStr}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#7a6a5e;font-size:14px;border-top:1px solid #e8dfd4;">Pessoas</td>
            <td style="padding:8px 0;font-size:14px;border-top:1px solid #e8dfd4;">${booking.party_size}</td>
          </tr>
          ${booking.special_requests ? `
          <tr>
            <td style="padding:8px 0;color:#7a6a5e;font-size:14px;border-top:1px solid #e8dfd4;">Pedido especial</td>
            <td style="padding:8px 0;color:#c0392b;font-size:14px;font-weight:500;border-top:1px solid #e8dfd4;">⚠️ ${booking.special_requests}</td>
          </tr>` : ''}
        </table>
      </div>

      <a href="https://damesa.pt/pages/owner-dashboard.html" style="display:inline-block;padding:13px 28px;background:#1c1612;color:#fff;border-radius:10px;font-size:14px;text-decoration:none;">Ver painel →</a>
    </div>
    <div style="padding:24px 40px;border-top:1px solid #e8dfd4;text-align:center;">
      <p style="margin:0;color:#7a6a5e;font-size:12px;">Da Mesa · <a href="https://damesa.pt" style="color:#7a6a5e;">damesa.pt</a></p>
    </div>
  </div>
</body>
</html>`

    // Send both emails in parallel
    const sendEmail = async (to: string, subject: string, html: string) => {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: FROM, to: [to], subject, html }),
      })
      return res.json()
    }

    const emails = [
      sendEmail(
        booking.diner_email,
        `Reserva confirmada — ${restaurant.name} · REF #${ref}`,
        customerHtml
      )
    ]

    // Only email restaurant if they have an email address
    if (restaurant.email) {
      emails.push(sendEmail(
        restaurant.email,
        `Nova reserva — ${booking.diner_name} · ${dateStr} às ${timeStr}`,
        restaurantHtml
      ))
    }

    const results = await Promise.allSettled(emails)
    console.log('Email results:', JSON.stringify(results))

    return new Response(JSON.stringify({ success: true, results, bookingId: booking.id, referenceCode: booking.reference_code }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
