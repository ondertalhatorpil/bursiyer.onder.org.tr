import { useSearchParams } from 'react-router';
import { SUBMITTED_STATUSES } from '../shared/constants';

const KEYS = ['q', 'status', 'category', 'channelId', 'subUnitId', 'cityId', 'flag', 'minor', 'page'];

/**
 * Liste filtreleri adres çubuğunda tutulur (sayfa yenilenince / link paylaşılınca kaybolmaz).
 * `apiFilters`: backend'e giden hali. Statü boşsa taslaklar hariç tüm statüler.
 */
export default function useListFilters() {
  const [params, setParams] = useSearchParams();
  const filters = Object.fromEntries(KEYS.map((k) => [k, params.get(k) || '']));

  const apiFilters = {
    ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
    status: filters.status || SUBMITTED_STATUSES.join(','),
    page: Number(filters.page) || 1,
    pageSize: 25,
  };

  /** Filtre değişince sayfa 1'e döner; bağımlı alanlar (kanal -> birim) temizlenir */
  const setFilter = (patch) => {
    const next = new URLSearchParams(params);
    if ('category' in patch) { next.delete('channelId'); next.delete('subUnitId'); }
    if ('channelId' in patch) next.delete('subUnitId');
    for (const [k, v] of Object.entries(patch)) {
      if (v === '' || v == null || v === false) next.delete(k); else next.set(k, String(v));
    }
    if (!('page' in patch)) next.delete('page');
    setParams(next, { replace: true });
  };

  const reset = () => setParams(new URLSearchParams(), { replace: true });
  const activeCount = KEYS.filter((k) => k !== 'page' && k !== 'q' && filters[k]).length;

  return { filters, apiFilters, setFilter, reset, activeCount };
}
