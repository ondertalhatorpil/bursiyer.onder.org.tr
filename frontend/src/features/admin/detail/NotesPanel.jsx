import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card } from '../../../components/ui';
import { adminApi } from '../../../api/adminEndpoints';
import { formatDateTime } from '../../../lib/format';
import { NOTE_KINDS } from '../shared/constants';

/** İç notlar (adaya gösterilmez). Koordinatörler öneri bırakabilir. */
export default function NotesPanel({ app, canWrite }) {
  const qc = useQueryClient();
  const [kind, setKind] = useState('note');
  const [body, setBody] = useState('');
  const mutation = useMutation({
    mutationFn: () => adminApi.addNote(app.id, { kind, body: body.trim() }),
    onSuccess: () => { setBody(''); setKind('note'); qc.invalidateQueries({ queryKey: ['admin', 'application', app.id] }); },
  });

  return (
    <Card>
      <div className="border-b border-slate-100 px-5 py-3.5">
        <h2 className="text-base font-bold">İç notlar</h2>
        <p className="text-xs text-slate-500">Adaya gösterilmez</p>
      </div>
      {canWrite && (
        <form className="space-y-2 border-b border-slate-100 px-5 py-4" onSubmit={(e) => { e.preventDefault(); if (body.trim().length >= 2) mutation.mutate(); }}>
          <textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} aria-label="Not"
            placeholder="Not ekleyin…"
            className="w-full rounded-xl px-3.5 py-2.5 text-sm ring-1 ring-inset ring-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Not türü">
              {Object.entries(NOTE_KINDS).map(([k, v]) => (
                <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${kind === k ? 'bg-brand-700 text-white ring-brand-700' : 'text-slate-600 ring-slate-300 hover:bg-slate-50'}`}>
                  {v.label}
                </button>
              ))}
            </div>
            <Button type="submit" size="sm" loading={mutation.isPending} disabled={body.trim().length < 2}>Ekle</Button>
          </div>
          {mutation.error && <p className="text-xs font-medium text-accent-600">{mutation.error.message}</p>}
        </form>
      )}
      <ul className="divide-y divide-slate-100">
        {app.notes.map((n) => (
          <li key={n.id} className="px-5 py-3 text-sm">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-800">{n.author}</span>
              {n.kind !== 'note' && <Badge tone={NOTE_KINDS[n.kind].tone}>{NOTE_KINDS[n.kind].label}</Badge>}
              <span className="text-xs text-slate-400">{formatDateTime(n.createdAt)}</span>
            </div>
            <p className="whitespace-pre-line text-slate-700">{n.body}</p>
          </li>
        ))}
        {!app.notes.length && <li className="px-5 py-4 text-sm text-slate-500">Henüz not yok.</li>}
      </ul>
    </Card>
  );
}
