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

  const allSlots = ['19:00','19:30','20:00','20:30','21:00','21:30','22:00','22:30','23:00']
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
