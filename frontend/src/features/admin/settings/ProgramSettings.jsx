import { useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { CalendarPlus } from 'lucide-react';
import { Alert, Badge, Button, Card, CardBody, CardFooter, CardHeader, Field, PageSpinner, Switch, TextInput } from '../../../components/ui';
import { settingsApi } from '../../../api/adminEndpoints';
import { applyApiErrors } from '../../../lib/form-errors';
import { formatDateTime } from '../../../lib/format';
import { fromLocalInput, toLocalInput } from '../../../lib/datetime';
import useSaveState from './useSaveState';
import SavedHint from './SavedHint';

const STATES = {
  open: { label: 'Başvuruya açık', tone: 'success' },
  scheduled: { label: 'Başlangıç tarihi bekleniyor', tone: 'brand' },
  ended: { label: 'Bitiş tarihi geçti', tone: 'warning' },
  closed: { label: 'Kapalı', tone: 'neutral' },
};

const KEY = ['admin', 'settings', 'programs'];

export default function ProgramSettings() {
  const { data, isLoading, error } = useQuery({ queryKey: KEY, queryFn: settingsApi.programs });
  const [showNew, setShowNew] = useState(false);
  if (isLoading) return <PageSpinner />;
  if (error) return <Alert variant="error">{error.message}</Alert>;

  return (
    <div className="space-y-5">
      {data.readiness.length > 0 && (
        <Alert variant="warning" title="Dönem başvuruya açılmadan önce tamamlanması gerekenler">
          <ul className="list-disc space-y-0.5 pl-4">{data.readiness.map((i) => <li key={i.code}>{i.message}</li>)}</ul>
          <Link to="/admin/ayarlar/onay-metinleri" className="mt-2 inline-block font-semibold underline">Onay metinlerine git</Link>
        </Alert>
      )}
      {data.programs.map((p, i) => <ProgramCard key={p.id} program={p} canOpen={!data.readiness.length} latest={i === 0} />)}

      {showNew ? <NewProgramForm onDone={() => setShowNew(false)} /> : (
        <Button variant="secondary" icon={CalendarPlus} onClick={() => setShowNew(true)}>Yeni dönem oluştur</Button>
      )}
    </div>
  );
}

function ProgramCard({ program: p, canOpen, latest }) {
  const qc = useQueryClient();
  const [saved, markSaved] = useSaveState();
  const { register, handleSubmit, setError, watch, setValue, reset, formState: { errors, isSubmitting, isDirty } } = useForm({
    values: {
      title: p.title, trackingPrefix: p.trackingPrefix, isOpen: p.isOpen,
      opensAt: toLocalInput(p.opensAt), closesAt: toLocalInput(p.closesAt),
    },
  });
  const isOpen = watch('isOpen');
  const state = STATES[p.state];

  const save = handleSubmit(async (v) => {
    try {
      const res = await settingsApi.updateProgram(p.id, {
        title: v.title, trackingPrefix: v.trackingPrefix, isOpen: v.isOpen,
        opensAt: fromLocalInput(v.opensAt), closesAt: fromLocalInput(v.closesAt),
      });
      qc.setQueryData(KEY, res);
      qc.invalidateQueries({ queryKey: ['public'] });
      markSaved();
    } catch (err) {
      applyApiErrors(err, setError, ['title', 'trackingPrefix', 'isOpen', 'opensAt', 'closesAt']);
    }
  });

  return (
    <Card>
      <CardHeader
        eyebrow={latest ? 'Güncel dönem' : 'Geçmiş dönem'}
        title={p.name}
        description={`${p.submittedCount.toLocaleString('tr-TR')} gönderilmiş, ${(p.applicationCount - p.submittedCount).toLocaleString('tr-TR')} taslak başvuru`}
        actions={<Badge tone={state.tone} dot>{state.label}</Badge>}
      />
      <form onSubmit={save} noValidate>
        <CardBody className="space-y-5">
          {errors.root && <Alert variant="error">{errors.root.message}</Alert>}
          <div className="rounded-xl bg-slate-50 p-4">
            <Switch id={`open-${p.id}`} checked={isOpen} onChange={(v) => setValue('isOpen', v, { shouldDirty: true })}
              disabled={!isOpen && !canOpen}
              label="Başvuruya açık"
              description={!isOpen && !canOpen ? 'Önce eksik onay metinlerini yayınlayın.' : 'Açıkken aday kayıt olabilir, belgelerini yükleyip gönderebilir. Aynı anda tek dönem açık olur.'} />
            {errors.isOpen && <p className="mt-2 text-xs font-medium text-accent-600">{errors.isOpen.message}</p>}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Başlangıç (isteğe bağlı)" htmlFor={`opens-${p.id}`} error={errors.opensAt?.message}
              hint="Boşsa açtığınız anda başlar. Türkiye saati.">
              <TextInput id={`opens-${p.id}`} type="datetime-local" invalid={!!errors.opensAt} {...register('opensAt')} />
            </Field>
            <Field label="Bitiş (isteğe bağlı)" htmlFor={`closes-${p.id}`} error={errors.closesAt?.message}
              hint="Bu saatten sonra başvuru alınmaz. Türkiye saati.">
              <TextInput id={`closes-${p.id}`} type="datetime-local" invalid={!!errors.closesAt} {...register('closesAt')} />
            </Field>
            <Field label="Program başlığı" htmlFor={`title-${p.id}`} error={errors.title?.message} className="md:col-span-2">
              <TextInput id={`title-${p.id}`} invalid={!!errors.title} {...register('title')} />
            </Field>
            <Field label="Takip numarası ön eki" htmlFor={`prefix-${p.id}`} error={errors.trackingPrefix?.message}
              hint={p.submittedCount ? 'Takip numarası verilmiş başvuru olduğu için değiştirilemez.' : 'Örnek: OND-2026 → OND-2026-48213'}>
              <TextInput id={`prefix-${p.id}`} disabled={p.submittedCount > 0} invalid={!!errors.trackingPrefix} {...register('trackingPrefix')} />
            </Field>
          </div>
        </CardBody>
        <CardFooter>
          <p className="text-xs text-slate-500">Son değişiklik: {formatDateTime(p.updatedAt)}</p>
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

function NewProgramForm({ onDone }) {
  const qc = useQueryClient();
  const year = new Date().getFullYear() + 1;
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { name: `${year}-${year + 1}`, title: `${year}-${year + 1} ÖNDER Çift Kanatlı Nesil Burs Programı`, trackingPrefix: `OND-${year}` },
  });
  const m = useMutation({ mutationFn: settingsApi.createProgram });
  const submit = handleSubmit(async (v) => {
    try {
      qc.setQueryData(KEY, await m.mutateAsync(v));
      onDone();
    } catch (err) {
      applyApiErrors(err, setError, ['name', 'title', 'trackingPrefix']);
    }
  });
  return (
    <Card>
      <CardHeader title="Yeni dönem" description="Kapalı olarak oluşturulur. Açtığınızda önceki dönem otomatik kapanır." />
      <form onSubmit={submit} noValidate>
        <CardBody className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {errors.root && <Alert variant="error" className="md:col-span-2">{errors.root.message}</Alert>}
          <Field label="Dönem" htmlFor="np-name" required error={errors.name?.message}>
            <TextInput id="np-name" invalid={!!errors.name} {...register('name')} />
          </Field>
          <Field label="Takip numarası ön eki" htmlFor="np-prefix" required error={errors.trackingPrefix?.message}>
            <TextInput id="np-prefix" invalid={!!errors.trackingPrefix} {...register('trackingPrefix')} />
          </Field>
          <Field label="Program başlığı" htmlFor="np-title" required error={errors.title?.message} className="md:col-span-2">
            <TextInput id="np-title" invalid={!!errors.title} {...register('title')} />
          </Field>
        </CardBody>
        <CardFooter>
          <span />
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onDone}>Vazgeç</Button>
            <Button type="submit" loading={isSubmitting}>Oluştur</Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
