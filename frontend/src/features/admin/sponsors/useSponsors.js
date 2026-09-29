import { useQuery } from '@tanstack/react-query';
import { sponsorsApi } from '../../../api/adminEndpoints';

export const SPONSORS_KEY = ['admin', 'sponsors'];

/** Burs veren firmalar (filtre, atama ve firma sayfası ortak kullanır) */
export function useSponsors() {
  return useQuery({ queryKey: SPONSORS_KEY, queryFn: sponsorsApi.list, select: (d) => d.items, staleTime: 60_000 });
}
