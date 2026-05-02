# CLAUDE.md — Da Mesa (damesa.pt)
## Complete Project Reference for Claude Code

This file is the single source of truth for the Da Mesa project.
Read this before doing anything. All context, credentials, architecture, and decisions are here.

---

## PROJECT OVERVIEW

**Da Mesa** (damesa.pt) — Portuguese restaurant reservation platform
- Public diners browse restaurants and book tables (no fees)
- Restaurant owners manage bookings via the owner app
- Super admin (Nabin) manages everything via superadmin panel

### User roles
- `super_admin` → Nabin — access via `/pages/superadmin.html` (PIN: `DaMesa@2026`)
- `restaurant_owner` → restaurant clients — access via `/pages/owner-dashboard.html` or DaMesa Partner APK
- Public / `diner` → customers browsing and booking (web only)

### Tech stack
- **Frontend**: Static HTML/CSS/JS (no build step, pure ES modules)
- **Backend/DB**: Supabase (PostgreSQL + Auth + Realtime + Storage + Edge Functions)
- **Email**: Resend (`reservas@damesa.pt`)
- **Push notifications**: Firebase FCM v1 (restaurant owner native app only)
- **Deployment**: GitHub (`main` branch) → GitHub Actions FTP → Hostinger (`public_html/`)
- **Partner APK**: Native Kotlin + WebView + FCM (package: `pt.damesa.partner`) — restaurant owners only

---

## LIVE CREDENTIALS & KEYS

```
Supabase Project:    jdkbywroucgwrfpirloa
Supabase URL:        https://jdkbywroucgwrfpirloa.supabase.co
Supabase Anon Key:   sb_publishable_rU5h79iwvA6wDozm72uvMg_zSFZAkkY   ← safe to use in frontend
Supabase Service Key: in .env only — NEVER in frontend
Supabase Mgmt API:   Bearer sbp_****  (generate at supabase.com/dashboard/account/tokens)

Resend API Key:      re_QLGjSm8i_PaRmWRTKih8of59vc55JVQDf
Resend From:         Da Mesa <reservas@damesa.pt>

Google OAuth:
  Client ID:   97445891733-fu5qeulpuqpk379t707f1pvlh7a6pb2k.apps.googleusercontent.com
  Redirect URI: https://jdkbywroucgwrfpirloa.supabase.co/auth/v1/callback

Firebase (FCM push for partner app):
  Project:     damesa-partner
  Service account secret: FIREBASE_SERVICE_ACCOUNT (stored in Supabase edge function secrets)

Android Keystore (partner APK signing):
  Path:     C:\Users\DNABINN\Desktop\Websites\Da Mesa\android.keystore
  Alias:    android
  Password: M3lh0R123!!!
  SHA-256:  54:8F:E2:0D:1A:C7:30:55:30:F6:21:52:FA:14:89:F1:CF:EF:16:B9:29:4D:00:AC:AC:56:70:E7:98:B7:95:9B
```

---

## DIRECTORY STRUCTURE

```
Da Mesa/
├── CLAUDE.md                        ← this file
├── .env                             ← never commit
├── .gitignore
├── .htaccess                        ← Apache rewrites (clean URLs, MIME types, SW cache)
├── android.keystore                 ← APK signing key (back this up!)
├── sw.js                            ← PWA service worker (cache-first)
├── offline.html                     ← PWA offline fallback
├── pages/
│   ├── index.html                   ← homepage
│   ├── restaurantes.html            ← restaurant listing
│   ├── restaurant.html              ← individual restaurant + booking widget
│   ├── cozinhas.html                ← browse by cuisine
│   ├── login.html                   ← auth (email + Google OAuth)
│   ├── dashboard.html               ← customer account + bookings
│   ├── owner-dashboard.html         ← restaurant owner panel (browser)
│   ├── owner-app.html               ← restaurant owner mobile app (loaded in partner APK)
│   ├── superadmin.html              ← super admin panel (PIN protected)
│   ├── privacy.html
│   └── terms.html
├── src/
│   └── js/
│       ├── supabase.js              ← Supabase client
│       ├── auth.js                  ← login/logout/guardRoute
│       ├── bookings.js              ← create/read/update bookings
│       ├── restaurants.js           ← fetch restaurant data + slot generation from opening_hours
│       ├── analytics.js             ← track events
│       └── cookies.js               ← cookie consent banner
├── supabase/
│   └── functions/
│       ├── send-booking-emails/     ← emails diner + restaurant on booking
│       ├── notify-owner/            ← FCM push + web push to restaurant owner
│       ├── send-contract/           ← generates + emails contract to restaurant
│       └── sign-contract/           ← handles contract signing page
├── partner/                         ← DaMesa Partner native Android app
│   ├── app/
│   │   ├── google-services.json     ← Firebase config (pt.damesa.partner)
│   │   ├── build.gradle
│   │   └── src/main/
│   │       ├── AndroidManifest.xml
│   │       └── java/pt/damesa/partner/
│   │           ├── MainActivity.kt          ← WebView + FCM token injection
│   │           ├── AndroidInterface.kt      ← JS bridge (window.AndroidInterface)
│   │           └── DaMesaFirebaseService.kt ← FCM message handler
│   ├── build.gradle
│   └── settings.gradle
├── .github/
│   └── workflows/
│       ├── deploy-functions.yml     ← auto-deploys edge functions on push
│       └── build-partner-apk.yml   ← builds + releases DaMesa Partner APK
└── assets/
    ├── manifest.json                ← PWA manifest (website, not APK)
    └── icons/                       ← icon-72 through icon-512 PNG
```

