import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// Only initialise if env vars are present — avoids crash when not configured
const supabase = (url && key) ? createClient(url, key) : null

export default supabase
