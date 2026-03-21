import { supabase } from './supabase.js'

// Track a page view or custom event
export async function trackEvent(eventName, properties = {}) {
  const { error } = await supabase
    .from('analytics_events')
    .insert({
      event_name: eventName,
      properties,
      url: window.location.href,
      referrer: document.referrer || null,
      created_at: new Date().toISOString()
    })
  if (error) console.warn('Analytics error:', error)
}

// Get booking stats for a restaurant (owner dashboard)
export async function getRestaurantStats(restaurantId, days = 30) {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await supabase
    .from('bookings')
    .select('status, party_size, booking_date, created_at')
    .eq('restaurant_id', restaurantId)
    .gte('created_at', since.toISOString())

  if (error) return { stats: null, error }

  const stats = {
    total: data.length,
    confirmed: data.filter(b => b.status === 'confirmed').length,
    pending: data.filter(b => b.status === 'pending').length,
    cancelled: data.filter(b => b.status === 'cancelled').length,
    covers: data.reduce((sum, b) => sum + (b.party_size || 0), 0)
  }
  return { stats, error: null }
}

// Get platform-wide stats (super admin)
export async function getPlatformStats() {
  const [
    { count: totalRestaurants },
    { count: totalBookings },
    { count: activeOwners }
  ] = await Promise.all([
    supabase.from('restaurants').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('bookings').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'restaurant_owner')
  ])

  return { totalRestaurants, totalBookings, activeOwners }
}
