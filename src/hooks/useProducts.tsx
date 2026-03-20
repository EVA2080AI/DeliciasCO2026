import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product } from '@/store/cartStore';
import { imageMap } from '@/data/products';

interface DbProduct {
  id: string;
  name: string;
  description: string;
  long_description: string | null;
  price: number;
  category: 'pasteleria' | 'cafeteria' | 'delicias' | 'bebidas' | 'combos';
  image_url: string | null;
  featured: boolean;
  active: boolean;
  sort_order: number;
  requires_advance_notice: boolean | null;
}

const mapDbProduct = (p: DbProduct): Product => ({
  id: p.id,
  name: p.name,
  description: p.description,
  longDescription: p.long_description ?? undefined,
  price: p.price,
  category: p.category,
  image: p.image_url || imageMap[p.name] || '/placeholder.svg',
  featured: p.featured,
  requiresAdvanceNotice: p.requires_advance_notice ?? false,
});

export const useProducts = () => {
  return useQuery({
    queryKey: ['products'],
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return (data as DbProduct[]).map(mapDbProduct);
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useProduct = (id: string | undefined) => {
  return useQuery({
    queryKey: ['product', id],
    queryFn: async (): Promise<Product | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .eq('active', true)
        .maybeSingle();

      if (error) throw error;
      return data ? mapDbProduct(data as DbProduct) : null;
    },
    enabled: !!id,
  });
};
