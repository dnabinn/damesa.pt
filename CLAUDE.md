# CLAUDE.md — Mesa.pt + RestaurantOS
## Complete Backend Wiring & Deployment Guide

This file instructs Claude Code on how to wire the full backend for Mesa.pt and RestaurantOS.
All frontend HTML pages are already built. This file covers:
1. Project structure
2. Supabase setup (schema already created)
3. Google OAuth
4. Booking system (write to DB)
5. Twilio SMS
6. Resend email
7. Environment variables
8. GitHub → Hostinger deployment

---

## PROJECT OVERVIEW

**Mesa.pt** — public diner-facing portal (browse restaurants, book tables)
**RestaurantOS** — B2B SaaS platform sold to restaurant owners

### Two user roles
- `super_admin` → you (Nabin) — full platform access via superadmin.html
- `restaurant_owner` → your clients — access via owner-dashboard.html
- Public (no login) → diners browsing mesa.pt and booking

### Tech stack
- **Frontend**: HTML/CSS/JS (static files)
- **Backend/DB**: Supabase (PostgreSQL + Auth + Realtime)
- **SMS**: Twilio
- **Email**: Resend
- **Deployment**: GitHub → Hostinger (shared hosting, static files)

---

## DIRECTORY STRUCTURE

```
mesa-pt/
├── CLAUDE.md                  ← this file
├── .env                       ← never commit this
├── .gitignore
├── package.json
├── src/
│   ├── js/
│   │   ├── supabase.js        ← Supabase client init
│   │   ├── auth.js            ← login/logout/session
│   │   ├── bookings.js        ← create/read/update bookings
│   │   ├── restaurants.js     ← fetch restaurant data
│   │   ├── menu.js            ← fetch/update menu items
│   │   ├── analytics.js       ← track events
│   │   └── notifications.js   ← trigger SMS + email
│   └── api/
│       ├── send-sms.js        ← Twilio SMS endpoint (Netlify/Edge fn)
│       ├── send-email.js      ← Resend email endpoint
│       └── reminders.js       ← scheduled reminders cron
├── pages/
│   ├── index.html
│   ├── restaurantes.html
│   ├── restaurant.html
│   ├── cozinhas.html
│   ├── login.html
│   ├── dashboard.html
│   ├── owner-dashboard.html
│   └── superadmin.html
├── sql/
│   ├── schema.sql             ← full Supabase schema
│   └── seed_restaurants.sql   ← 28 restaurant seed data
└── assets/
    ├── icons/                 ← PWA icons
    └── manifest.json          ← PWA manifest
```

---

## STEP 1 — ENVIRONMENT VARIABLES

Create `.env` file (never commit):

```env
# Supabase
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_role_key_here

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+351XXXXXXXXX

# Resend
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=reservas@mesa.pt

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com

# App
APP_URL=https://mesa.pt
```

Add to `.gitignore`:
```
.env
node_modules/
.DS_Store
```

---

## STEP 2 — SUPABASE SETUP

### 2a. Run the schema
Go to Supabase Dashboard → SQL Editor → paste and run `sql/schema.sql`
Then run `sql/seed_restaurants.sql` to populate the 28 restaurants.

### 2b. Set yourself as super admin
After signing up with your email:
```sql
UPDATE profiles SET role = 'super_admin' WHERE id = 'YOUR-AUTH-UUID';
```
Find your UUID: Supabase Dashboard → Authentication → Users

### 2c. Enable Google OAuth
Supabase Dashboard → Authentication → Providers → Google
- Enable Google
- Add Client ID and Secret from Google Cloud Console
- Authorised redirect URI: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`

---

## STEP 3 — SUPABASE JS CLIENT

Create `src/js/supabase.js`:

```javascript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co'
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
```

---

## STEP 4 — AUTHENTICATION (auth.js)

```javascript
import { supabase } from './supabase.js'

