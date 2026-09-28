import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { ChevronDown, FileSignature, Pencil } from 'lucide-react';
import { Alert, Badge, Button, Card, Field, PageSpinner, Textarea, TextInput } from '../../../components/ui';
import { settingsApi } from '../../../api/adminEndpoints';
import { applyApiErrors } from '../../../lib/form-errors';
import { formatDateTime } from '../../../lib/format';
import useSaveState from './useSaveState';
import SavedHint from './SavedHint';

const KEY = ['admin', 'settings', 'consents'];

export default function ConsentSettings() {
  const { data, isLoading, error } = useQuery({ queryKey: KEY, queryFn: settingsApi.consents });
  if (isLoading) return <PageSpinner />;
  if (error) return <Alert variant="error">{error.message}</Alert>;
  return (
    <div className="space-y-4">
      <Alert variant="info">
        Adayın onayladığı metin sürümüyle birlikte saklanır. Onaylanmış bir metni değiştirdiğinizde yeni sürüm açılır;
        eski onaylar eski sürüme bağlı kalır. Henüz kimsenin onaylamadığı sürüm yerinde güncellenir.
      </Alert>
      {data.map((item) => <ConsentCard key={item.type} item={item} />)}
    </div>
  );
}

function ConsentCard({ item }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [history, setHistory] = useState(false);
  const [saved, markSaved] = useSaveState();
  const latest = item.versions[0];
  const current = item.versions.find((v) => v.version === item.published) || latest;
  const willCreate = latest && latest.acceptedCount > 0;

  const { register, handleSubmit, setError, reset, formState: { errors, isSubmitting } } = useForm({
    values: { title: current?.title || '', label: current?.label || '', body: current?.body || '' },
  });

  const submit = handleSubmit(async (v) => {
    try {
      const res = await settingsApi.publishConsent(item.type, v);
      qc.setQueryData(KEY, res.items);
      qc.invalidateQueries({ queryKey: ['admin', 'settings', 'programs'] });
      qc.invalidateQueries({ queryKey: ['public'] });
      setEditing(false);
      markSaved();
    } catch (err) {
      applyApiErrors(err, setError, ['title', 'label', 'body']);
    }
  });

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 sm:px-6">
        <div className="flex min-w-0 gap-3">
          <FileSignature className="mt-0.5 size-5 shrink-0 text-brand-600" aria-hidden />
          <div className="min-w-0">
            <h2 className="font-bold text-slate-900">{item.name}</h2>
            <p className="text-xs text-slate-500">{item.usedIn}</p>
            {current && (
              <p className="mt-1 text-xs text-slate-500">
                v{current.version} · {current.acceptedCount.toLocaleString('tr-TR')} onay
                {current.updatedBy && ` · ${current.updatedBy}`} · {formatDateTime(current.updatedAt)}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <SavedHint show={saved} text="Yayınlandı" />
          {item.published ? <Badge tone="success" dot>Yayında</Badge> : <Badge tone="warning" dot>Yayında değil</Badge>}
          {!editing && <Button size="sm" variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>Düzenle</Button>}
        </div>
      </div>

      {editing && (
        <form onSubmit={submit} noValidate className="space-y-4 border-t border-slate-100 px-5 py-5 sm:px-6">
          {errors.root && <Alert variant="error">{errors.root.message}</Alert>}
          <Field label="Başlık" htmlFor={`${item.type}-title`} required error={errors.title?.message}>
            <TextInput id={`${item.type}-title`} invalid={!!errors.title} {...register('title')} />
          </Field>
          <Field label="Onay kutusundaki cümle" htmlFor={`${item.type}-label`} required error={errors.label?.message}
            hint="Adayın işaretlediği kutunun yanında görünür.">
            <Textarea id={`${item.type}-label`} rows={2} invalid={!!errors.label} {...register('label')} />
          </Field>
          <Field label="Metin" htmlFor={`${item.type}-body`} required error={errors.body?.message}
            hint='Aday "metni oku" bağlantısına tıklayınca açılır. Paragraflar için boş satır bırakın.'>
            <Textarea id={`${item.type}-body`} rows={14} invalid={!!errors.body} {...register('body')} />
          </Field>
          {willCreate && (
            <Alert variant="warning">
              Bu metin {latest.acceptedCount.toLocaleString('tr-TR')} kez onaylandı. Değişiklik <strong>v{latest.version + 1}</strong> olarak yayınlanacak.
            </Alert>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => { reset(); setEditing(false); }}>Vazgeç</Button>
            <Button type="submit" loading={isSubmitting}>Kaydet ve yayınla</Button>
          </div>
        </form>
      )}

      {item.versions.length > 1 && (
        <div className="border-t border-slate-100 px-5 py-3 sm:px-6">
          <button type="button" onClick={() => setHistory((h) => !h)} aria-expanded={history}
            className="flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
            Sürüm geçmişi ({item.versions.length}) <ChevronDown className={`size-4 transition ${history ? 'rotate-180' : ''}`} aria-hidden />
          </button>
          {history && (
            <ul className="mt-2 divide-y divide-slate-100 text-sm">
              {item.versions.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="font-semibold text-slate-800">v{v.version} <span className="font-normal text-slate-500">{v.title}</span></span>
                  <span className="text-xs text-slate-500">
                    {v.acceptedCount.toLocaleString('tr-TR')} onay · {formatDateTime(v.updatedAt)} {v.isActive && <Badge tone="success" className="ml-1">Yayında</Badge>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}
