import { Select } from '../ui';
import { useDormitories } from '../../hooks/useLookups';

export default function DormitorySelect({ id, value, onChange, invalid, disabled }) {
  const { data = [] } = useDormitories();
  return (
    <Select id={id} value={value} onChange={(e) => onChange(e.target.value)} invalid={invalid} disabled={disabled}
      options={data.map((d) => ({ value: d.id, label: d.name }))} placeholder="Kaldığınız yurdu seçin" />
  );
}
