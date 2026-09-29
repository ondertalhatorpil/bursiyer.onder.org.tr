import { useEffect, useState } from 'react';
import { ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react';
import clsx from 'clsx';
import { Button, TextInput, inputClass } from '../../../components/ui';
import CitySelect from '../../../components/lookups/CitySelect';
import { useChannels } from '../../../hooks/useLookups';
import { CATEGORIES } from '../../../config';
import { FLAG_FILTERS, STATUS_FILTERS } from '../shared/constants';
import { useSponsors } from '../sponsors/useSponsors';

/** Arama + filtreler (tek satır; mobilde açılır panel) */
export default function FiltersBar({ filters, setFilter, reset, activeCount }) {
  const [q, setQ] = useState(filters.q);
  const [open, setOpen] = useState(false);
  const { data: channels = [] } = useChannels(filters.category);
  const { data: sponsors = [] } = useSponsors();
  const channel = channels.find((c) => String(c.id) === filters.channelId);

  // Yazmayı bitirince ara (300 ms)
  useEffect(() => { setQ(filters.q); }, [filters.q]);
  useEffect(() => {
    if (q === filters.q) return undefined;
    const t = setTimeout(() => setFilter({ q: q.trim() }), 300);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ad soyad, T.C./YKN, telefon, e-posta veya takip no"
            className="h-10 pl-9 text-sm" aria-label="Başvuru ara" />
        </div>
        <Button variant="secondary" size="sm" icon={SlidersHorizontal} className="h-10 lg:hidden" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          Filtre{activeCount ? ` (${activeCount})` : ''}
        </Button>
      </div>

      <div className={clsx('grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-6', !open && 'hidden lg:grid')}>
        <FilterSelect aria-label="Statü" value={filters.status} placeholder="Tüm statüler"
          options={STATUS_FILTERS.filter((o) => o.value)} onChange={(e) => setFilter({ status: e.target.value })} />
        <FilterSelect aria-label="Kategori" value={filters.category} placeholder="Tüm kategoriler"
          options={CATEGORIES.map((c) => ({ value: c.value, label: c.label }))} onChange={(e) => setFilter({ category: e.target.value })} />
        <FilterSelect aria-label="Kanal" value={filters.channelId} disabled={!filters.category}
          placeholder={filters.category ? 'Tüm kanallar' : 'Kanal'} title={filters.category ? undefined : 'Önce kategori seçin'}
          options={channels.map((c) => ({ value: String(c.id), label: c.name }))} onChange={(e) => setFilter({ channelId: e.target.value })} />
        {channel?.subUnits?.length > 0 && (
          <FilterSelect aria-label="Birim" value={filters.subUnitId} placeholder="Tüm birimler"
            options={channel.subUnits.map((u) => ({ value: String(u.id), label: u.name }))} onChange={(e) => setFilter({ subUnitId: e.target.value })} />
        )}
        <CitySelect id="filter-city" value={filters.cityId ? Number(filters.cityId) : null} onChange={(v) => setFilter({ cityId: v || '' })} />
        <FilterSelect aria-label="İşaret" value={filters.flag} placeholder="Tüm işaretler"
          options={FLAG_FILTERS} onChange={(e) => setFilter({ flag: e.target.value })} />
        <FilterSelect aria-label="Yaş" value={filters.minor} placeholder="Tüm yaşlar"
          options={[{ value: '1', label: '18 yaş altı' }, { value: '0', label: '18 yaş ve üstü' }]} onChange={(e) => setFilter({ minor: e.target.value })} />
        <FilterSelect aria-label="Burs türü" value={filters.qualified} placeholder="Tüm burs türleri"
          title="Sadece kesinleşmiş bursiyerler" options={[{ value: '1', label: 'Nitelikli bursiyer' }, { value: '0', label: 'Normal bursiyer' }]}
          onChange={(e) => setFilter({ qualified: e.target.value })} />
        <FilterSelect aria-label="Burs veren" value={filters.sponsor} placeholder="Tüm burs verenler"
          title="Sadece kesinleşmiş bursiyerler"
          options={[{ value: 'gm', label: 'Genel Merkez' }, ...sponsors.map((s) => ({ value: String(s.id), label: s.isActive ? s.name : `${s.name} (pasif)` }))]}
          onChange={(e) => setFilter({ sponsor: e.target.value })} />
        <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-6">
          {(activeCount > 0 || filters.q) && (
            <Button variant="ghost" size="sm" icon={X} onClick={() => { setQ(''); reset(); }}>Temizle</Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Filtre seçimi: ilk seçenek "tümü" (boş değer) seçilebilir */
function FilterSelect({ options, placeholder, value, className, ...rest }) {
  return (
    <div className="relative min-w-0">
      <select value={value ?? ''} className={clsx(inputClass(false), 'h-10 appearance-none pr-9 text-sm', !value && 'text-slate-500', className)} {...rest}>
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o.value} value={o.value} className="text-slate-900">{o.label}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
    </div>
  );
}
