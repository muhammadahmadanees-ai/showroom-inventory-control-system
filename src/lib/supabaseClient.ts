import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ejtfkkkaeregjcmyazup.supabase.co';

// Provide a dummy JWT-like key during build time/prerendering to prevent createClient from crashing the build.
// At runtime, we detect if the actual env variable is missing to activate our Local Mock Mode.
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJhbm9uIn0.dummy';

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && typeof window !== 'undefined') {
  console.warn(
    'Supabase Anon Key is missing. Please add NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file to connect to your live database.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
