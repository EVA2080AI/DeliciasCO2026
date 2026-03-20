import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sqshrqbopwmxkfkvmmtd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxc2hycWJvcHdteGtma3ZtbXRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MjAyNzQsImV4cCI6MjA4OTA5NjI3NH0.WmSmt-FA_bFGjWUCF9Uf_Idr41Ur_I8wQdIFazcxPvA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumn() {
  console.log('Verificando columna en Supabase...');
  const { data, error } = await supabase.from('products').select('*').limit(1);
  
  if (error) {
    console.error('Error al conectar:', error);
    return;
  }
  
  if (data && data.length > 0) {
    const firstProduct = data[0];
    if ('requires_advance_notice' in firstProduct) {
      console.log('✅ ¡ÉXITO! La columna requires_advance_notice existe en la tabla products.');
    } else {
      console.log('❌ FALLO: La columna no aparece todavía en los resultados.');
    }
  } else {
    console.log('No hay productos para verificar (o no hay permisos), pero la consulta fue exitosa sin error de schema cache.');
  }
}

checkColumn();
