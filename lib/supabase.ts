import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://qmjqissvuuzqkdrogozo.supabase.co'
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_tlICyWW5XZUD6mt8n6lCqA_u8upDZtk'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

