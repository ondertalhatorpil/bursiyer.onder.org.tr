import { SearchSelect } from '../ui';
import { useCities } from '../../hooks/useLookups';

/** 81 il (aranabilir). excludeIds ile bazı iller hariç tutulabilir (ör. Teşkilat/Anadolu'da İstanbul). */
export default function CitySelect({ id, value, onChange, invalid, disabled, excludeIds = [] }) {
  const { data = [], isLoading } = useCities();
  const options = data.filter((c) => !excludeIds.includes(c.id)).map((c) => ({ value: c.id, label: c.name }));
  return (
    <SearchSelect id={id} options={options} value={value} onChange={onChange} invalid={invalid} disabled={disabled}
      loading={isLoading} placeholder="İl seçin" searchPlaceholder="İl ara…" />
  );
}
