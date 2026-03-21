// Trigger SMS via Supabase Edge Function
export async function sendSMS(to, message) {
  const res = await fetch('/api/send-notification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'sms', to, message })
  })
  return res.json()
}

// Trigger email via Supabase Edge Function
export async function sendEmail(to, subject, bookingId) {
  const res = await fetch('/api/send-notification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'email', to, subject, bookingId })
  })
  return res.json()
}

// Notify restaurant owner of a new booking
export async function notifyOwnerNewBooking(booking, ownerEmail, ownerPhone) {
  const date = new Date(`${booking.booking_date}T${booking.booking_time}`).toLocaleString('pt-PT')

  if (ownerPhone) {
    await sendSMS(
      ownerPhone,
      `🍽️ Nova reserva Da Mesa! ${booking.diner_name} — ${date} — ${booking.party_size} pessoas. Ref: ${booking.reference_code}`
    )
  }

  if (ownerEmail) {
    await sendEmail(
      ownerEmail,
      `Nova reserva — ${booking.reference_code}`,
      booking.id
    )
  }
}
