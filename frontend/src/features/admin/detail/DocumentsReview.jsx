import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, ExternalLink, FileText, History, RotateCcw, Undo2 } from 'lucide-react';
import { Alert, Badge, Button, Card, Field, Modal } from '../../../components/ui';
import { adminApi } from '../../../api/adminEndpoints';
import { formatBytes, formatDateTime } from '../../../lib/format';
import { REVIEW_STATUS } from '../shared/constants';

const REVIEWABLE = ['submitted', 'in_review', 'revision_requested'];

/** Belge inceleme: görüntüle, uygun / revize iste / geri al. Eski sürümler katlanır. */
export default function DocumentsReview({ app, canReview }) {
  const qc = useQueryClient();
  const [revise, setRevise] = useState(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState(null);
  const [showArchive, setShowArchive] = useState(false);

  const editable = canReview && REVIEWABLE.includes(app.status);
  const current = app.documents.filter((d) => d.isCurrent);
  const archived = app.documents.filter((d) => !d.isCurrent);

  const mutation = useMutation({
    mutationFn: ({ doc, body }) => adminApi.reviewDocument(app.id, doc.id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'application', app.id] }); setRevise(null); },
    onError: (err) => setError(err.details?.note || err.message),
  });

  const review = (doc, reviewStatus, n) => { setError(null); mutation.mutate({ doc, body: { reviewStatus, ...(n ? { note: n } : {}) } }); };

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
        <h2 className="text-base font-bold">Belgeler</h2>
        <p className="text-xs text-slate-500">
          {current.filter((d) => d.reviewStatus === 'accepted').length}/{current.length} uygun
        </p>
      </div>
      {!editable && canReview && <p className="px-5 pt-4 text-sm text-slate-500">Bu statüdeki başvurunun belgeleri değerlendirilemez.</p>}
      {error && !revise && <div className="px-5 pt-4"><Alert variant="error">{error}</Alert></div>}

      <ul className="divide-y divide-slate-100">
        {current.map((d) => (
          <li key={d.id} className="px-5 py-4">
            <DocRow app={app} d={d} />
            {editable && (
              <div className="mt-3 flex flex-wrap gap-2">
                {d.reviewStatus !== 'accepted' && (
                  <Button size="sm" variant="secondary" icon={Check} disabled={mutation.isPending} onClick={() => review(d, 'accepted')}>Uygun</Button>
                )}
                {d.reviewStatus !== 'revision_requested' && (
                  <Button size="sm" variant="secondary" icon={RotateCcw} disabled={mutation.isPending}
                    onClick={() => { setRevise(d); setNote(''); setError(null); }}>Revize iste</Button>
                )}
                {d.reviewStatus !== 'pending' && (
                  <Button size="sm" variant="ghost" icon={Undo2} disabled={mutation.isPending} onClick={() => review(d, 'pending')}>Geri al</Button>
                )}
              </div>
            )}
          </li>
        ))}
        {!current.length && <li className="px-5 py-6 text-sm text-slate-500">Yüklenmiş belge yok.</li>}
      </ul>

      {archived.length > 0 && (
        <div className="border-t border-slate-100 px-5 py-3">
          <button type="button" onClick={() => setShowArchive((s) => !s)} className="flex items-center gap-2 text-sm font-semibold text-brand-700 hover:underline" aria-expanded={showArchive}>
            <History className="size-4" aria-hidden /> Önceki sürümler ({archived.length})
          </button>
          {showArchive && (
            <ul className="mt-3 space-y-3">
              {archived.map((d) => <li key={d.id} className="rounded-xl bg-slate-50 p-3"><DocRow app={app} d={d} archived /></li>)}
            </ul>
          )}
        </div>
      )}

      <Modal open={!!revise} onClose={() => setRevise(null)} title="Revize iste" size="md"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setRevise(null)}>Vazgeç</Button>
            <Button loading={mutation.isPending} onClick={() => {
              if (note.trim().length < 3) { setError('Adaya gösterilecek gerekçeyi yazın'); return; }
              review(revise, 'revision_requested', note.trim());
            }}>İşaretle</Button>
          </>
        )}>
        {revise && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600"><strong>{revise.typeName}</strong> yeniden yükleme için işaretlenecek. Adaya revize SMS'i, statüyü "Revize İstendi" yaptığınızda gider.</p>
            <Field label="Adaya gösterilecek gerekçe" htmlFor="revise-note" required error={error}>
              <textarea id="revise-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000}
                placeholder="Ör. Belge 30 günden eski, güncel tarihli belge yükleyin."
                className="w-full rounded-xl px-3.5 py-2.5 text-[15px] ring-1 ring-inset ring-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </Field>
          </div>
        )}
      </Modal>
    </Card>
  );
}

function DocRow({ app, d, archived }) {
  const rs = REVIEW_STATUS[d.reviewStatus] || REVIEW_STATUS.pending;
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 gap-3">
        <FileText className="mt-0.5 size-5 shrink-0 text-brand-600" aria-hidden />
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">{d.typeName}</p>
          <p className="truncate text-xs text-slate-500" title={d.originalName}>
            {d.originalName} · {formatBytes(d.size)} · {formatDateTime(d.uploadedAt)}
          </p>
          {d.reviewNote && <p className="mt-1.5 rounded-lg bg-accent-50 px-2.5 py-1.5 text-xs text-accent-700">Gerekçe: {d.reviewNote}</p>}
          {d.reviewedBy && <p className="mt-1 text-xs text-slate-400">{d.reviewedBy} · {formatDateTime(d.reviewedAt)}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 pl-8 sm:pl-0">
        {!archived && <Badge tone={rs.tone}>{rs.label}</Badge>}
        <a href={adminApi.documentUrl(app.id, d.id)} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
          Görüntüle <ExternalLink className="size-3.5" aria-hidden />
        </a>
      </div>
    </div>
  );
}
