import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Valores PÚBLICOS del proyecto (la anon key viaja a cada visitante por diseño). Sirven de respaldo
// cuando el entorno de build no define VITE_SUPABASE_*; la service-role key NUNCA va aquí.
const PUBLIC_SUPABASE_URL = 'https://sqshrqbopwmxkfkvmmtd.supabase.co';
const PUBLIC_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxc2hycWJvcHdteGtma3ZtbXRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MjAyNzQsImV4cCI6MjA4OTA5NjI3NH0.WmSmt-FA_bFGjWUCF9Uf_Idr41Ur_I8wQdIFazcxPvA';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || PUBLIC_SUPABASE_ANON_KEY;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  }
});