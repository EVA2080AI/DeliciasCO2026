import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sqshrqbopwmxkfkvmmtd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxc2hycWJvcHdteGtma3ZtbXRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MjAyNzQsImV4cCI6MjA4OTA5NjI3NH0.WmSmt-FA_bFGjWUCF9Uf_Idr41Ur_I8wQdIFazcxPvA';
const supabase = createClient(supabaseUrl, supabaseKey);

const newProducts = [
  { name: 'Pastel de pollo', category: 'pasteleria', price: 5000, active: true, sort_order: 10, description: 'Delicioso pastel horneado relleno de pollo' },
  { name: 'Pastel de pollo con champiñones', category: 'pasteleria', price: 5000, active: true, sort_order: 11, description: 'Pastel relleno de pollo y champiñones en salsa' },
  { name: 'Pastel de carne', category: 'pasteleria', price: 5000, active: true, sort_order: 12, description: 'Tradicional pastel horneado de carne' },
  { name: 'Pastel hawaiano', category: 'pasteleria', price: 5000, active: true, sort_order: 13, description: 'Pastel relleno de jamón, queso y piña' },
  { name: 'Pastel italiano', category: 'pasteleria', price: 5000, active: true, sort_order: 14, description: 'Exquisito pastel con sabores italianos' },
  { name: 'Pastel vegetariano', category: 'pasteleria', price: 5000, active: true, sort_order: 15, description: 'Opción saludable rellena de vegetales frescos' },
  { name: 'Pastel de atún', category: 'pasteleria', price: 5000, active: true, sort_order: 16, description: 'Pastel relleno de atún preparado' },
  { name: 'Pastel especial', category: 'pasteleria', price: 5500, active: true, sort_order: 17, description: 'Nuestra mezcla especial de la casa' },

  { name: 'Pie de arequipe', category: 'pies', price: 6000, active: true, sort_order: 20, description: 'Crujiente pie relleno de puro arequipe' },
  { name: 'Pie de bocadillo con queso', category: 'pies', price: 6000, active: true, sort_order: 21, description: 'Pie tradicional con la mejor combinación dulce-salada' },
  { name: 'Pie de maracuyá', category: 'pies', price: 6000, active: true, sort_order: 22, description: 'Postre cremoso de maracuyá sobre concha de galleta' },
  { name: 'Pie de mora', category: 'pies', price: 6000, active: true, sort_order: 23, description: 'Postre dulce y ácido de mora natural' },
  { name: 'Pie de chocolate', category: 'pies', price: 6000, active: true, sort_order: 24, description: 'Pie oscuro y decadente de suave chocolate' },

  { name: 'Pandeyucas', category: 'delicias', price: 2500, active: true, sort_order: 30, description: 'Pandeyucas horneados esponjosos y quesudos' },
  { name: 'Almojábanas', category: 'delicias', price: 2500, active: true, sort_order: 31, description: 'Almojábanas calientitas y frescas' },
  { name: 'Croissant jamón y queso', category: 'delicias', price: 4000, active: true, sort_order: 32, description: 'Croissant hojaldrado relleno' },
  { name: 'Croissant bocadillo con queso', category: 'delicias', price: 4000, active: true, sort_order: 33, description: 'Croissant hojaldrado dulce y salado' },
  { name: 'Pasteles gloria', category: 'delicias', price: 3500, active: true, sort_order: 34, description: 'Tradicional pastel gloria con arequipe y queso' },
  { name: 'Pasabocas', category: 'delicias', price: 2000, active: true, sort_order: 35, description: 'Pequeños bocados salados para acompañar' },
  { name: 'Palitos de queso', category: 'delicias', price: 3000, active: true, sort_order: 36, description: 'Bastones de masa hojaldrada y queso' },
  { name: 'Bolsa de pan calentado', category: 'delicias', price: 5500, active: true, sort_order: 37, description: 'Bolsa ideal para desayunar en familia' },
  { name: 'Bolsa de mini pasabocas', category: 'delicias', price: 8000, active: true, sort_order: 38, description: 'Ideal para reuniones u onces corporativas' },

  { name: 'Jugo de naranja', category: 'bebidas', price: 4000, active: true, sort_order: 40, description: 'Jugo 100% natural y recién exprimido' },
  { name: 'Gaseosas', category: 'bebidas', price: 3500, active: true, sort_order: 41, description: 'Variedad de bebidas carbonatadas frías' },

  { name: 'Capuchino', category: 'cafeteria', price: 4500, active: true, sort_order: 50, description: 'Café espresso con leche espumada' },
  { name: 'Café en leche', category: 'cafeteria', price: 3500, active: true, sort_order: 51, description: 'Café tradicional preparado con leche' },
  { name: 'Tinto', category: 'cafeteria', price: 2000, active: true, sort_order: 52, description: 'Café negro colombiano clásico' },
  { name: 'Aromática', category: 'cafeteria', price: 2000, active: true, sort_order: 53, description: 'Infusión caliente de frutas o hierbas' },
  { name: 'Milo caliente', category: 'cafeteria', price: 4500, active: true, sort_order: 54, description: 'Deliciosa bebida a base de Milo y leche caliente' }
];

async function seed() {
  console.log('🔄 Borrando productos antiguos...');
  // Borrado dummy con eq('active', true) y eq('active', false) para limpiar toda la tabla (RLS lo permitirá si está público)
  const { error: delErr1 } = await supabase.from('products').delete().eq('active', true);
  const { error: delErr2 } = await supabase.from('products').delete().eq('active', false);
  
  if (delErr1) console.error('Error borrando activos:', delErr1.message);
  if (delErr2) console.error('Error borrando inactivos:', delErr2.message);

  console.log('✅ Base limpia. Insertando nuevos 26 productos...');
  const { data, error } = await supabase.from('products').insert(newProducts);
  
  if (error) {
    console.error('❌ Error insertando:', error.message);
  } else {
    console.log('🎉 Nuevos productos insertados con éxito!');
  }
}

seed();
