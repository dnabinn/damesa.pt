# CLAUDE.md — Da Mesa (damesa.pt)
## Complete Project Reference for Claude Code

This file is the single source of truth for the Da Mesa project.
Read this before doing anything. All context, credentials, architecture, and decisions are here.

---

## PROJECT OVERVIEW

**Da Mesa** (damesa.pt) — Portuguese restaurant reservation platform
- Public diners browse restaurants and book tables (no fees)
- Restaurant owners manage bookings via owner dashboard
- Super admin (Nabin) manages everything via superadmin panel

### User roles
- `super_admin` → Nabin — access via `/pages/superadmin.html` (PIN: `DaMesa@2026`)
- `restaurant_owner` → restaurant clients — access via `/pages/owner-dashboard.html`
- Public / `diner` → customers browsing and booking

### Tech stack
- **Frontend**: Static HTML/CSS/JS (no build step, pure ES modules)
- **Backend/DB**: Supabase (PostgreSQL + Auth + Realtime + Storage + Edge Functions)
- **Email**: Resend (`reservas@damesa.pt`)
- **SMS**: Twilio (not yet configured)
- **Deployment**: GitHub (`main` branch) → GitHub Actions FTP → Hostinger (`public_html/`)
- **Android APK**: TWA via Bubblewrap (package: `pt.damesa.pwa`)

---

## LIVE CREDENTIALS & KEYS

```
Supabase Project:    jdkbywroucgwrfpirloa
Supabase URL:        https://jdkbywroucgwrfpirloa.supabase.co
Supabase Anon Key:   sb_publishable_rU5h79iwvA6wDozm72uvMg_zSFZAkkY   ← safe to use in frontend
Supabase Service Key: in .env only — NEVER in frontend
Supabase Mgmt API:   Bearer sbp_2f9ef9884322d9e199cca9c2c4c4ea7f5ba5facb

Resend API Key:      re_QLGjSm8i_PaRmWRTKih8of59vc55JVQDf
Resend From:         Da Mesa <reservas@damesa.pt>

Google OAuth:
  Client ID:   97445891733-fu5qeulpuqpk379t707f1pvlh7a6pb2k.apps.googleusercontent.com
  Redirect URI: https://jdkbywroucgwrfpirloa.supabase.co/auth/v1/callback

Android Keystore:
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
├── .well-known/
│   └── assetlinks.json              ← TWA Android verification
├── sw.js                            ← PWA service worker (cache-first)
├── offline.html                     ← PWA offline fallback
├── twa-manifest.json                ← Bubblewrap TWA config
├── gradle.properties                ← Gradle JVM heap: -Xmx512m (must stay 512m)
├── local.properties                 ← sdk.dir=C:\\Android
├── android.keystore                 ← APK signing key (back this up!)
├── pages/
│   ├── index.html                   ← homepage
│   ├── restaurantes.html            ← restaurant listing
│   ├── restaurant.html              ← individual restaurant + booking widget
│   ├── cozinhas.html                ← browse by cuisine
│   ├── login.html                   ← auth (email + Google OAuth)
│   ├── dashboard.html               ← customer account + bookings
│   ├── owner-dashboard.html         ← restaurant owner panel
│   ├── superadmin.html              ← super admin panel (PIN protected)
│   ├── privacy.html
│   └── terms.html
├── src/
│   └── js/
│       ├── supabase.js              ← Supabase client
│       ├── auth.js                  ← login/logout/guardRoute
│       ├── bookings.js              ← create/read/update bookings
│       ├── restaurants.js           ← fetch restaurant data
│       ├── analytics.js             ← track events
│       └── cookies.js               ← cookie consent banner
├── supabase/
│   └── functions/
│       └── send-booking-emails/     ← Edge Function (deployed ✅)
│           └── index.ts             ← sends email to diner + restaurant via Resend
├── assets/
│   ├── manifest.json                ← PWA manifest (start_url: "/", 8 icon sizes)
│   ├── icons/                       ← icon-72 through icon-512 PNG
│   └── screenshots/
└── generate-icons-pure.js           ← regenerate icons with: node generate-icons-pure.js
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
| `restaurants` | Restaurant listings (slug, city, cuisine_type, status, email, owner_id) |
| `bookings` | Reservations (diner_id, diner_email, restaurant_id, booking_date, booking_time, party_size, status, reference_code) |
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
    'Authorization': 'Bearer sbp_2f9ef9884322d9e199cca9c2c4c4ea7f5ba5facb',
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
| `restaurant_owner` | `/pages/owner-dashboard.html` | |
| `diner` / any | `/pages/dashboard.html` | |

### `?return=` param
Login page respects `?return=/pages/restaurant.html` — redirects back after login.

### Nav "Entrar" button
Public pages check session on load. If logged in: shows "A minha conta" → `/pages/dashboard.html`.
If not logged in: shows "Entrar" → `/pages/login.html`.

### Superadmin PIN
`DaMesa@2026` — stored in `sessionStorage` (clears when tab closes).
Access superadmin directly at `damesa.pt/superadmin.html`.

### Superadmin impersonation
Click "Entrar como →" next to any restaurant → sets `localStorage.damesa_impersonate` → redirects to owner dashboard showing that restaurant's data.

---

## BOOKING FLOW

1. User selects date/time/party on restaurant page (step 1)
2. If not logged in → redirect to login with `?return=` param
3. User fills name/email/phone (step 2) → confirm
4. `createBooking()` in `bookings.js` inserts to DB with `diner_id`
5. Edge Function `send-booking-emails` called with `bookingId`
6. Two emails sent:
   - **Customer**: confirmation with ref, date, time, address
   - **Restaurant**: new booking notification with client details
7. Step 3 shown: confirmation screen with REF #

---

## EMAIL SYSTEM

Edge Function: `supabase/functions/send-booking-emails/index.ts` (deployed ✅)
- Called from `bookings.js` `sendBookingConfirmation()`
- Fetches full booking + restaurant from DB using service role
- Sends branded HTML emails via Resend
- Restaurant email only sent if `restaurants.email` is not null

### Deploy edge function
```bash
npx supabase functions deploy send-booking-emails --project-ref jdkbywroucgwrfpirloa --no-verify-jwt
```

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

## PWA & ANDROID APK

### PWA
- Service worker: `sw.js` (cache-first, offline fallback)
- Manifest: `assets/manifest.json` (start_url: `/`, 8 icon sizes)
- SW registered in: index.html, restaurantes.html, restaurant.html, login.html

### Android APK
- Built with Bubblewrap TWA
- Package: `pt.damesa.pwa`
- `gradle.properties`: must keep `org.gradle.jvmargs=-Xmx512m` (system RAM limit)
- `local.properties`: `sdk.dir=C:\\Android`

### Rebuild APK
```powershell
# In project folder:
$env:JAVA_HOME = "C:\Users\DNABINN\.bubblewrap\jdk\jdk-17.0.11+9"
$env:PATH = "$env:JAVA_HOME\bin;" + $env:PATH
.\gradlew.bat assembleRelease

