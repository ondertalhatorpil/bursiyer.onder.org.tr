import { PencilLine } from 'lucide-react';
import { SearchSelect } from '../ui';
import { useSchools } from '../../hooks/useLookups';

/**
 * İmam hatip lisesi seçimi.
 *   filter: 'sports' | 'international' -> tüm Türkiye'deki ilgili okullar
 *   yoksa cityId + districtId'ye göre listelenir
 * onOther verilirse listenin altında "Okulum listede yok" seçeneği çıkar.
 */
export default function SchoolPicker({ id, value, onChange, invalid, disabled, filter, cityId, districtId, onOther }) {
  const params = filter ? { type: filter } : { cityId, districtId };
  const enabled = !!filter || (!!cityId && !!districtId);
  const { data = [], isLoading } = useSchools(params, enabled);

  const options = data.map((s) => ({
    value: s.id,
    label: s.name,
    sublabel: filter ? `${s.cityName} / ${s.districtName}` : undefined,
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
      placeholder={enabled ? 'Okul seçin' : 'Önce il ve ilçe seçin'}
      searchPlaceholder="Okul adıyla arayın…"
      emptyText="Bu ilçede listemizde okul bulunamadı"
      footer={onOther ? (close) => (
        <button type="button" onClick={() => { close(); onOther(); }}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-brand-700 hover:bg-brand-50">
          <PencilLine className="size-4" aria-hidden /> Okulum listede yok, adını yazacağım
        </button>
      ) : undefined}
    />
  );
}
