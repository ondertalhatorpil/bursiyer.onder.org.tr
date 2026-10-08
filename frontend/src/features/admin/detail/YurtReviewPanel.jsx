import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PencilLine, Send } from 'lucide-react';
import { Alert, Button, Card, Field, MaskedInput, MASKS } from '../../../components/ui';
import { adminApi } from '../../../api/adminEndpoints';
import { formatDateTime, formatMoney } from '../../../lib/format';

/** Önerinin gösterimi: tutar, metin, kim / ne zaman */
function Recommendation({ value }) {
  return (
    <div className="space-y-1.5 text-sm">
      <p className="text-lg font-bold text-slate-900">{formatMoney(value.amount)} <span className="text-sm font-medium text-slate-500">/ ay</span></p>
      {value.note && <p className="whitespace-pre-line text-slate-700">{value.note}</p>}
      <p className="text-xs text-slate-400">{value.by} · {formatDateTime(value.at)}</p>
    </div>
  );
}

/** Öneri formu: aylık tutar + metin. noteRequired: yurt idaresinde metin zorunlu */
function RecommendationForm({ app, stage, current, noteRequired, submitLabel, onDone }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState(current?.amount ? String(current.amount) : '');
  const [note, setNote] = useState(current?.note || '');
  const [errors, setErrors] = useState({});
  const mutation = useMutation({
    mutationFn: () => adminApi.setYurtReview(app.id, stage, { amount, note: note.trim() || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin'] }); onDone?.(); },
    onError: (err) => setErrors({ ...(err.details || {}), root: err.details ? null : err.message }),
  });
  const submit = (e) => {
    e.preventDefault();
    const next = {};
    if (!amount) next.amount = 'Önerdiğiniz aylık burs miktarını yazın';
    if (noteRequired && note.trim().length < 3) next.note = 'Değerlendirme metnini yazın';
    setErrors(next);
    if (!Object.keys(next).length) mutation.mutate();
  };
  const id = (k) => `yurt-${stage}-${k}`;

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      {errors.root && <Alert variant="error">{errors.root}</Alert>}
      <Field label="Önerilen aylık burs (TL)" htmlFor={id('amount')} required error={errors.amount} className="sm:max-w-xs">
        <MaskedInput id={id('amount')} mask={MASKS.money} value={amount} onChange={setAmount} placeholder="Örn. 3.000" invalid={!!errors.amount} />
      </Field>
      <Field label={noteRequired ? 'Değerlendirme metni' : 'Not (isteğe bağlı)'} htmlFor={id('note')} required={noteRequired} error={errors.note}>
        <textarea id={id('note')} rows={4} value={note} onChange={(e) => setNote(e.target.value)} maxLength={4000}
          className="w-full rounded-xl px-3.5 py-2.5 text-sm ring-1 ring-inset ring-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500" />
      </Field>
      <div className="flex flex-wrap justify-end gap-2">
        {current && <Button variant="secondary" size="sm" onClick={onDone}>Vazgeç</Button>}
        <Button type="submit" size="sm" icon={Send} loading={mutation.isPending}>{submitLabel}</Button>
      </div>
    </form>
  );
}

/** Bir aşama: gönderildiyse öneri (yetkiliyse düzenle), değilse form veya bekleniyor */
function Stage({ title, value, canEdit, waitingText, form }) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="space-y-3 px-5 py-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        {value && canEdit && !editing && <Button variant="ghost" size="sm" icon={PencilLine} onClick={() => setEditing(true)}>Düzenle</Button>}
      </div>
      {value && !editing && <Recommendation value={value} />}
      {canEdit && (!value || editing) && form(() => setEditing(false), value)}
      {!value && !canEdit && <p className="text-sm text-slate-500">{waitingText}</p>}
    </div>
  );
}

/**
 * Yurt Konaklama Bursu değerlendirme zinciri (formdaki imza kutuları):
 *   Öğrencinin talebi -> Yurt İdaresinin Önerisi -> Yurtlar Biriminin Önerisi -> Burs Komisyonunun Kararı
 * Yurt müdürü kendi önerisini, yurtlar birimi yurt önerisini ve kendisininkini, süper admin hepsini görür.
 */
export default function YurtReviewPanel({ app }) {
  const r = app.yurtReview;
  if (!r) return null;
  const seesHq = r.hq || r.canHq || r.canDecide;

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
        <h2 className="text-base font-bold">Burs önerileri ve karar</h2>
        <p className="text-sm text-slate-600">Öğrencinin talebi: <strong className="text-slate-900">{formatMoney(r.requestedAmount) || '—'}</strong> / ay</p>
      </div>
      <div className="divide-y divide-slate-100">
        <Stage title="Yurt İdaresinin Önerisi" value={r.dorm} canEdit={r.canDorm} waitingText="Yurt müdürü henüz öneri göndermedi."
          form={(done, current) => (
            <RecommendationForm app={app} stage="dorm" current={current} noteRequired submitLabel="Genel Merkeze gönder" onDone={done} />
          )} />
        {seesHq && (
          <Stage title="Yurtlar Biriminin Önerisi" value={r.hq} canEdit={r.canHq} waitingText="Yurtlar birimi henüz öneri göndermedi."
            form={(done, current) => (
              <RecommendationForm app={app} stage="hq" current={current} submitLabel="Süper admine gönder" onDone={done} />
            )} />
        )}
        {(r.final || r.canDecide) && (
          <div className="space-y-2 px-5 py-4">
            <h3 className="text-sm font-bold text-slate-800">Burs Komisyonunun Kararı</h3>
            {r.final ? <Recommendation value={r.final} /> : (
              <p className="text-sm text-slate-500">Karar, sayfanın üstündeki "Onayla" ile onaylanan aylık burs miktarı girilerek verilir.</p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
