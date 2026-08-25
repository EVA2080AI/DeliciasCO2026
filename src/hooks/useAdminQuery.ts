import { useQuery, type UseQueryOptions, type QueryKey } from '@tanstack/react-query';

/**
 * Consultas del panel admin: siempre frescas al montar (el admin espera ver el último estado),
 * sin cambiar los defaults con caché del sitio público.
 */
export const useAdminQuery = <TQueryFnData, TError = Error, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey>(
  options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
) => useQuery<TQueryFnData, TError, TData, TQueryKey>({ staleTime: 0, refetchOnMount: 'always', ...options });