// Google OAuth login
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/pages/login.html`
    }
  })
  if (error) console.error('Google login error:', error)
}

// Email + password login
export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error }
  return { user: data.user }
}

// Email + password register
export async function signUpWithEmail(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } }
  })
  if (error) return { error }
  return { user: data.user }
}

// Get current session
export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

// Get current user profile + role
export async function getCurrentProfile() {
  const session = await getSession()
  if (!session) return null
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()
  return data
}

// Sign out
export async function signOut() {
  await supabase.auth.signOut()
  window.location.href = '/pages/login.html'
}

// Route guard — redirect based on role
export async function guardRoute() {
  const profile = await getCurrentProfile()
  if (!profile) {
    window.location.href = '/pages/login.html'
    return
  }
  const path = window.location.pathname
  if (path.includes('superadmin') && profile.role !== 'super_admin') {
    window.location.href = '/pages/dashboard.html'
  }
  if (path.includes('owner-dashboard') && profile.role !== 'restaurant_owner' && profile.role !== 'super_admin') {
    window.location.href = '/pages/dashboard.html'
  }
  return profile
}
```

---

## STEP 5 — BOOKINGS (bookings.js)

```javascript
import { supabase } from './supabase.js'

// Create a new booking (called from restaurant.html booking widget)
export async function createBooking(bookingData) {
  const {
    restaurantId, dinerName, dinerEmail, dinerPhone,
    bookingDate, bookingTime, partySize, specialRequests
  } = bookingData

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      restaurant_id: restaurantId,
      diner_name: dinerName,
      diner_email: dinerEmail,
      diner_phone: dinerPhone,
      booking_date: bookingDate,
      booking_time: bookingTime,
      party_size: partySize,
      special_requests: specialRequests,
      status: 'pending'
    })
    .select()
    .single()

  if (error) return { error }

  // Trigger SMS + email confirmations
  await sendBookingConfirmation(data)
  return { booking: data }
}

// Send confirmation (calls edge functions)
async function sendBookingConfirmation(booking) {
  // SMS to diner
  await fetch('/api/send-sms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: booking.diner_phone,
      message: `✅ Reserva confirmada! ${booking.reference_code} - ${booking.booking_date} às ${booking.booking_time}. Mesa.pt`
    })
  })

  // Email to diner
  await fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: booking.diner_email,
      subject: `Reserva confirmada — ${booking.reference_code}`,
      bookingId: booking.id
    })
  })
}

// Get bookings for a restaurant (owner dashboard)
export async function getRestaurantBookings(restaurantId, date = null) {
  let query = supabase
    .from('bookings')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('booking_date', { ascending: true })
    .order('booking_time', { ascending: true })

  if (date) query = query.eq('booking_date', date)

  const { data, error } = await query
  return { bookings: data, error }
}

// Update booking status
export async function updateBookingStatus(bookingId, status) {
  const { data, error } = await supabase
    .from('bookings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', bookingId)
    .select()
    .single()
  return { booking: data, error }
}

// Subscribe to real-time booking updates (owner dashboard)
export function subscribeToBookings(restaurantId, callback) {
  return supabase
    .channel('bookings-channel')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'bookings',
      filter: `restaurant_id=eq.${restaurantId}`
    }, callback)
    .subscribe()
}
```

---

## STEP 6 — RESTAURANTS (restaurants.js)

```javascript
import { supabase } from './supabase.js'

// Fetch all active restaurants (public)
export async function getRestaurants(filters = {}) {
  let query = supabase
    .from('restaurants')
    .select(`
      *,
      opening_hours(*),
      menu_categories(*, menu_items(*))
    `)
    .eq('status', 'active')
    .order('name')

  if (filters.cuisine) query = query.eq('cuisine_type', filters.cuisine)
  if (filters.city) query = query.eq('city', filters.city)

  const { data, error } = await query
  return { restaurants: data, error }
}

// Fetch single restaurant by slug (restaurant page)
export async function getRestaurantBySlug(slug) {
  const { data, error } = await supabase
    .from('restaurants')
    .select(`
      *,
      opening_hours(*),
      menu_categories(*, menu_items(*))
    `)
    .eq('slug', slug)
    .eq('status', 'active')
    .single()
  return { restaurant: data, error }
}

// Get available time slots for a date
export async function getAvailableSlots(restaurantId, date) {
  const { data: bookings } = await supabase
    .from('bookings')
    .select('booking_time, party_size')
    .eq('restaurant_id', restaurantId)
    .eq('booking_date', date)
    .in('status', ['pending', 'confirmed'])

  // Generate slots every 30 min from opening hours
  // Return slots with booked counts
  const allSlots = ['19:00','19:30','20:00','20:30','21:00','21:30','22:00','22:30','23:00']
  return allSlots.map(slot => ({
    time: slot,
    booked: bookings?.filter(b => b.booking_time === slot + ':00').reduce((sum, b) => sum + b.party_size, 0) || 0
  }))
}
```

