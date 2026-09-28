import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Field, Modal, Alert } from '../../../components/ui';
import { adminApi } from '../../../api/adminEndpoints';

const VARIANT = { approved: 'primary', rejected: 'danger', revision_requested: 'secondary', in_review: 'secondary' };
const ACTION = { in_review: 'İncelemeye al', revision_requested: 'Revize iste', approved: 'Onayla', rejected: 'Reddet' };
const HINT = {
  in_review: 'Başvuru incelemeye alınır. Aday durum sayfasında "İncelemede" görür.',
  revision_requested: 'Aday, "Revize istendi" olarak işaretlediğiniz belgeleri yeniden yükler. Adaya SMS gönderilir. Tüm belgeler yüklenince başvuru otomatik olarak incelemeye döner.',
  approved: 'Başvuru onaylanır ve adaya SMS gönderilir.',
  rejected: 'Başvuru reddedilir. Gerekçe başvuru kaydında saklanır.',
};

/** Statü geçiş butonları + onay penceresi */
export default function StatusActions({ app }) {
  const qc = useQueryClient();
  const [target, setTarget] = useState(null);
  const [text, setText] = useState('');
  const [error, setError] = useState(null);

  const revisionCount = app.documents.filter((d) => d.isCurrent && d.reviewStatus === 'revision_requested').length;
  const mutation = useMutation({
    mutationFn: (body) => adminApi.setStatus(app.id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] });
      setTarget(null);
    },
    onError: (err) => setError(err.details?.reason || err.message),
  });

  if (!app.allowedTransitions.length) return null;
  const actionLabel = (t) => (t.to === 'in_review' && ['approved', 'rejected'].includes(app.status) ? 'Kararı geri al' : ACTION[t.to] || t.label);

  const open = (t) => { setTarget(t); setText(''); setError(null); };
  const submit = () => {
    if (target.to === 'rejected' && text.trim().length < 3) { setError('Red gerekçesini yazın'); return; }
    mutation.mutate(target.to === 'rejected' ? { to: 'rejected', reason: text.trim() } : { to: target.to, note: text.trim() || undefined });
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {app.allowedTransitions.map((t) => (
          <Button key={t.to} size="sm" variant={VARIANT[t.to] || 'secondary'} onClick={() => open(t)}>
            {actionLabel(t)}
          </Button>
        ))}
      </div>

      <Modal open={!!target} onClose={() => setTarget(null)} title={target ? `${actionLabel(target)}: ${target.label}` : ''} size="md"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setTarget(null)}>Vazgeç</Button>
            <Button variant={target?.to === 'rejected' ? 'danger' : 'primary'} loading={mutation.isPending} onClick={submit}
              disabled={target?.to === 'revision_requested' && !revisionCount}>
              {target && actionLabel(target)}
            </Button>
          </>
        )}>
        {target && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">{HINT[target.to]}</p>
            {target.to === 'revision_requested' && (revisionCount
              ? <Alert variant="info">{revisionCount} belge yeniden yükleme için işaretli.</Alert>
              : <Alert variant="warning">Önce aşağıdaki belgelerden yeniden yüklenmesi gerekenleri "Revize iste" ile işaretleyin.</Alert>)}
            <Field label={target.to === 'rejected' ? 'Red gerekçesi' : 'Not (isteğe bağlı)'} htmlFor="status-text" required={target.to === 'rejected'} error={error}>
              <textarea id="status-text" rows={4} value={text} onChange={(e) => setText(e.target.value)} maxLength={1000}
                className="w-full rounded-xl px-3.5 py-2.5 text-[15px] ring-1 ring-inset ring-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </Field>
          </div>
        )}
      </Modal>
    </>
  );
}
