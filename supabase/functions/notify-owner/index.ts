import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// base64 → base64url (JWT requires base64url, btoa() gives standard base64)
function toBase64url(b64: string): string {
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function jsonToBase64url(obj: object): string {
  return toBase64url(btoa(JSON.stringify(obj)))
}

// Send a push via Firebase Cloud Messaging v1 HTTP API
async function sendFcmNotification(fcmToken: string, title: string, body: string) {
  const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
  if (!serviceAccountJson) throw new Error('FIREBASE_SERVICE_ACCOUNT not set')

  const sa = JSON.parse(serviceAccountJson)

  // Build a JWT for Google OAuth2 access token (all parts must be base64url, not base64)
  const now = Math.floor(Date.now() / 1000)
  const header = jsonToBase64url({ alg: 'RS256', typ: 'JWT' })
  const claim  = jsonToBase64url({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })

  // Sign with RSA-SHA256 using the service account private key
  const pemKey = sa.private_key
  const keyData = pemKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\n/g, '')
  const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0))
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  )
  const signingInput = `${header}.${claim}`
  const sigBytes = new Uint8Array(await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(signingInput)
  ))
  // Convert signature bytes to base64url without spread (avoids stack overflow on large arrays)
  let sigBin = ''
  for (let i = 0; i < sigBytes.length; i++) sigBin += String.fromCharCode(sigBytes[i])
  const jwt = `${signingInput}.${toBase64url(btoa(sigBin))}`

  // Exchange JWT for access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  })
  const tokenJson = await tokenRes.json()
  if (!tokenJson.access_token) {
    throw new Error(`FCM auth failed: ${JSON.stringify(tokenJson)}`)
  }
  const { access_token } = tokenJson

  // Send FCM message
  const projectId = sa.project_id
  const fcmRes = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        token: fcmToken,
        notification: { title, body },
        android: {
          priority: 'high',
          notification: {
            channel_id: 'damesa_bookings',
            sound: 'default',
          }
        },
      }
    }),
  })

  if (!fcmRes.ok) {
    const err = await fcmRes.text()
    throw new Error(`FCM error: ${err}`)
  }
  return fcmRes.ok
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { bookingId } = await req.json()
    if (!bookingId) return new Response('Missing bookingId', { status: 400 })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Fetch booking + restaurant
    const { data: booking, error: bErr } = await supabase
      .from('bookings')
      .select('*, restaurants(id, name, owner_id)')
      .eq('id', bookingId)
      .single()

    if (bErr || !booking) return new Response('Booking not found', { status: 404 })

    const ownerId = booking.restaurants?.owner_id
    if (!ownerId) return new Response(JSON.stringify({ sent: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // Get all push subscriptions for this owner
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('id, subscription, fcm_token')
      .eq('user_id', ownerId)

    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: 'no subscriptions' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const timeStr = booking.booking_time ? booking.booking_time.slice(0, 5) : ''
    const notifTitle = `🍽️ Nova reserva — ${booking.restaurants.name}`
    const notifBody = `${booking.diner_name} · ${booking.party_size} pessoa${booking.party_size !== 1 ? 's' : ''} · ${booking.booking_date} ${timeStr}`

    const payload = JSON.stringify({
      title: notifTitle,
      body: notifBody,
      url: '/pages/owner-dashboard.html',
      bookingId: booking.id,
      tag: `booking-${booking.id}`
    })

    // Configure VAPID for web push
    webpush.setVapidDetails(
      'mailto:ola@damesa.pt',
      Deno.env.get('VAPID_PUBLIC_KEY')!,
      Deno.env.get('VAPID_PRIVATE_KEY')!
    )

    let sent = 0
    const expired: string[] = []

    for (const sub of subs) {
      try {
        if (sub.fcm_token) {
          // Native app: use FCM v1
          await sendFcmNotification(sub.fcm_token, notifTitle, notifBody)
          sent++
        } else if (sub.subscription) {
          // Browser: use web-push (VAPID)
          await webpush.sendNotification(sub.subscription, payload)
          sent++
        }
      } catch (e: any) {
        console.error('Push error:', e.message)
        // 410 Gone = subscription expired, remove it
        if (e.statusCode === 410 || e.statusCode === 404) {
          expired.push(sub.id)
        }
      }
    }

    // Clean up expired subscriptions
    if (expired.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', expired)
    }

    return new Response(JSON.stringify({ sent, expired: expired.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('notify-owner error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
