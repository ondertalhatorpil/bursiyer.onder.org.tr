import { Controller, useWatch } from 'react-hook-form';
import { Field, MaskedInput, MASKS, RadioCardGroup, TextInput } from '../../../components/ui';
import { PARENT_STATUS } from '../../../config';

/**
 * Anne / baba bilgileri. Sağ ise meslek, yaşadığı yer ve gelir istenir; vefat ettiyse sadece adı.
 * name: 'mother' | 'father' (form alanları mother.fullName, mother.income ...)
 */
export default function ParentFields({ name, title, control, register, errors = {} }) {
  const status = useWatch({ control, name: `${name}.status` });
  const id = (key) => `${name}-${key}`;
  return (
    <fieldset className="min-w-0 space-y-4">
      <legend className="mb-3 text-base font-bold text-brand-900">{title}</legend>

      <Controller control={control} name={`${name}.status`} render={({ field }) => (
        <Field label="Durumu" required error={errors.status?.message}>
          <RadioCardGroup name={`${name}.status`} size="sm" value={field.value} onChange={field.onChange}
            invalid={!!errors.status} options={PARENT_STATUS} />
        </Field>
      )} />

      <Field label="Adı Soyadı" htmlFor={id('fullName')} required error={errors.fullName?.message}>
        <TextInput id={id('fullName')} autoComplete="off" invalid={!!errors.fullName} {...register(`${name}.fullName`)} />
      </Field>

      {status === 'sag' && (
        <>
          <Field label="Mesleği" htmlFor={id('job')} required error={errors.job?.message}>
            <TextInput id={id('job')} invalid={!!errors.job} {...register(`${name}.job`)} />
          </Field>
          <Field label="Yaşadığı İl ve İlçe" htmlFor={id('location')} required error={errors.location?.message}>
            <TextInput id={id('location')} placeholder="Örn. Konya / Meram" invalid={!!errors.location} {...register(`${name}.location`)} />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Aylık Geliri (TL)" htmlFor={id('income')} required error={errors.income?.message}
              hint="Geliri yoksa 0 yazınız">
              <Controller control={control} name={`${name}.income`} render={({ field }) => (
                <MaskedInput id={id('income')} mask={MASKS.money} placeholder="Örn. 25.000" invalid={!!errors.income} {...field} />
              )} />
            </Field>
            <Field label="Ek Geliri Varsa Miktarı (TL)" htmlFor={id('extraIncome')} error={errors.extraIncome?.message}>
              <Controller control={control} name={`${name}.extraIncome`} render={({ field }) => (
                <MaskedInput id={id('extraIncome')} mask={MASKS.money} placeholder="Yoksa boş bırakınız" invalid={!!errors.extraIncome} {...field} />
              )} />
            </Field>
          </div>
        </>
      )}
    </fieldset>
  );
}
