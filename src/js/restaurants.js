import { supabase } from './supabase.js'

// Fetch all active restaurants (public)
export async function getRestaurants(filters = {}) {
  let query = supabase
    .from('restaurants')
    .select('*')
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

// Derive 30-min booking slots from opening_hours for a specific day of week
// Returns [] if closed, null if no opening_hours configured for that day (fall back to availableTimes)
function slotsFromOpeningHours(openingHours, dayOfWeek) {
  if (!openingHours || !openingHours.length) return null

  const dayRows = openingHours.filter(h => h.day_of_week === dayOfWeek)
  if (!dayRows.length) return null // No config for this day → fallback

  if (dayRows.some(h => h.is_closed)) return [] // Closed

  const slots = []
  for (const row of dayRows) {
    if (!row.open_time || !row.close_time) continue
    const [oh, om] = row.open_time.slice(0, 5).split(':').map(Number)
    const [ch, cm] = row.close_time.slice(0, 5).split(':').map(Number)
    let mins = oh * 60 + om
    const closeMins = ch * 60 + cm - 30 // last booking slot ends 30 min before closing
    while (mins <= closeMins) {
      const h = String(Math.floor(mins / 60)).padStart(2, '0')
      const m = String(mins % 60).padStart(2, '0')
      slots.push(`${h}:${m}`)
      mins += 30
    }
  }
  return slots.sort()
}

// Get available time slots for a date
// openingHours: array from restaurant.opening_hours — used as primary source for slot generation
// availableTimes: legacy fallback if opening_hours not configured
export async function getAvailableSlots(restaurantId, date, availableTimes, openingHours) {
  const { data: bookings } = await supabase
    .from('bookings')
    .select('booking_time, party_size')
    .eq('restaurant_id', restaurantId)
    .eq('booking_date', date)
    .in('status', ['pending', 'confirmed'])

  // Day of week for the selected date (0=Sunday … 6=Saturday)
  const dayOfWeek = new Date(date + 'T12:00:00').getDay()

  // Try to derive slots from opening_hours first
  const derived = slotsFromOpeningHours(openingHours, dayOfWeek)

  if (derived !== null) {
    // opening_hours configured → use derived slots (may be empty if closed)
    return derived.map(slot => ({
      time: slot,
      booked: bookings?.filter(b => b.booking_time === slot + ':00').reduce((sum, b) => sum + b.party_size, 0) || 0
    }))
  }

  // Fallback: use available_times or hardcoded defaults
  const defaultSlots = [
    '12:00','12:30','13:00','13:30','14:00','14:30','15:00',
    '19:00','19:30','20:00','20:30','21:00','21:30','22:00','22:30','23:00'
  ]
  const allSlots = (availableTimes && availableTimes.length > 0) ? availableTimes : defaultSlots
  return allSlots.map(slot => ({
    time: slot,
    booked: bookings?.filter(b => b.booking_time === slot + ':00').reduce((sum, b) => sum + b.party_size, 0) || 0
  }))
}

// Get all restaurants for a specific owner (admin use)
export async function getOwnerRestaurants(ownerId) {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_id', ownerId)
    .order('name')
  return { restaurants: data, error }
}

// Get all cuisine types (for filter UI)
export async function getCuisineTypes() {
  const { data, error } = await supabase
    .from('restaurants')
    .select('cuisine_type')
    .eq('status', 'active')
  const types = [...new Set(data?.map(r => r.cuisine_type).filter(Boolean))]
  return { types, error }
}
