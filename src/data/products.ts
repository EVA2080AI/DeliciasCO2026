import { Product } from '@/store/cartStore';

import pastelPolloImg from '@/assets/images/products/pastel-pollo.jpg';
import pastelCarneImg from '@/assets/images/products/pastel-carne.jpg';
import empanadaImg from '@/assets/images/products/empanada.jpg';
import cafePremiumImg from '@/assets/images/products/cafe-premium.jpg';
import jugoNaturalImg from '@/assets/images/products/jugo-natural.jpg';
import almojabanaImg from '@/assets/images/products/almojabana.jpg';
import panDeBonoImg from '@/assets/images/products/pan-de-bono.jpg';
import chocolateImg from '@/assets/images/products/chocolate-queso.jpg';
import aguapanelaImg from '@/assets/images/products/aguapanela.jpg';
import aromaticaImg from '@/assets/images/products/aromatica.jpg';
import avenaImg from '@/assets/images/products/avena.jpg';
import comboDesayunoImg from '@/assets/images/products/combo-desayuno.jpg';
import comboFamiliarImg from '@/assets/images/products/combo-familiar.jpg';
import comboEmpresarialImg from '@/assets/images/products/combo-empresarial.jpg';
import comboOncesImg from '@/assets/images/products/combo-onces.jpg';

// Fallback image map: matches product name to local image
export const imageMap: Record<string, string> = {
  'Pastel de Pollo': pastelPolloImg,
  'Pastel de Carne': pastelCarneImg,
  'Empanada Colombiana': empanadaImg,
  'Café Premium Colombiano': cafePremiumImg,
  'Jugo Natural de Frutas': jugoNaturalImg,
  'Almojábana': almojabanaImg,
  'Pan de Bono': panDeBonoImg,
  'Chocolate con Queso': chocolateImg,
  'Agua de Panela con Limón': aguapanelaImg,
  'Aromática de Frutas': aromaticaImg,
  'Avena Colombiana': avenaImg,
  'Combo Desayuno Tradicional': comboDesayunoImg,
  'Combo Familiar': comboFamiliarImg,
  'Combo Empresarial': comboEmpresarialImg,
  'Combo Onces': comboOncesImg,
};

export const categories = [
  { id: 'all', label: 'Todos' },
  { id: 'pasteleria', label: 'Pasteles' },
  { id: 'pies', label: 'Pies' },
  { id: 'delicias', label: 'Delicias de Panadería' },
  { id: 'bebidas', label: 'Bebidas Frías' },
  { id: 'cafeteria', label: 'Cafetería' },
  { id: 'combos', label: 'Combos' },
] as const;
