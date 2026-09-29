import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Award } from 'lucide-react';
import { Card } from '../../../components/ui';
import { adminApi } from '../../../api/adminEndpoints';
import { formatDateTime } from '../../../lib/format';

/** Nitelikli bursiyer işareti: yalnızca kesinleşmiş bursiyerlerde, karar yetkisiyle değiştirilir */
export default function QualifiedToggle({ app, canWrite }) {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (v) => adminApi.setQualified(app.id, v),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  });
  const { value, changedAt, changedBy } = app.qualified;
  const checked = m.isPending ? m.variables : value;

  return (
    <Card className="px-5 py-4">
      <label className={`flex items-start gap-3 ${canWrite ? 'cursor-pointer' : ''}`}>
        <input type="checkbox" className="mt-1 size-5 shrink-0 accent-brand-700 disabled:opacity-60"
          checked={checked} disabled={!canWrite || m.isPending} onChange={(e) => m.mutate(e.target.checked)} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 font-semibold text-slate-900">
            <Award className={`size-4 ${checked ? 'text-brand-700' : 'text-slate-400'}`} aria-hidden />
            Nitelikli bursiyer
          </span>
          <span className="block text-xs text-slate-500">
            {changedAt ? `${value ? 'İşaretleyen' : 'İşareti kaldıran'}: ${changedBy || ''} · ${formatDateTime(changedAt)}` : 'İşaretlenmezse normal bursiyer olarak kalır.'}
          </span>
          {m.error && <span className="mt-1 block text-xs text-accent-700">{m.error.message}</span>}
        </span>
      </label>
    </Card>
  );
}
