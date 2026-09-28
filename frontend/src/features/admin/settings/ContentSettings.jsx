import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Alert, Button, Card, CardBody, CardFooter, CardHeader, Field, PageSpinner, Textarea, TextInput } from '../../../components/ui';
import { settingsApi } from '../../../api/adminEndpoints';
import { applyApiErrors } from '../../../lib/form-errors';
import { formatDateTime } from '../../../lib/format';
import useSaveState from './useSaveState';
import SavedHint from './SavedHint';

const KEY = ['admin', 'settings', 'content'];

export default function ContentSettings() {
  const { data, isLoading, error } = useQuery({ queryKey: KEY, queryFn: settingsApi.content });
  if (isLoading) return <PageSpinner />;
  if (error) return <Alert variant="error">{error.message}</Alert>;
  return <div className="space-y-4">{data.map((b) => <BlockCard key={b.key} block={b} />)}</div>;
}

function BlockCard({ block }) {
  const qc = useQueryClient();
  const [saved, markSaved] = useSaveState();
  const { register, handleSubmit, setError, reset, formState: { errors, isSubmitting, isDirty } } = useForm({
    values: { title: block.title, body: block.body || '' },
  });
  const submit = handleSubmit(async (v) => {
    try {
      qc.setQueryData(KEY, await settingsApi.updateContent(block.key, { title: v.title, body: v.body || null }));
      qc.invalidateQueries({ queryKey: ['public'] });
      markSaved();
    } catch (err) {
      applyApiErrors(err, setError, ['title', 'body']);
    }
  });
  return (
    <Card>
      <CardHeader title={block.title} description={block.usedIn} />
      <form onSubmit={submit} noValidate>
        <CardBody className="space-y-4">
          {errors.root && <Alert variant="error">{errors.root.message}</Alert>}
          <Field label="Başlık" htmlFor={`${block.key}-title`} error={errors.title?.message}>
            <TextInput id={`${block.key}-title`} invalid={!!errors.title} {...register('title')} />
          </Field>
          <Field label="Metin" htmlFor={`${block.key}-body`} error={errors.body?.message}
            hint={block.placeholders.length ? `Kullanılabilir değişken: ${block.placeholders.map((p) => `{${p}}`).join(', ')}` : undefined}>
            <Textarea id={`${block.key}-body`} rows={5} invalid={!!errors.body} {...register('body')} />
          </Field>
        </CardBody>
        <CardFooter>
          <p className="text-xs text-slate-500">Son değişiklik: {formatDateTime(block.updatedAt)}</p>
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