---

## URL STRUCTURE

All pages use root-relative paths (`/pages/login.html`, `/src/js/auth.js`).
Never use relative paths (`../src/js/auth.js`) — breaks clean URLs.

### Clean restaurant URLs
```
damesa.pt/restaurante/{city}/{slug}
e.g. damesa.pt/restaurante/lisboa/lumbini
```
Apache `.htaccess` rewrites this to `pages/restaurant.html?slug={slug}`.
Slug is read from `window.location.pathname`, NOT `?slug=` param.

### Page redirects
- `/` → `pages/index.html`
- `/*.html` → `pages/*.html`
- `/restaurante/{city}/{slug}` → `pages/restaurant.html?slug={slug}`

---

## SUPABASE DATABASE

### Key tables
| Table | Purpose |
|-------|---------|
| `profiles` | User profiles with `role` field |
| `restaurants` | Restaurant listings (slug, city, cuisine_type, status, email, owner_id, contract_status) |
| `bookings` | Reservations (diner_id, diner_email, restaurant_id, booking_date, booking_time, party_size, status, reference_code) |
| `opening_hours` | Per-day open/close times (day_of_week 0-6, open_time, close_time, is_closed) |
| `push_subscriptions` | FCM tokens + web push subscriptions for owner notifications |
| `contracts` | Restaurant contracts (token, status, signer_name, signed_at, signer_ip, contract_html) |
| `reviews` | Restaurant reviews (gated: only past diners) |
| `restaurant_photos` | Photos with `approved` flag |
| `menu_categories` / `menu_items` | Menu data |

### Bookings table columns
`id, restaurant_id, diner_id, diner_name, diner_email, diner_phone, booking_date, booking_time, party_size, special_requests, status, reference_code, reminder_sent, created_at, updated_at`

### RLS policies (important)
- Bookings INSERT: `true` (anyone can create)
- Bookings SELECT: `diner_id = auth.uid() OR diner_email = auth.jwt()->>'email'`
  - ⚠️ NEVER use `SELECT email FROM auth.users` in policies — permission denied. Use `auth.jwt()->>'email'` instead.
- Reviews/Photos: only users with past `confirmed`/`completed` booking at that restaurant

### Booking slot generation
Slots are derived from `opening_hours` table, NOT from `restaurants.available_times`.
`getAvailableSlots()` in `restaurants.js` generates 30-min slots per day of week,
last slot = closing_time minus 30 minutes. Falls back to `available_times` if no opening_hours set.

### Running SQL via Management API
```javascript
node -e "
const https = require('https')
const sql = 'YOUR SQL HERE'
const payload = JSON.stringify({ query: sql })
const req = https.request({
  hostname: 'api.supabase.com',
  path: '/v1/projects/jdkbywroucgwrfpirloa/database/query',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer sbp_****',   // your token from supabase.com/dashboard/account/tokens
    'Content-Length': Buffer.byteLength(payload)
  }
}, res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>console.log(d)) })
req.write(payload); req.end()
"
```

---

## AUTHENTICATION

### Roles & redirects
| Role | After login goes to | Notes |
|------|-------------------|-------|
| `super_admin` | `/pages/dashboard.html` | Access superadmin directly via URL |
| `restaurant_owner` | `/pages/owner-dashboard.html` | Partner APK loads owner-app.html |
| `diner` / any | `/pages/dashboard.html` | |

### `?return=` param
Login page respects `?return=/pages/restaurant.html` — redirects back after login.

### Superadmin PIN
`DaMesa@2026` — stored in `sessionStorage` (clears when tab closes).
Access superadmin directly at `damesa.pt/superadmin.html`.

### Superadmin impersonation
Click "Entrar como →" next to any restaurant → sets `localStorage.damesa_impersonate` → redirects to owner dashboard showing that restaurant's data.

---

## BOOKING FLOW

1. User selects date/time/party on restaurant page (step 1)
2. Past dates/times blocked in both UI and `createBooking()` (Lisbon timezone)
3. Time slots derived from `opening_hours` per day of week
4. If not logged in → redirect to login with `?return=` param
5. User fills name/email/phone (step 2) → confirm
6. `createBooking()` in `bookings.js` inserts to DB
7. Edge Function `send-booking-emails` → emails to diner + restaurant
8. Edge Function `notify-owner` → FCM push to partner app (or web push fallback)
9. Step 3 shown: confirmation screen with REF #

