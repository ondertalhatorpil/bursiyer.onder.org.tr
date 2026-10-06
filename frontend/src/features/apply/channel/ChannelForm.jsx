import { useEffect, useMemo } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Alert, Field, PageSpinner, RadioCardGroup } from '../../../components/ui';
import DynamicFields from './DynamicFields';
import { useChannels } from '../../../hooks/useLookups';

/**
 * Lise / üniversite başvuru kanalı: kanal -> (varsa) alt birim -> ek alanlar.
 * Form dışarıdan `formId` ile gönderilir (StepActions'taki buton).
 */
export default function ChannelForm({ formId, application, onSubmit }) {
  const { data: channels, isLoading } = useChannels(application.category);
  const current = application.channel;

  const { control, handleSubmit, setValue, setError, formState: { errors } } = useForm({
    defaultValues: {
      channelId: current?.id ? String(current.id) : '',
      subUnitId: current?.subUnit?.id ? String(current.subUnit.id) : '',
      fields: current?.fields || {},
    },
  });

  const channelId = useWatch({ control, name: 'channelId' });
  const subUnitId = useWatch({ control, name: 'subUnitId' });
  const channel = channels?.find((c) => String(c.id) === String(channelId));
  const subUnit = channel?.subUnits.find((u) => String(u.id) === String(subUnitId));
  const definitions = useMemo(() => [...(channel?.extraFields || []), ...(subUnit?.extraFields || [])], [channel, subUnit]);

  // Kanal değişince alt birim ve ek alanlar sıfırlanır
  const onChannelChange = (v, fieldOnChange) => {
    fieldOnChange(v);
    setValue('subUnitId', '');
    setValue('fields', {});
  };

  useEffect(() => {
    if (channel && !channel.subUnits.length) setValue('subUnitId', '');
  }, [channel, setValue]);

  if (isLoading) return <PageSpinner />;

  const submit = handleSubmit(async (values) => {
    const body = {
      channelId: Number(values.channelId) || undefined,
      subUnitId: Number(values.subUnitId) || undefined,
      fields: values.fields || {},
    };
    try {
      await onSubmit(body);
    } catch (err) {
      const d = err.details || {};
      let applied = false;
      for (const [k, msg] of Object.entries(d)) {
        if (['channelId', 'subUnitId'].includes(k) || k.startsWith('fields.')) {
          setError(k, { type: 'server', message: msg });
          applied = true;
        }
      }
      if (!applied) setError('root', { message: err.message });
    }
  });

  return (
    <form id={formId} onSubmit={submit} noValidate className="space-y-6">
      {errors.root && <Alert variant="error">{errors.root.message}</Alert>}

      <Field label="Başvuru kanalı" required error={errors.channelId?.message}>
        <Controller control={control} name="channelId" render={({ field }) => (
          <RadioCardGroup
            name="channelId"
            value={field.value}
            onChange={(v) => onChannelChange(v, field.onChange)}
            invalid={!!errors.channelId}
            options={(channels || []).map((c) => ({ value: String(c.id), label: c.name, description: c.description }))}
          />
        )} />
      </Field>

      {channel?.subUnits.length > 0 && (
        <Field label={channel.code === 'uni_onder_genclik' ? 'Görev Alınan Proje veya Koordinatörlük' : 'Bağlı Bulunulan Komisyon / Birim'} required error={errors.subUnitId?.message}>
          <Controller control={control} name="subUnitId" render={({ field }) => (
            <RadioCardGroup
              name="subUnitId"
              size="sm"
              columns={channel.subUnits.length > 6 ? 3 : 2}
              value={field.value}
              onChange={(v) => { field.onChange(v); setValue('fields', {}); }}
              invalid={!!errors.subUnitId}
              options={channel.subUnits.map((u) => ({ value: String(u.id), label: u.name }))}
            />
          )} />
        </Field>
      )}

      {definitions.length > 0 && (
        <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200 sm:p-5">
          <DynamicFields definitions={definitions} control={control} setValue={setValue} errors={errors.fields || {}} />
        </div>
      )}
    </form>
  );
}
