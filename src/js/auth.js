import { supabase } from './supabase.js'

// Google OAuth login
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/pages/login.html`
    }
  })
  if (error) console.error('Google login error:', error)
}

// Email + password login
export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error }
  return { user: data.user }
}

// Email + password register
export async function signUpWithEmail(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } }
  })
  if (error) return { error }
  return { user: data.user }
}

// Get current session
export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

// Get current user profile + role
export async function getCurrentProfile() {
  const session = await getSession()
  if (!session) return null
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()
  return data
}

// Sign out
export async function signOut() {
  await supabase.auth.signOut()
  window.location.replace('/login.html')
}

// Route guard — hides body until auth confirmed, then redirects if needed
export async function guardRoute() {
  // Hide page content while checking auth (prevents flash of protected UI)
  document.body.style.visibility = 'hidden'

  const profile = await getCurrentProfile()

  if (!profile) {
    const returnUrl = encodeURIComponent(window.location.pathname)
    window.location.replace(`/login.html?return=${returnUrl}`)
    return null
  }

  const path = window.location.pathname
  if (path.includes('superadmin') && profile.role !== 'super_admin') {
    window.location.replace('/dashboard.html')
    return null
  }
  if (path.includes('owner-dashboard') && profile.role !== 'restaurant_owner' && profile.role !== 'super_admin') {
    window.location.replace('/dashboard.html')
    return null
  }

  // Auth confirmed — show page
  document.body.style.visibility = 'visible'
  return profile
}
