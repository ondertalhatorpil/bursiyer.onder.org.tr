import { SearchSelect } from '../ui';
import { useCountries } from '../../hooks/useLookups';

/** Uyruk / vatandaşlık seçimi: ülke adları (aranabilir). Değer olarak ülke adı saklanır. */
export default function CountrySelect({ id, value, onChange, invalid, disabled }) {
  const { data = [], isLoading } = useCountries();
  const options = data.map((name) => ({ value: name, label: name }));
  return (
    <SearchSelect id={id} options={options} value={value} onChange={onChange} invalid={invalid} disabled={disabled}
      loading={isLoading} placeholder="Ülke seçiniz" searchPlaceholder="Ülke adıyla arayınız…" />
  );
}
