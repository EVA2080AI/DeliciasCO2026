import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// La URL y la anon key son públicas por diseño (viajan en el bundle a cada visitante), pero se leen
// del entorno y no del código. Antes había un respaldo con los valores de producción: un clon sin
// .env escribía en la base real sin avisar. Ahora el plugin require-supabase-env de vite.config.ts
// falla el build si faltan, así que aquí nunca llegan vacías.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

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
