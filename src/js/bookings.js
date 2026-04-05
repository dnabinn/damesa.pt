import { supabase } from './supabase.js'

// Create a new booking (called from restaurant.html booking widget)
export async function createBooking(bookingData) {
  const {
    restaurantId, dinerName, dinerEmail, dinerPhone,
    bookingDate, bookingTime, partySize, specialRequests, dinerId
  } = bookingData

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      restaurant_id: restaurantId,
      diner_id: dinerId || null,
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

  await sendBookingConfirmation(data)
  return { booking: data }
}

// Send confirmation emails to diner + restaurant
async function sendBookingConfirmation(booking) {
  try {
    const { error } = await supabase.functions.invoke('send-booking-emails', {
      body: { bookingId: booking.id }
    })
    if (error) console.error('Email notification failed:', error)
  } catch (e) {
    console.error('Email notification failed:', e)
  }
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
