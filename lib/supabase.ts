import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Client-side Supabase client (anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side Supabase client (service role key) — only use in API routes
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export type Campaign = {
  id: string
  name: string
  slug: string
  referrals_needed_for_retry: number
  is_active: boolean
  created_at: string
}

export type Prize = {
  id: string
  campaign_id: string
  name: string
  probability: number
  color: string
}

export type Participant = {
  id: string
  campaign_id: string
  phone: string
  referral_code: string
  referred_by: string | null
  spins_available: number
  successful_referrals: number
  created_at: string
}

export type Spin = {
  id: string
  participant_id: string
  prize_id: string
  created_at: string
}
