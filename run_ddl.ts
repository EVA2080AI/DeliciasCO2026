import { Client } from 'pg';

const connectionString = 'postgresql://postgres:WmSmt-FA_bFGjWUCF9Uf_Idr41Ur_I8wQdIFazcxPvA@db.sqshrqbopwmxkfkvmmtd.supabase.co:5432/postgres';

async function migrate() {
  const client = new Client({
    connectionString,
  });

  try {
    console.log('🔗 Conectando a Supabase...');
    await client.connect();

    console.log('1️⃣ Añadiendo "pies" al tipo product_category...');
    await client.query(`
      ALTER TYPE product_category ADD VALUE IF NOT EXISTS 'pies';
    `);

    console.log('2️⃣ Añadiendo "notes" a quotations...');
    await client.query(`
      ALTER TABLE quotations ADD COLUMN IF NOT EXISTS notes TEXT;
    `);

    console.log('✅ ¡Esquema modificado con éxito!');
  } catch (error) {
    console.error('❌ Error ejecutando consultas:', error);
  } finally {
    await client.end();
  }
}

migrate();
