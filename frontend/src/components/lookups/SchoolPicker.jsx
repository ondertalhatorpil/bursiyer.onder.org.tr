import { PencilLine } from 'lucide-react';
import { SearchSelect } from '../ui';
import { useSchools } from '../../hooks/useLookups';

/**
 * İmam hatip lisesi seçimi.
 *   filter: 'sports' | 'international' -> tüm Türkiye'deki ilgili okullar
 *   byCity: sadece cityId'ye göre (ilçe sorulmadan) listelenir
 *   yoksa cityId + districtId'ye göre listelenir
 * onOther verilirse listenin altında "Okulum listede yok" seçeneği çıkar.
 */
export default function SchoolPicker({ id, value, onChange, invalid, disabled, filter, byCity, cityId, districtId, onOther }) {
  const params = filter ? { type: filter } : byCity ? { cityId } : { cityId, districtId };
  const enabled = !!filter || (!!cityId && (byCity || !!districtId));
  const { data = [], isLoading } = useSchools(params, enabled);

  const options = data.map((s) => ({
    value: s.id,
    label: s.name,
    sublabel: filter ? `${s.cityName} / ${s.districtName}` : byCity ? s.districtName : undefined,
  }));

  return (
    <SearchSelect
      id={id}
      options={options}
      value={value}
      onChange={onChange}
      invalid={invalid}
      disabled={disabled || !enabled}
      loading={isLoading && enabled}
      placeholder={enabled ? 'Okul seçiniz' : byCity ? 'Önce il seçiniz' : 'Önce il ve ilçe seçiniz'}
      searchPlaceholder="Okul adıyla arayınız…"
      emptyText={byCity ? 'Bu ilde listemizde okul bulunamadı' : 'Bu ilçede listemizde okul bulunamadı'}
      footer={onOther ? (close) => (
        <button type="button" onClick={() => { close(); onOther(); }}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-brand-700 hover:bg-brand-50">
          <PencilLine className="size-4" aria-hidden /> Okulum listede yok, adını yazacağım
        </button>
      ) : undefined}
    />
  );
}
