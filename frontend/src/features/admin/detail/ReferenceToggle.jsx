import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, ShieldQuestion } from 'lucide-react';
import { Button, Card } from '../../../components/ui';
import { adminApi } from '../../../api/adminEndpoints';
import { formatDateTime } from '../../../lib/format';

/** Referans (kanal bilgileri) elle kontrol edildi mi? */
export default function ReferenceToggle({ app, canWrite }) {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (v) => adminApi.setReference(app.id, v),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  });
  const { verified, verifiedAt, verifiedBy } = app.reference;
  const Icon = verified ? ShieldCheck : ShieldQuestion;
  return (
    <Card className="px-5 py-4">
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 size-6 shrink-0 ${verified ? 'text-emerald-600' : 'text-slate-400'}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900">{verified ? 'Referans kontrol edildi' : 'Referans kontrol edilmedi'}</p>
          <p className="text-xs text-slate-500">{verified ? `${verifiedBy || ''} · ${formatDateTime(verifiedAt)}` : 'Başvuru kanalındaki bilgileri kontrol edip işaretleyin.'}</p>
        </div>
      </div>
      {canWrite && (
        <Button size="sm" variant={verified ? 'ghost' : 'secondary'} className="mt-3" loading={m.isPending} onClick={() => m.mutate(!verified)}>
          {verified ? 'İşareti kaldır' : 'Kontrol edildi olarak işaretle'}
        </Button>
      )}
    </Card>
  );
}
