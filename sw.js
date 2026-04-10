// Da Mesa — Service Worker v1.3
// Strategy:
//   - Shell (HTML pages, JS, CSS) → Cache First, fall back to network
//   - Images → Cache First with 7-day expiry
//   - Supabase API calls → Network First (never cache)
//   - Offline fallback → /offline.html

const CACHE_NAME = 'damesa-v2'
const OFFLINE_URL = '/offline.html'

const PRECACHE = [
  '/',
  '/pages/index.html',
  '/pages/restaurantes.html',
  '/pages/login.html',
  '/pages/dashboard.html',
  '/src/js/supabase.js',
  '/src/js/auth.js',
  '/src/js/restaurants.js',
  '/src/js/bookings.js',
  '/assets/manifest.json',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/offline.html'
]

// ── Install ─────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache what we can; ignore failures for optional assets
      return Promise.allSettled(PRECACHE.map(url => cache.add(url)))
    }).then(() => self.skipWaiting())
  )
})

// ── Activate ────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// ── Fetch ────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET, chrome-extension, and Supabase/API calls
  if (request.method !== 'GET') return
  if (url.protocol === 'chrome-extension:') return
  if (url.hostname.includes('supabase.co')) return
  if (url.hostname.includes('twilio.com')) return
  if (url.hostname.includes('resend.com')) return
  if (url.pathname.startsWith('/api/')) return
  if (url.hostname.includes('esm.sh')) return

  // Images — cache first, up to 7 days
  if (request.destination === 'image') {
    event.respondWith(cacheFirstWithExpiry(request, 7 * 24 * 60 * 60 * 1000))
    return
  }

  // Everything else — cache first, fall back to network, fall back to offline
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached

      return fetch(request).then(response => {
        // Only cache successful same-origin responses
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
        }
        return response
      }).catch(() => {
        // Offline fallback for HTML navigation
        if (request.mode === 'navigate') {
          return caches.match(OFFLINE_URL)
        }
        return new Response('', { status: 408, statusText: 'Offline' })
      })
    })
  )
})

// ── Helper: cache-first with expiry ─────────────────────────────────
async function cacheFirstWithExpiry(request, maxAgeMs) {
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(request)

  if (cached) {
    const dateHeader = cached.headers.get('date')
    if (dateHeader) {
      const age = Date.now() - new Date(dateHeader).getTime()
      if (age < maxAgeMs) return cached
    } else {
      return cached // No date header, trust it
    }
  }

  try {
    const response = await fetch(request)
    if (response.ok) cache.put(request, response.clone())
    return response
  } catch {
    return cached || new Response('', { status: 408, statusText: 'Offline' })
  }
}

// ── Push Notifications (future) ───────────────────────────────────
self.addEventListener('push', event => {
  const data = event.data?.json() ?? {}
  const title = data.title || 'Da Mesa'
  const options = {
    body: data.body || 'Tens uma nova notificação.',
    icon: '/assets/icons/icon-192.png',
    badge: '/assets/icons/icon-72.png',
    data: { url: data.url || '/' }
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  )
})
