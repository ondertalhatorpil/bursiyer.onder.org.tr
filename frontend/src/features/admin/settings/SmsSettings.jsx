import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { MessageSquareText, Send } from 'lucide-react';
import { Alert, Badge, Button, Card, CardBody, CardFooter, Field, PageSpinner, Switch, Textarea } from '../../../components/ui';
import { settingsApi } from '../../../api/adminEndpoints';
import { applyApiErrors } from '../../../lib/form-errors';
import { renderSample, smsParts } from './smsLength';
import useSaveState from './useSaveState';
import SavedHint from './SavedHint';

const KEY = ['admin', 'settings', 'sms'];

export default function SmsSettings() {
  const { data, isLoading, error } = useQuery({ queryKey: KEY, queryFn: settingsApi.sms });
  if (isLoading) return <PageSpinner />;
  if (error) return <Alert variant="error">{error.message}</Alert>;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-5 py-4 ring-1 ring-slate-200">
        <p className="flex items-center gap-2 text-sm text-slate-700">
          <MessageSquareText className="size-5 text-brand-600" aria-hidden />
          SMS kredisi: <strong className="tabular-nums">{data.credit != null ? data.credit.toLocaleString('tr-TR') : 'alınamadı'}</strong>
        </p>
        <p className="text-xs text-slate-500">Türkçe karakter (ı, ş, ğ, İ) içeren mesaj 70, içermeyen 160 karakterde bir SMS sayılır.</p>
      </div>
      {data.templates.map((t) => <TemplateCard key={t.code} template={t} />)}
    </div>
  );
}

function TemplateCard({ template: t }) {
  const qc = useQueryClient();
  const [saved, markSaved] = useSaveState();
  const [test, setTest] = useState({ state: 'idle', message: '' });
  const { register, handleSubmit, setError, watch, setValue, reset, formState: { errors, isSubmitting, isDirty } } = useForm({
    values: { body: t.body, isActive: t.isActive },
  });
  const body = watch('body');
  const isActive = watch('isActive');
  const preview = renderSample(body || '');
  const len = smsParts(preview);

  const submit = handleSubmit(async (v) => {
    try {
      const res = await settingsApi.updateSms(t.code, t.isOtp ? { body: v.body } : v);
      qc.setQueryData(KEY, (old) => ({ ...old, templates: old.templates.map((x) => (x.code === t.code ? res : x)) }));
      markSaved();
    } catch (err) {
      applyApiErrors(err, setError, ['body', 'isActive']);
    }
  });

  const sendTest = async () => {
    setTest({ state: 'sending', message: '' });
    try {
      await settingsApi.testSms(t.code);
      setTest({ state: 'done', message: 'Test SMS\'i telefonunuza gönderildi.' });
    } catch (err) {
      setTest({ state: 'error', message: err.message });
    }
  };

  return (
    <Card>
      <form onSubmit={submit} noValidate>
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4 sm:px-6">
          <div>
            <h2 className="font-bold text-slate-900">{t.name}</h2>
            <p className="text-xs text-slate-500">{t.usedIn}</p>
          </div>
          {t.isOtp ? <Badge tone="brand">Doğrulama kodu · her zaman gönderilir</Badge> : (
            <Switch id={`sms-${t.code}`} checked={isActive} onChange={(v) => setValue('isActive', v, { shouldDirty: true })} label={isActive ? 'Gönderiliyor' : 'Kapalı'} />
          )}
        </div>
        <CardBody className="space-y-3">
          {errors.root && <Alert variant="error">{errors.root.message}</Alert>}
          <Field label="Mesaj" htmlFor={`sms-body-${t.code}`} error={errors.body?.message}
            hint={`Değişkenler: ${t.placeholders.map((p) => `{${p}}`).join(', ') || 'yok'}${t.required.length ? ` (zorunlu: ${t.required.map((p) => `{${p}}`).join(', ')})` : ''}`}>
            <Textarea id={`sms-body-${t.code}`} rows={3} invalid={!!errors.body} {...register('body')} />
          </Field>
          <div className="rounded-xl bg-slate-50 p-3 text-sm">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Örnek görünüm</p>
            <p className="whitespace-pre-line text-slate-800">{preview}</p>
            <p className={`mt-2 text-xs ${len.parts > 1 ? 'font-semibold text-amber-700' : 'text-slate-500'}`}>
              {len.length} karakter · {len.parts} SMS{len.unicode ? ' · Türkçe karakter var' : ''}
            </p>
          </div>
        </CardBody>
        <CardFooter>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="ghost" size="sm" icon={Send} loading={test.state === 'sending'} onClick={sendTest} disabled={isDirty}
              title={isDirty ? 'Önce kaydedin' : undefined}>
              Kendime test gönder
            </Button>
            {test.message && <span className={`text-xs ${test.state === 'error' ? 'text-accent-600' : 'text-emerald-700'}`}>{test.message}</span>}
          </div>
          <div className="flex items-center gap-3">
            <SavedHint show={saved} />
            {isDirty && <Button variant="ghost" onClick={() => reset()}>Vazgeç</Button>}
            <Button type="submit" loading={isSubmitting} disabled={!isDirty}>Kaydet</Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