# Then zipalign + sign:
C:\Users\DNABINN\.bubblewrap\android_sdk\build-tools\34.0.0\zipalign.exe -v -p 4 app\build\outputs\apk\release\app-release-unsigned.apk app-aligned.apk
C:\Users\DNABINN\.bubblewrap\android_sdk\build-tools\34.0.0\apksigner.bat sign --ks android.keystore --ks-key-alias android --ks-pass pass:"M3lh0R123!!!" --key-pass pass:"M3lh0R123!!!" --out app-release-signed.apk app-aligned.apk
```

---

## DEPLOYMENT

### How it works
Push to `main` branch → GitHub Actions runs `.github/workflows/deploy.yml` → FTP uploads to Hostinger `public_html/`

### Deploy command
```bash
git add -A && git commit -m "your message" && git push origin main
```

### Branch strategy
- `dev` — work in progress
- `main` — production (auto-deploys to damesa.pt)

### Always merge dev → main to deploy
```bash
git checkout main && git merge dev && git push origin main
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
10. **Gradle heap**: keep `org.gradle.jvmargs=-Xmx512m` in `gradle.properties` (Bubblewrap resets it — fix before each build)

---

## KNOWN ISSUES & FIXES

| Issue | Fix |
|-------|-----|
| Booking error "permission denied for table users" | RLS policy was using `SELECT FROM auth.users` — changed to `auth.jwt()->>'email'` |
| "Illegal return statement" in ES modules | Wrap all code after imports in `(async () => { })()` |
| Clean URL slug is empty | Read from `window.location.pathname.split('/')` not `?slug=` |
| Superadmin restaurants not loading | Removed `profiles` join (RLS blocks cross-user profile reads) |
| `prompt()` blocked | Replaced with PIN overlay form using `Promise` |
| Gradle "could not reserve heap space" | Set `-Xmx512m` in `gradle.properties` (Bubblewrap resets to 1536m) |
| APK "invalid package" error | Must zipalign before signing; also uninstall previous APK first |

---

*Da Mesa · Lisboa, Portugal · Updated April 2026*