---

## PUSH NOTIFICATION SYSTEM

### Flow
Booking created → `notify-owner` edge function → checks `push_subscriptions` table:
- If `fcm_token` present → Firebase FCM v1 API (native partner app)
- If `subscription` present → web-push VAPID (browser fallback)

### FCM JWT signing (Deno edge function)
Must use base64url (not plain base64). `btoa()` gives standard base64 — always apply:
`.replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'')`

### Partner app auto-subscribe
`autoSubscribePush()` called in `bootApp()` — no manual tap needed.
Native: FCM token injected by `MainActivity.kt` via `window._fcmToken`.
Web: browser permission prompt shown automatically on first login.

---

## PARTNER APK (DaMesa Partner)

### What it is
Native Kotlin Android app (`pt.damesa.partner`) that wraps `owner-app.html` in a WebView.
Provides reliable FCM push notifications (bypasses battery optimization that kills Chrome).

### JS bridge
`window.AndroidInterface` exposed to the WebView:
- `isNativeApp()` → returns `true`
- `showToast(msg)` → native Android toast
- `refreshFcmToken()` → re-fetches FCM token

### Build (GitHub Actions auto-builds on partner/** push)
Uses existing `KEYSTORE_BASE64`, `KEY_ALIAS`, `KEY_STORE_PASSWORD` secrets.
Latest APK always at: https://github.com/dnabinn/damesa.pt/releases (tag: `partner-apk-*`)

---

## EMAIL SYSTEM

Edge Functions (all deployed via GitHub Actions on push to `supabase/functions/**`):
- `send-booking-emails` — confirmation to diner + restaurant
- `notify-owner` — FCM/web-push notification to owner
- `send-contract` — generates HTML contract + sends signing link
- `sign-contract` — handles signature, updates DB, sends confirmation

---

## ACTIVE RESTAURANTS (9 total)

| Name | Slug | Email |
|------|------|-------|
| Lumbini | `lumbini` | reservas@lumbini.pt |
| Namaste Curry House | `namaste-curry-house` | info@namastecurryhouse.pt |
| Ola Nepal House | `ola-nepal-house` | info@olanepalhous.pt |
| Bhetghat Restaurante | `bhetghat-restaurante` | info@bhetghat.pt |
| Lisbon Sekuwa Corner | `lisbon-sekuwa-corner` | info@lisbonsekuwacorner.pt |
| The Mandala House | `mandala-house` | info@mandalahouse.pt |
| Darshan Nepal | `darshan-nepal` | info@darshannepal.pt |
| Chwassa MoMo & Grill | `chwassa-momo-grill` | *(no email yet)* |
| Sabor do Nepal | `sabor-do-nepal` | *(no email yet)* |

---

## DEPLOYMENT

### How it works
Push to `main` branch → GitHub Actions:
1. `deploy.yml` → FTP uploads to Hostinger `public_html/`
2. `deploy-functions.yml` → deploys edge functions (only when `supabase/functions/**` changes)
3. `build-partner-apk.yml` → builds partner APK (only when `partner/**` changes)

### Deploy command
```bash
git add -A && git commit -m "your message" && git push origin main
```

---

## CRITICAL RULES FOR CLAUDE CODE

1. **All JS imports must be root-relative**: `/src/js/auth.js` NOT `../src/js/auth.js`
2. **No top-level `return` in ES modules** — wrap script body in `(async () => { ... })()`
3. **Never rewrite full HTML pages** — only add/edit `<script>` blocks and small HTML changes
4. **Never expose service role key** in frontend JS
5. **Supabase anon key IS safe** to use in frontend (RLS protects data)
6. **`prompt()` is blocked** by Chrome — use overlay forms instead
7. **Restaurant slug from pathname** not `?slug=` param (clean URL rewrite strips query)
8. **Cache busting**: use `?v=N` on JS imports when debugging stale files
9. **RLS policies**: never reference `auth.users` directly — use `auth.jwt()->>'email'` or `auth.uid()`
10. **Booking dates**: always use Lisbon timezone; past dates/times blocked in UI + `createBooking()`

---

## KNOWN ISSUES & FIXES

| Issue | Fix |
|-------|-----|
| Booking error "permission denied for table users" | RLS policy was using `SELECT FROM auth.users` — changed to `auth.jwt()->>'email'` |
| "Illegal return statement" in ES modules | Wrap all code after imports in `(async () => { })()` |
| Clean URL slug is empty | Read from `window.location.pathname.split('/')` not `?slug=` |
| Superadmin restaurants not loading | Removed `profiles` join (RLS blocks cross-user profile reads) |
| `prompt()` blocked | Replaced with PIN overlay form using `Promise` |
| FCM notifications not sent | JWT must be base64url not base64 — apply replace(+→- /→_ =→'') after btoa() |
| Push subscription not saving | Check both browser sub AND DB record before toggling direction |

---

*Da Mesa · Lisboa, Portugal · Updated May 2026*
