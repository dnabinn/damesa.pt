import { supabase } from './supabase.js'

// Create a new booking (called from restaurant.html booking widget)
export async function createBooking(bookingData) {
  const {
    restaurantId, dinerName, dinerEmail, dinerPhone,
    bookingDate, bookingTime, partySize, specialRequests, occasion, dinerId,
    source
  } = bookingData

  // Server-side past-datetime guard (Lisbon timezone).
  //
  // We compare the full booking datetime against now as ISO-style strings:
  //   "2026-05-03T01:30" vs "2026-05-03T00:45"
  //
  // This single check naturally handles cross-midnight restaurants:
  // A restaurant open Saturday 20:00–02:00 stores the 01:30 slot as booking_date=Saturday.
  // If it's currently Saturday 01:00, "Saturday 01:30" > "Saturday 01:00" → still valid. ✓
  // If it's Sunday 02:00,          "Saturday 01:30" < "Sunday 02:00"     → correctly blocked. ✓
  const nowDate    = new Date()
  const todayLisbon = nowDate.toLocaleDateString('en-CA', { timeZone: 'Europe/Lisbon' })   // "2026-05-03"
  const nowLisbon   = nowDate.toLocaleTimeString('en-GB', { timeZone: 'Europe/Lisbon', hour: '2-digit', minute: '2-digit' }) // "14:30"
  const nowCombined     = `${todayLisbon}T${nowLisbon}`   // "2026-05-03T14:30"
  const bookingCombined = `${bookingDate}T${bookingTime}` // "2026-05-03T20:00"
  if (bookingCombined <= nowCombined) {
    return { error: { message: 'Este horário já passou. Escolhe um horário futuro.' } }
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
    status: 'pending',
    source: source || 'platform'
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
