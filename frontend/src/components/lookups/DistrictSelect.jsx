import { SearchSelect } from '../ui';
import { useDistricts } from '../../hooks/useLookups';

export default function DistrictSelect({ id, cityId, value, onChange, invalid, disabled }) {
  const { data = [], isLoading } = useDistricts(cityId);
  return (
    <SearchSelect id={id} options={data.map((d) => ({ value: d.id, label: d.name }))} value={value} onChange={onChange}
      invalid={invalid} disabled={disabled || !cityId} loading={isLoading && !!cityId}
      placeholder={cityId ? 'İlçe seçin' : 'Önce il seçin'} searchPlaceholder="İlçe ara…" />
  );
}
