import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type SiteSetting = {
  id: string;
  key: string;
  value: string;
  type: string;
  category: string;
  label: string;
  sort_order: number;
};

export const useSiteSettings = (category?: string) => {
  return useQuery({
    queryKey: ['site-settings', category],
    queryFn: async () => {
      let q = supabase.from('site_settings').select('*').order('sort_order');
      if (category) q = q.eq('category', category);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as SiteSetting[];
    },
    staleTime: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: true,
  });
};

export const useSiteSettingsMap = () => {
  const { data, ...rest } = useSiteSettings();
  const map: Record<string, string> = {};
  data?.forEach(s => { map[s.key] = s.value; });
  return { settings: map, raw: data, ...rest };
};

export const useUpdateSiteSetting = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from('site_settings')
        .update({ value })
        .eq('key', key);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['site-settings'] });
    },
  });
};
