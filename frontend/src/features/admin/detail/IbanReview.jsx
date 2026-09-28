import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, ChevronDown, ExternalLink, TriangleAlert, X } from 'lucide-react';
import { Alert, Badge, Button, Card, Field, Modal, Textarea } from '../../../components/ui';
import { adminApi } from '../../../api/adminEndpoints';
import { formatDateTime } from '../../../lib/format';

const TONE = { pending: 'brand', accepted: 'success', rejected: 'danger' };

/** Adım 8: IBAN kontrolü. Uygun -> kayıt kesinleşir; Red -> aday yeniden girer. */
export default function IbanReview({ app, canDecide }) {
  const qc = useQueryClient();
  const [reject, setReject] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState(null);
  const [history, setHistory] = useState(false);
  const accounts = app.bankAccounts || [];
  const current = accounts.find((a) => a.isCurrent);
  const past = accounts.filter((a) => !a.isCurrent);

  const m = useMutation({
    mutationFn: (body) => adminApi.reviewIban(app.id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin'] }); setReject(false); },
    onError: (err) => setError(err.details?.note || err.message),
  });

  if (!current && app.status !== 'approved') return null;
  const pending = app.status === 'iban_pending' && current?.status === 'pending';

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
        <h2 className="text-base font-bold">IBAN bilgileri</h2>
        {current && <Badge tone={TONE[current.status]} dot>{current.statusLabel}</Badge>}
      </div>
      <div className="space-y-4 px-5 py-4">
        {!current || (app.status === 'approved' && current.status === 'rejected') ? (
          <p className="text-sm text-slate-600">Adayın IBAN bilgilerini girmesi bekleniyor. Onay SMS'inde IBAN girişi için davet gönderildi.</p>
        ) : null}
        {current && (
          <>
            <AccountDetails app={app} a={current} />
            {pending && canDecide && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" icon={BadgeCheck} loading={m.isPending && !reject} onClick={() => { setError(null); m.mutate({ decision: 'accepted' }); }}>
                  IBAN uygun, kaydı kesinleştir
                </Button>
                <Button size="sm" variant="secondary" icon={X} onClick={() => { setNote(''); setError(null); setReject(true); }}>Reddet</Button>
              </div>
            )}
            {pending && !canDecide && <p className="text-xs text-slate-500">IBAN kararını Genel Merkez verir.</p>}
            {error && !reject && <Alert variant="error">{error}</Alert>}
          </>
        )}
      </div>

      {past.length > 0 && (
        <div className="border-t border-slate-100 px-5 py-3">
          <button type="button" onClick={() => setHistory((h) => !h)} aria-expanded={history}
            className="flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
            Önceki girişler ({past.length}) <ChevronDown className={`size-4 transition ${history ? 'rotate-180' : ''}`} aria-hidden />
          </button>
          {history && <ul className="mt-3 space-y-3">{past.map((a) => <li key={a.id} className="rounded-xl bg-slate-50 p-3"><AccountDetails app={app} a={a} compact /></li>)}</ul>}
        </div>
      )}

      <Modal open={reject} onClose={() => setReject(false)} title="IBAN'ı reddet" size="md"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setReject(false)}>Vazgeç</Button>
            <Button variant="danger" loading={m.isPending} onClick={() => {
              if (note.trim().length < 3) { setError('Adaya gösterilecek gerekçeyi yazın'); return; }
              m.mutate({ decision: 'rejected', note: note.trim() });
            }}>Reddet</Button>
          </>
        )}>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Aday SMS ile bilgilendirilir ve IBAN bilgilerini yeniden girer. Başvuru "Onaylandı" durumuna döner.</p>
          <Field label="Adaya gösterilecek gerekçe" htmlFor="iban-note" required error={error}>
            <Textarea id="iban-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000}
              placeholder="Ör. Hesap belgesinde adınız görünmüyor / hesap size ait değil." />
          </Field>
        </div>
      </Modal>
    </Card>
  );
}

function AccountDetails({ app, a, compact }) {
  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        <div className="min-w-0 sm:col-span-2"><dt className="text-xs font-medium text-slate-500">IBAN</dt><dd className="mt-0.5 break-all font-mono text-base font-semibold text-slate-900">{a.iban}</dd></div>
        <div><dt className="text-xs font-medium text-slate-500">Banka</dt><dd className="mt-0.5 text-slate-900">{a.bankName || `Kod ${a.bankCode}`}</dd></div>
        <div><dt className="text-xs font-medium text-slate-500">Hesap sahibi (sistemden)</dt><dd className="mt-0.5 text-slate-900">{a.holderName}</dd></div>
        <div><dt className="text-xs font-medium text-slate-500">Gönderim</dt><dd className="mt-0.5 text-slate-900">{formatDateTime(a.submittedAt)}</dd></div>
        {a.document && (
          <div><dt className="text-xs font-medium text-slate-500">Hesap belgesi</dt><dd className="mt-0.5">
            <a href={adminApi.ibanFileUrl(app.id, a.id)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">
              Görüntüle <ExternalLink className="size-3.5" aria-hidden />
            </a>
          </dd></div>
        )}
      </dl>
      {!compact && !a.bankKnown && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700"><TriangleAlert className="size-3.5" aria-hidden />Banka kodu ({a.bankCode}) listede yok; bankayı belgeden kontrol edin.</p>
      )}
      {!compact && a.usedByOthers && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-accent-700"><TriangleAlert className="size-3.5" aria-hidden />Bu IBAN daha önce başka bir başvuruda girilmiş.</p>
      )}
      {a.reviewNote && <p className="rounded-lg bg-accent-50 px-2.5 py-1.5 text-xs text-accent-700">Red gerekçesi: {a.reviewNote}</p>}
      {a.reviewedBy && <p className="text-xs text-slate-400">{a.statusLabel} · {a.reviewedBy} · {formatDateTime(a.reviewedAt)}</p>}
    </div>
  );
}
