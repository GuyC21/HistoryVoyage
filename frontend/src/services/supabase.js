import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey === 'your-supabase-anon-key-here') {
  console.warn('Warning: Supabase credentials are missing or using defaults in the frontend .env file.')
}

/**
 * Singleton Supabase client instance.
 * 
 * Initialized using environment variables. Used throughout the application
 * for authentication and direct database interactions if needed.
 * 
 * @type {import('@supabase/supabase-js').SupabaseClient}
 */
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')
