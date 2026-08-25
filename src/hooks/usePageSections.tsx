import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CMS_KEYS, invalidateCms } from '@/lib/cmsSync';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type PageSection = {
  id: string;
  page_slug: string;
  section_key: string;
  title: string;
  subtitle: string;
  content: string;
  image_url: string | null;
  cta_text: string | null;
  cta_link: string | null;
  active: boolean;
  sort_order: number;
  metadata: Record<string, unknown>;
};

export const usePageSections = (pageSlug: string) => {
  return useQuery({
    queryKey: ['page-sections', pageSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('page_sections')
        .select('*')
        .eq('page_slug', pageSlug)
        .order('sort_order');
      if (error) throw error;
      return (data || []) as PageSection[];
    },
  });
};

export const usePageSectionsMap = (pageSlug: string) => {
  const { data, ...rest } = usePageSections(pageSlug);
  const sections = useMemo(() => {
    const map: Record<string, PageSection> = {};
    data?.forEach((s) => { map[s.section_key] = s; });
    return map;
  }, [data]);
  return { sections, raw: data, ...rest };
};

export const useUpdatePageSection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, metadata, ...updates }: Partial<PageSection> & { id: string }) => {
      const payload: Database['public']['Tables']['page_sections']['Update'] = { ...updates };
      if (metadata !== undefined) payload.metadata = metadata as Database['public']['Tables']['page_sections']['Update']['metadata'];
      const { error } = await supabase
        .from('page_sections')
        .update(payload)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateCms(qc, CMS_KEYS.sections),
  });
};

export const useAllPageSections = () => {
  return useQuery({
    queryKey: ['page-sections-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('page_sections')
        .select('*')
        .order('page_slug')
        .order('sort_order');
      if (error) throw error;
      return (data || []) as PageSection[];
    },
    // Solo admin: siempre fresco al montar
    staleTime: 0,
    refetchOnMount: 'always',
  });
};