---

## STEP 7 — SMS WITH TWILIO (api/send-sms.js)

Deploy as a Netlify Function or Supabase Edge Function:

```javascript
// For Supabase Edge Function: supabase/functions/send-sms/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { to, message } = await req.json()

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
      body: new URLSearchParams({ To: to, From: fromNumber, Body: message })
    }
  )

  const result = await response.json()
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

Deploy:
```bash
supabase functions deploy send-sms
```

---

## STEP 8 — EMAIL WITH RESEND (api/send-email.js)

```javascript
// supabase/functions/send-email/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { to, subject, bookingId } = await req.json()
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Mesa.pt <reservas@mesa.pt>',
      to: [to],
      subject,
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:32px;">
          <h1 style="font-family:Georgia,serif;color:#1c1612;">✅ Reserva Confirmada</h1>
          <p style="color:#7a6a5e;">A sua reserva foi confirmada com sucesso.</p>
          <div style="background:#f3ede3;border-radius:8px;padding:20px;margin:20px 0;">
            <p><strong>Referência:</strong> #${bookingId}</p>
          </div>
          <p style="color:#7a6a5e;font-size:12px;">Mesa.pt — Sem taxas de reserva</p>
        </div>
      `
    })
  })

  const result = await response.json()
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

Deploy:
```bash
supabase functions deploy send-email
```

---

## STEP 9 — REMINDER CRON (api/reminders.js)

Set up in Supabase Dashboard → Database → Extensions → pg_cron
Or use a Supabase Edge Function triggered by a cron:

```sql
-- Run every hour: find bookings in 24h and send reminders
SELECT cron.schedule(
  'send-reminders',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/send-reminders',
    headers := '{"Authorization": "Bearer SERVICE_KEY"}'::jsonb
  )
  $$
);
```

---

## STEP 10 — WIRE LOGIN PAGE

In `login.html`, replace the placeholder JS functions:

```html
<script type="module">
  import { signInWithGoogle, signInWithEmail, signUpWithEmail } from '../src/js/auth.js'

  // Google button
  document.querySelector('.google-btn').addEventListener('click', signInWithGoogle)

  // Email login form
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = e.target.email.value
    const password = e.target.password.value
    const { user, error } = await signInWithEmail(email, password)
    if (error) showError(error.message)
    else redirectByRole(user)
  })

  // Register form
  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const { user, error } = await signUpWithEmail(
      e.target.email.value,
      e.target.password.value,
      e.target.fullname.value
    )
    if (error) showError(error.message)
    else window.location.href = '/pages/dashboard.html'
  })

  async function redirectByRole(user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile.role === 'super_admin') window.location.href = '/pages/superadmin.html'
    else if (profile.role === 'restaurant_owner') window.location.href = '/pages/owner-dashboard.html'
    else window.location.href = '/pages/dashboard.html'
  }
</script>
```

---

## STEP 11 — WIRE BOOKING WIDGET

In `restaurant.html`, replace `goS(3)` call with real booking:

```html
<script type="module">
  import { createBooking } from '../src/js/bookings.js'

  async function submitBooking() {
    const result = await createBooking({
      restaurantId: RESTAURANT_ID, // from URL param or data attribute
      dinerName: document.querySelector('input[placeholder*="nome"]').value,
      dinerEmail: document.querySelector('input[type="email"]').value,
      dinerPhone: document.querySelector('input[type="tel"]').value,
      bookingDate: document.getElementById('bdate').value,
      bookingTime: document.querySelector('.sl.sel')?.textContent,
      partySize: parseInt(document.querySelector('.pb.sel')?.textContent) || 2,
      specialRequests: document.querySelector('input[placeholder*="Alergias"]').value
    })

    if (result.error) {
      alert('Erro ao criar reserva: ' + result.error.message)
      return
    }

    // Show confirmation with real reference
    document.querySelector('.conf-ref').textContent = `REF #${result.booking.reference_code}`
    goS(3)
  }

  // Hook into the confirm button
  document.querySelector('#bs2 .bcta').addEventListener('click', submitBooking)
