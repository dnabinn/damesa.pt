import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://jdkbywroucgwrfpirloa.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_rU5h79iwvA6wDozm72uvMg_zSFZAkkY'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
