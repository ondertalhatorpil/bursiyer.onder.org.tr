import { PencilLine } from 'lucide-react';
import { SearchSelect } from '../ui';
import { useUniversities } from '../../hooks/useLookups';

export default function UniversityPicker({ id, value, onChange, invalid, disabled, onOther }) {
  const { data = [], isLoading } = useUniversities();
  const options = data.map((u) => ({
    value: u.id,
    label: u.name,
    sublabel: [u.cityName, u.type === 'vakif' ? 'Vakıf' : 'Devlet'].filter(Boolean).join(' · '),
  }));
  return (
    <SearchSelect
      id={id} options={options} value={value} onChange={onChange} invalid={invalid} disabled={disabled} loading={isLoading}
      placeholder="Üniversite seçiniz" searchPlaceholder="Üniversite adıyla arayınız…"
      footer={onOther ? (close) => (
        <button type="button" onClick={() => { close(); onOther(); }}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-brand-700 hover:bg-brand-50">
          <PencilLine className="size-4" aria-hidden /> Üniversitem listede yok, adını yazacağım
        </button>
      ) : undefined}
    />
  );
}
