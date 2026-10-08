import { useEffect, useState } from 'react';
import { ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react';
import clsx from 'clsx';
import { Button, TextInput, inputClass } from '../../../components/ui';
import CitySelect from '../../../components/lookups/CitySelect';
import { useChannels } from '../../../hooks/useLookups';
import { CATEGORIES } from '../../../config';
import { FLAG_FILTERS, STATUS_FILTERS, YURT_STAGE_FILTERS, SORT_OPTIONS } from '../shared/constants';
import { useSponsors } from '../sponsors/useSponsors';

const GRAD = ['yuksek_lisans', 'doktora'];
const UNIVERSITY = ['universite', 'yuksek_lisans', 'doktora', 'yurt'];
const WITH_CHANNELS = ['lise', 'universite'];

/**
 * Arama + filtreler (mobilde açılır panel). Kullanıcının görebildiklerine göre (meta) kendini ayarlar:
 *   tek kategori görüyorsa kategori, tek yurt görüyorsa yurt, ille sınırlıysa il filtresi gösterilmez;
 *   kategoriye anlamsız filtreler (yurtta kanal / il, lisede üniversite türü ...) gizlenir.
 *   Burs türü ve burs veren sadece "Kesinleşti" statüsünde açılır.
 */
export default function FiltersBar({ filters, setFilter, reset, activeCount, meta }) {
  const [q, setQ] = useState(filters.q);
  const [open, setOpen] = useState(false);
  const categories = meta?.categories || CATEGORIES.map((c) => c.value);
  // Tek kategori görüyorsa o kategori seçili sayılır (kategori filtresi gizli)
  const category = filters.category || (categories.length === 1 ? categories[0] : '');
  // Kategori seçilmediyse görülebilen kategorilerin hepsi, seçildiyse sadece o
  const inView = category ? [category] : categories;
  const has = (list) => inView.some((c) => list.includes(c));

  const { data: channels = [] } = useChannels(WITH_CHANNELS.includes(category) ? category : null);
  const { data: sponsors = [] } = useSponsors();
  const channel = channels.find((c) => String(c.id) === filters.channelId);
  const dormitories = meta?.dormitories || [];

  const show = {
    category: categories.length > 1,
    channel: WITH_CHANNELS.includes(category) && channels.length > 0,
    subUnit: channel?.subUnits?.length > 0,
    dormitory: has(['yurt']) && dormitories.length > 1,
    yurtStage: has(['yurt']),
    city: (meta ? meta.showCity : true) && category !== 'yurt',
    universityType: has(UNIVERSITY),
    reference: has(WITH_CHANNELS),
    flag: true,
    // Burs türü / burs veren: kesinleşmiş bursiyerlerde, yurt bursu dışında
    finalized: filters.status === 'finalized' && inView.some((c) => c !== 'yurt'),
  };
  const flagOptions = FLAG_FILTERS.filter((f) => f.value !== 'birth_year_out_of_range' || has(GRAD));

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
          <TextInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ad soyad, T.C./YKN, telefon, e-posta, takip no veya okul / üniversite"
            className="h-10 pl-9 text-sm" aria-label="Başvuru ara" />
        </div>
        <FilterSelect aria-label="Sıralama" value={filters.sort} placeholder="En yeni gönderilen" className="hidden w-52 sm:block"
          options={SORT_OPTIONS.filter((o) => o.value !== 'requested' || has(['yurt']))} onChange={(e) => setFilter({ sort: e.target.value })} />
        <Button variant="secondary" size="sm" icon={SlidersHorizontal} className="h-10 lg:hidden" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          Filtre{activeCount ? ` (${activeCount})` : ''}
        </Button>
      </div>

      <div className={clsx('grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-6', !open && 'hidden lg:grid')}>
        <FilterSelect aria-label="Sıralama" value={filters.sort} placeholder="En yeni gönderilen" className="sm:hidden"
          options={SORT_OPTIONS.filter((o) => o.value !== 'requested' || has(['yurt']))} onChange={(e) => setFilter({ sort: e.target.value })} />
        <FilterSelect aria-label="Statü" value={filters.status} placeholder="Tüm statüler"
          options={STATUS_FILTERS.filter((o) => o.value && (o.value !== 'revision_requested' || inView.some((c) => c !== 'yurt')))}
          onChange={(e) => setFilter({ status: e.target.value })} />
        {show.category && (
          <FilterSelect aria-label="Kategori" value={filters.category} placeholder="Tüm kategoriler"
            options={CATEGORIES.filter((c) => categories.includes(c.value)).map((c) => ({ value: c.value, label: c.label }))}
            onChange={(e) => setFilter({ category: e.target.value })} />
        )}
        {show.channel && (
          <FilterSelect aria-label="Kanal" value={filters.channelId} placeholder="Tüm kanallar"
            options={channels.map((c) => ({ value: String(c.id), label: c.name }))} onChange={(e) => setFilter({ channelId: e.target.value })} />
        )}
        {show.subUnit && (
          <FilterSelect aria-label="Birim" value={filters.subUnitId} placeholder="Tüm birimler"
            options={channel.subUnits.map((u) => ({ value: String(u.id), label: u.name }))} onChange={(e) => setFilter({ subUnitId: e.target.value })} />
        )}
        {show.dormitory && (
          <FilterSelect aria-label="Yurt" value={filters.dormitoryId} placeholder="Tüm yurtlar"
            options={dormitories.map((d) => ({ value: String(d.id), label: d.name }))} onChange={(e) => setFilter({ dormitoryId: e.target.value })} />
        )}
        {show.yurtStage && (
          <FilterSelect aria-label="Öneri aşaması" value={filters.yurtStage} placeholder="Tüm öneri aşamaları" title="Yurt Konaklama Bursu"
            options={YURT_STAGE_FILTERS} onChange={(e) => setFilter({ yurtStage: e.target.value })} />
        )}
        {show.city && (
          <CitySelect id="filter-city" value={filters.cityId ? Number(filters.cityId) : null} onChange={(v) => setFilter({ cityId: v || '' })} />
        )}
        {show.universityType && (
          <FilterSelect aria-label="Üniversite türü" value={filters.universityType} placeholder="Tüm üniversite türleri"
            options={[{ value: 'devlet', label: 'Devlet üniversitesi' }, { value: 'vakif', label: 'Vakıf (özel) üniversitesi' }]}
            onChange={(e) => setFilter({ universityType: e.target.value })} />
        )}
        {show.reference && (
          <FilterSelect aria-label="Referans teyidi" value={filters.reference} placeholder="Referans: tümü"
            options={[{ value: '1', label: 'Referansı teyit edildi' }, { value: '0', label: 'Referans teyidi bekleyen' }]}
            onChange={(e) => setFilter({ reference: e.target.value })} />
        )}
        {show.flag && flagOptions.length > 0 && (
          <FilterSelect aria-label="İşaret" value={filters.flag} placeholder="Tüm işaretler"
            options={flagOptions} onChange={(e) => setFilter({ flag: e.target.value })} />
        )}
        <FilterSelect aria-label="Yaş" value={filters.minor} placeholder="Tüm yaşlar"
          options={[{ value: '1', label: '18 yaş altı' }, { value: '0', label: '18 yaş ve üstü' }]} onChange={(e) => setFilter({ minor: e.target.value })} />
        <DateRange from={filters.from} to={filters.to} onChange={setFilter} />
        {show.finalized && (
          <>
            <FilterSelect aria-label="Burs türü" value={filters.qualified} placeholder="Tüm burs türleri"
              options={[{ value: '1', label: 'Nitelikli bursiyer' }, { value: '0', label: 'Normal bursiyer' }]}
              onChange={(e) => setFilter({ qualified: e.target.value })} />
            <FilterSelect aria-label="Burs veren" value={filters.sponsor} placeholder="Tüm burs verenler"
              options={[{ value: 'gm', label: 'Genel Merkez' }, ...sponsors.map((s) => ({ value: String(s.id), label: s.isActive ? s.name : `${s.name} (pasif)` }))]}
              onChange={(e) => setFilter({ sponsor: e.target.value })} />
          </>
        )}
        {(activeCount > 0 || filters.q) && (
          <div className="flex items-center sm:col-span-2 lg:col-span-6">
            <Button variant="ghost" size="sm" icon={X} onClick={() => { setQ(''); reset(); }}>Temizle</Button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Gönderim tarihi aralığı (gün bazında, uçlar dahil) */
function DateRange({ from, to, onChange }) {
  const cls = clsx(inputClass(false), 'h-10 min-w-0 px-2 text-sm');
  return (
    <div className="flex min-w-0 items-center gap-1 sm:col-span-2" title="Gönderim tarihi">
      <input type="date" aria-label="Gönderim tarihi başlangıç" value={from} max={to || undefined}
        onChange={(e) => onChange({ from: e.target.value })} className={clsx(cls, !from && 'text-slate-500')} />
      <span className="text-slate-400" aria-hidden>–</span>
      <input type="date" aria-label="Gönderim tarihi bitiş" value={to} min={from || undefined}
        onChange={(e) => onChange({ to: e.target.value })} className={clsx(cls, !to && 'text-slate-500')} />
    </div>
  );
}

/** Filtre seçimi: ilk seçenek "tümü" (boş değer) seçilebilir */
function FilterSelect({ options, placeholder, value, className, ...rest }) {
  return (
    <div className={clsx('relative min-w-0', className)}>
      <select value={value ?? ''} className={clsx(inputClass(false), 'h-10 appearance-none pr-9 text-sm', !value && 'text-slate-500')} {...rest}>
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o.value} value={o.value} className="text-slate-900">{o.label}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
    </div>
  );
}
