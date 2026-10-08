import { useSearchParams } from 'react-router';
import { SUBMITTED_STATUSES } from '../shared/constants';

const KEYS = [
  'programId', 'q', 'status', 'category', 'channelId', 'subUnitId', 'dormitoryId', 'yurtStage', 'cityId',
  'universityType', 'reference', 'flag', 'minor', 'from', 'to', 'qualified', 'sponsor', 'sort', 'page',
];
// Sayılmayan (filtre olmayan) anahtarlar
const NOT_FILTERS = ['page', 'q', 'sort', 'programId'];

// Kategoriye bağlı filtreler: kategori değişince anlamsız kalanlar silinir
const YURT_ONLY = ['dormitoryId', 'yurtStage'];
const NOT_LISE = ['universityType'];
const CHANNEL_CATEGORIES = ['lise', 'universite'];

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

  /** Filtre değişince sayfa 1'e döner; bağımlı / anlamsız kalan alanlar temizlenir */
  const setFilter = (patch) => {
    const next = new URLSearchParams(params);
    if ('category' in patch) {
      const c = patch.category;
      next.delete('channelId'); next.delete('subUnitId');
      if (c && c !== 'yurt') YURT_ONLY.forEach((k) => next.delete(k));
      if (c === 'lise') NOT_LISE.forEach((k) => next.delete(k));
      if (c && !CHANNEL_CATEGORIES.includes(c)) next.delete('reference');
      if (c === 'yurt') next.delete('cityId');
    }
    if ('channelId' in patch) next.delete('subUnitId');
    // Burs türü / burs veren sadece kesinleşmiş bursiyerlerde anlamlı
    if ('status' in patch && patch.status !== 'finalized') { next.delete('qualified'); next.delete('sponsor'); }
    for (const [k, v] of Object.entries(patch)) {
      if (v === '' || v == null || v === false) next.delete(k); else next.set(k, String(v));
    }
    if (!('page' in patch)) next.delete('page');
    setParams(next, { replace: true });
  };

  /** Temizle: dönem seçimi korunur */
  const reset = () => setParams(filters.programId ? new URLSearchParams({ programId: filters.programId }) : new URLSearchParams(), { replace: true });
  const activeCount = KEYS.filter((k) => !NOT_FILTERS.includes(k) && filters[k]).length;

  return { filters, apiFilters, setFilter, reset, activeCount };
}
