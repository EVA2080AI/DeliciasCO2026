import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://pgohvsndgxrilconcebh.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnb2h2c25kZ3hyaWxjb25jZWJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NTcxMTcsImV4cCI6MjA4ODUzMzExN30.9YH3HEkO4QBHj8M7Lxc22Q8vwhEfMQjMs7lhDRc-Sr8';

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
