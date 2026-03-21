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
  window.location.href = '/pages/login.html'
}

// Route guard — redirect based on role
export async function guardRoute() {
  const profile = await getCurrentProfile()
  if (!profile) {
    window.location.href = '/pages/login.html'
    return
  }
  const path = window.location.pathname
  if (path.includes('superadmin') && profile.role !== 'super_admin') {
    window.location.href = '/pages/dashboard.html'
  }
  if (path.includes('owner-dashboard') && profile.role !== 'restaurant_owner' && profile.role !== 'super_admin') {
    window.location.href = '/pages/dashboard.html'
  }
  return profile
}
