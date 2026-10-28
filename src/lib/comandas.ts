import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type ComandaProduct = Database['public']['Tables']['comanda_products']['Row'];
export type ComandaMesa = Database['public']['Tables']['comanda_mesas']['Row'];
export type Comanda = Database['public']['Tables']['comandas']['Row'];
export type ComandaItem = Database['public']['Tables']['comanda_items']['Row'];
export type ComandaWithItems = Comanda & { comanda_items: ComandaItem[] };

/** La cuenta sale siempre de los renglones; no se guarda un total que pueda quedar viejo. */
export const comandaTotal = (items: ComandaItem[]) =>
  items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

/**
 * Dos nombres que solo difieren en mayúsculas o espacios son la misma mesa: "Mesa 5",
 * "mesa 5" y " Mesa 5 " terminaban siendo tres cuentas distintas en caja.
 */
const claveMesa = (mesa: string) => mesa.trim().toLocaleLowerCase('es');

/**
 * Busca la comanda de esa mesa dentro de la lista que se le pase. Quien llama decide
 * el alcance: la mesera consulta solo las abiertas, así que acá "encontrada" ya significa
 * "esa mesa está ocupada".
 */
export const findComandaAbierta = <T extends { mesa: string }>(
  comandas: T[] | undefined,
  mesa: string,
): T | undefined => {
  const clave = claveMesa(mesa);
  return comandas?.find((c) => claveMesa(c.mesa) === clave);
};

/**
 * Mesera, cocina y caja miran la misma consulta; solo cambia el filtro.
 *  - 'abiertas': mesas donde la mesera todavía toma pedidos.
 *  - 'sin-pagar': todo lo que falta cobrar. Cocina también usa este, porque una mesa
 *    enviada a caja puede seguir teniendo platos sin preparar.
 */
export const fetchComandas = async (scope: 'abiertas' | 'sin-pagar'): Promise<ComandaWithItems[]> => {
  const query = supabase
    .from('comandas')
    .select('*, comanda_items(*)')
    .order('created_at', { ascending: false });

  const { data, error } =
    scope === 'abiertas' ? await query.eq('status', 'abierta') : await query.eq('paid', false);
  if (error) throw error;
  return (data ?? []) as ComandaWithItems[];
};

export const fetchComandaProducts = async (onlyActive: boolean): Promise<ComandaProduct[]> => {
  const query = supabase.from('comanda_products').select('*').order('sort_order');
  const { data, error } = onlyActive ? await query.eq('active', true) : await query;
  if (error) throw error;
  return data ?? [];
};

/**
 * Las mesas del salón las define el dueño en el panel; la mesera solo toca una.
 * Antes escribía el nombre a mano y "Mesa 5", "mesa 5" y "Mesa5" terminaban
 * siendo tres cuentas distintas en caja.
 */
export const fetchComandaMesas = async (onlyActive: boolean): Promise<ComandaMesa[]> => {
  const query = supabase.from('comanda_mesas').select('*').order('sort_order').order('name');
  const { data, error } = onlyActive ? await query.eq('active', true) : await query;
  if (error) throw error;
  return data ?? [];
};

/** El nombre de la mesera vive en el navegador: no hay cuentas, solo el nombre del turno. */
const MESERA_KEY = 'dc-comandas-mesera';

export const readMesera = (): string => {
  try {
    return localStorage.getItem(MESERA_KEY) ?? '';
  } catch {
    return '';
  }
};

export const saveMesera = (name: string) => {
  try {
    localStorage.setItem(MESERA_KEY, name);
  } catch {
    // Modo privado o almacenamiento bloqueado: la sesión dura lo que dure la pestaña.
  }
};

export const COMANDA_CATEGORIES: { id: string; label: string }[] = [
  { id: 'panaderia', label: 'Panadería' },
  { id: 'cafeteria', label: 'Cafetería' },
  { id: 'bebidas', label: 'Bebidas' },
];
