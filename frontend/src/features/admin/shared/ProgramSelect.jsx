import { useQuery } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { inputClass } from '../../../components/ui';
import { adminApi } from '../../../api/adminEndpoints';

/**
 * Dönem seçimi. Boş değer = en son dönem. Tek dönem varsa gösterilmez.
 */
export default function ProgramSelect({ value, onChange, className }) {
  const { data: programs = [] } = useQuery({ queryKey: ['admin', 'programs'], queryFn: adminApi.programs, staleTime: 300_000 });
  if (programs.length < 2) return null;
  return (
    <div className={clsx('relative', className)}>
      <select aria-label="Dönem" value={value || ''} onChange={(e) => onChange(e.target.value)}
        className={clsx(inputClass(false), 'h-9 appearance-none pr-9 text-sm font-semibold')}>
        {programs.map((p, i) => (
          <option key={p.id} value={i === 0 ? '' : String(p.id)}>
            {p.name}{p.isOpen ? ' (açık)' : ''}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
    </div>
  );
}