</script>
```

---

## STEP 12 — WIRE OWNER DASHBOARD

In `owner-dashboard.html`, replace mock data with real Supabase queries:

```html
<script type="module">
  import { guardRoute } from '../src/js/auth.js'
  import { getRestaurantBookings, subscribeToBookings, updateBookingStatus } from '../src/js/bookings.js'
  import { supabase } from '../src/js/supabase.js'

  // Guard: must be restaurant_owner or super_admin
  const profile = await guardRoute()

  // Get this owner's restaurant
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_id', profile.id)
    .single()

  document.querySelector('.tn-rest-name').textContent = restaurant.name

  // Load today's bookings
  const today = new Date().toISOString().split('T')[0]
  const { bookings } = await getRestaurantBookings(restaurant.id, today)
  renderTodayBookings(bookings) // existing render function, pass real data

  // Real-time updates — new bookings appear instantly
  subscribeToBookings(restaurant.id, () => {
    getRestaurantBookings(restaurant.id, today).then(({ bookings }) => {
      renderTodayBookings(bookings)
    })
  })
</script>
```

---

## STEP 13 — DEPLOYMENT TO HOSTINGER

### Option A: GitHub Actions (recommended)
Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Hostinger

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy via FTP to Hostinger
        uses: SamKirkland/FTP-Deploy-Action@v4.3.4
        with:
          server: ${{ secrets.FTP_HOST }}
          username: ${{ secrets.FTP_USER }}
          password: ${{ secrets.FTP_PASSWORD }}
          local-dir: ./pages/
          server-dir: /public_html/
```

Add to GitHub Secrets:
- `FTP_HOST` — your Hostinger FTP host (e.g. `ftp.mesa.pt`)
- `FTP_USER` — your Hostinger FTP username
- `FTP_PASSWORD` — your Hostinger FTP password

### Option B: Manual deploy
```bash
# Build (if using any bundling)
npm run build

# Upload via FileZilla or Hostinger File Manager
# Upload /pages/* to /public_html/
# Upload /src/js/* to /public_html/src/js/
# Upload /assets/* to /public_html/assets/
```

---

## STEP 14 — SUPABASE EDGE FUNCTIONS ENV VARS

Set in Supabase Dashboard → Edge Functions → Manage Secrets:

```bash
supabase secrets set TWILIO_ACCOUNT_SID=ACxxxxxxxx
supabase secrets set TWILIO_AUTH_TOKEN=xxxxxxxx
supabase secrets set TWILIO_PHONE_NUMBER=+351xxxxxxxx
supabase secrets set RESEND_API_KEY=re_xxxxxxxx
```

---

## STEP 15 — DOMAIN SETUP

In Hostinger control panel:
1. Point `mesa.pt` → your Hostinger hosting
2. Point `app.restaurantos.pt` → same hosting (owner/admin dashboards)
3. Enable SSL (free with Hostinger)
4. In Supabase → Authentication → URL Configuration:
   - Site URL: `https://mesa.pt`
   - Redirect URLs: `https://mesa.pt/pages/login.html`

---

## LAUNCH CHECKLIST

- [ ] Supabase schema running
- [ ] 28 restaurants seeded
- [ ] Super admin role set
- [ ] Google OAuth configured
- [ ] Supabase env vars set
- [ ] Edge Functions deployed (send-sms, send-email, reminders)
- [ ] Twilio account active + Portuguese number
- [ ] Resend domain verified (mesa.pt)
- [ ] GitHub Actions FTP deploy working
- [ ] SSL active on mesa.pt
- [ ] Test end-to-end booking flow
- [ ] Test SMS confirmation received
- [ ] Test email confirmation received
- [ ] Test owner dashboard real-time update
- [ ] Test Google login

---

## NOTES FOR CLAUDE CODE

- All HTML pages are in `/pages/` — do NOT rewrite them, only add `<script type="module">` blocks
- Supabase JS v2 can be loaded via ESM: `https://esm.sh/@supabase/supabase-js@2`
- No build step needed — pure ES modules work in modern browsers
- The Supabase anon key is safe to expose in frontend JS (RLS protects the data)
- NEVER expose the service role key in frontend code
- SMS reminders should fire 24 hours before booking_date + booking_time
- Restaurant slug is used as URL param: `restaurant.html?slug=taberna-do-largo`
- All financial transactions (subscription payments) handled by Stripe — do not implement card processing in JS

---

*Generated by Claude · Mesa.pt + RestaurantOS · Lisboa, Portugal*
