import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sqshrqbopwmxkfkvmmtd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxc2hycWJvcHdteGtma3ZtbXRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MjAyNzQsImV4cCI6MjA4OTA5NjI3NH0.WmSmt-FA_bFGjWUCF9Uf_Idr41Ur_I8wQdIFazcxPvA';
const supabase = createClient(supabaseUrl, supabaseKey);

async function setAdmin() {
  // Vamos a buscar al usuario con el correo actual o todos los usuarios
  const { data: usersData, error: usersErr } = await supabase.auth.admin?.listUsers();
  
  // Si no tenemos acceso al admin API con la anon key (que es lo normal), 
  // insertaremos directamente a user_roles usando la ID si la conocemos o 
  // buscaremos si podemos saltarnos RLS temporalmente.
  console.log("Para darte permisos, necesito tu correo electrónico exacto o el UUID de auth.users.");
  console.log("Como alternativa, insertaré un registro genérico o te daré instrucciones.");
}

setAdmin();
