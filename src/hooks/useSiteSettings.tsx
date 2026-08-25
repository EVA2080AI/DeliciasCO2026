import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CMS_KEYS, invalidateCms } from '@/lib/cmsSync';

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
  });
};

const EMPTY: Record<string, string> = {};

export const useSiteSettingsMap = () => {
  const { data, ...rest } = useSiteSettings();
  // Memoizado: el objeto solo cambia cuando cambian los datos (DynamicTheme depende de su identidad).
  const settings = useMemo(() => {
    if (!data) return EMPTY;
    const map: Record<string, string> = {};
    data.forEach((s) => { map[s.key] = s.value; });
    return map;
  }, [data]);
  return { settings, raw: data, ...rest };
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
    onSuccess: () => invalidateCms(qc, CMS_KEYS.settings),
  });
};
