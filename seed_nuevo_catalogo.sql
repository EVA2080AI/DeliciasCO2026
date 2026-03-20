-- 1. LIMPIAR ANTIGUOS PRODUCTOS
DELETE FROM products;

-- 2. INSERTAR NUEVO CATÁLOGO
-- 📋 Categoría: Pastelería
INSERT INTO products (name, category, price, active, sort_order, description) VALUES
('Pastel de pollo', 'pasteleria', 5000, true, 10, 'Delicioso pastel horneado relleno de pollo'),
('Pastel de pollo con champiñones', 'pasteleria', 5000, true, 11, 'Pastel relleno de pollo y champiñones en salsa'),
('Pastel de carne', 'pasteleria', 5000, true, 12, 'Tradicional pastel horneado de carne'),
('Pastel hawaiano', 'pasteleria', 5000, true, 13, 'Pastel relleno de jamón, queso y piña'),
('Pastel italiano', 'pasteleria', 5000, true, 14, 'Exquisito pastel con sabores italianos'),
('Pastel vegetariano', 'pasteleria', 5000, true, 15, 'Opción saludable rellena de vegetales frescos'),
('Pastel de atún', 'pasteleria', 5000, true, 16, 'Pastel relleno de atún preparado'),
('Pastel especial', 'pasteleria', 5500, true, 17, 'Nuestra mezcla especial de la casa');

-- 📋 Categoría: Pies
INSERT INTO products (name, category, price, active, sort_order, description) VALUES
('Pie de arequipe', 'pies', 6000, true, 20, 'Crujiente pie relleno de puro arequipe'),
('Pie de bocadillo con queso', 'pies', 6000, true, 21, 'Pie tradicional con la mejor combinación dulce-salada'),
('Pie de maracuyá', 'pies', 6000, true, 22, 'Postre cremoso de maracuyá sobre concha de galleta'),
('Pie de mora', 'pies', 6000, true, 23, 'Postre dulce y ácido de mora natural'),
('Pie de chocolate', 'pies', 6000, true, 24, 'Pie oscuro y decadente de suave chocolate');

-- 📋 Categoría: Delicias de Panadería
INSERT INTO products (name, category, price, active, sort_order, description) VALUES
('Pandeyucas', 'delicias', 2500, true, 30, 'Pandeyucas horneados esponjosos y quesudos'),
('Almojábanas', 'delicias', 2500, true, 31, 'Almojábanas calientitas y frescas'),
('Croissant jamón y queso', 'delicias', 4000, true, 32, 'Croissant hojaldrado relleno'),
('Croissant bocadillo con queso', 'delicias', 4000, true, 33, 'Croissant hojaldrado dulce y salado'),
('Pasteles gloria', 'delicias', 3500, true, 34, 'Tradicional pastel gloria con arequipe y queso'),
('Pasabocas', 'delicias', 2000, true, 35, 'Pequeños bocados salados para acompañar'),
('Palitos de queso', 'delicias', 3000, true, 36, 'Bastones de masa hojaldrada y queso'),
('Bolsa de pan calentado', 'delicias', 5500, true, 37, 'Bolsa ideal para desayunar en familia'),
('Bolsa de mini pasabocas', 'delicias', 8000, true, 38, 'Ideal para reuniones u onces corporativas');

-- 📋 Categoría: Bebidas Frías
INSERT INTO products (name, category, price, active, sort_order, description) VALUES
('Jugo de naranja', 'bebidas', 4000, true, 40, 'Jugo 100% natural y recién exprimido'),
('Gaseosas', 'bebidas', 3500, true, 41, 'Variedad de bebidas carbonatadas frías');

-- 📋 Categoría: Cafetería
INSERT INTO products (name, category, price, active, sort_order, description) VALUES
('Capuchino', 'cafeteria', 4500, true, 50, 'Café espresso con leche espumada'),
('Café en leche', 'cafeteria', 3500, true, 51, 'Café tradicional preparado con leche'),
('Tinto', 'cafeteria', 2000, true, 52, 'Café negro colombiano clásico'),
('Aromática', 'cafeteria', 2000, true, 53, 'Infusión caliente de frutas o hierbas'),
('Milo caliente', 'cafeteria', 4500, true, 54, 'Deliciosa bebida a base de Milo y leche caliente');
