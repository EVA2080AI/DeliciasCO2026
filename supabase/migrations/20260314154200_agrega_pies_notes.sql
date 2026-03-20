-- Migración autogenerada para resolver requerimientos de menú B2B y cotizaciones
ALTER TYPE product_category ADD VALUE IF NOT EXISTS 'pies';
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS notes TEXT;
