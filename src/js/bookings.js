import { supabase } from './supabase.js'

// Create a new booking (called from restaurant.html booking widget)
export async function createBooking(bookingData) {
  const {
    restaurantId, dinerName, dinerEmail, dinerPhone,
    bookingDate, bookingTime, partySize, specialRequests, occasion, dinerId
  } = bookingData

  // Server-side past-date guard (Lisbon timezone)
  const todayLisbon = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Lisbon' })
  if (bookingDate < todayLisbon) {
    return { error: { message: 'Não é possível reservar para datas passadas.' } }
  }
  // Past-time guard for today
  if (bookingDate === todayLisbon) {
    const nowLisbon = new Date().toLocaleTimeString('en-GB', { timeZone: 'Europe/Lisbon', hour: '2-digit', minute: '2-digit' })
    if (bookingTime <= nowLisbon) {
      return { error: { message: 'Este horário já passou. Escolhe um horário futuro.' } }
    }
  }

  const row = {
    restaurant_id: restaurantId,
    diner_id: dinerId || null,
    diner_name: dinerName,
    diner_email: dinerEmail,
    diner_phone: dinerPhone,
    booking_date: bookingDate,
    booking_time: bookingTime,
    party_size: partySize,
    special_requests: specialRequests || null,
    status: 'pending'
  }
  // occasion & cancel_token only inserted if columns exist (added via migration)
  if (occasion) row.occasion = occasion
  // cancel_token generated server-side by DB default; we read it back via .select()

  const { data, error } = await supabase
    .from('bookings')
    .insert(row)
    .select()
    .single()

  if (error) return { error }

  await sendBookingConfirmation(data)
  notifyOwner(data)  // fire-and-forget push notification to restaurant owner
  return { booking: data }
}

// Send confirmation emails to diner + restaurant
async function sendBookingConfirmation(booking) {
  try {
    const res = await fetch('https://jdkbywroucgwrfpirloa.supabase.co/functions/v1/send-booking-emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'sb_publishable_rU5h79iwvA6wDozm72uvMg_zSFZAkkY',
        'Authorization': 'Bearer sb_publishable_rU5h79iwvA6wDozm72uvMg_zSFZAkkY'
      },
      body: JSON.stringify({ bookingId: booking.id })
    })
    const data = await res.json()
    if (!res.ok) console.error('Email notification failed:', data)
  } catch (e) {
    console.error('Email notification failed:', e)
  }
}

// Send push notification to restaurant owner
async function notifyOwner(booking) {
  try {
    await fetch('https://jdkbywroucgwrfpirloa.supabase.co/functions/v1/notify-owner', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'sb_publishable_rU5h79iwvA6wDozm72uvMg_zSFZAkkY',
        'Authorization': 'Bearer sb_publishable_rU5h79iwvA6wDozm72uvMg_zSFZAkkY'
      },
      body: JSON.stringify({ bookingId: booking.id })
    })
  } catch (e) {
    console.warn('Owner push notification failed:', e)
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
