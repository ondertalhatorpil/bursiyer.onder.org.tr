import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Send } from 'lucide-react';
import { Alert, Button, Field, MaskedInput, MASKS, Select, TextInput } from '../../../components/ui';
import { applyApiErrors } from '../../../lib/form-errors';
import { isValidIdNumber, isValidMobile } from '../../../lib/validation';

const ID_TYPES = [
  { value: 'TC', label: 'T.C. Kimlik No' },
  { value: 'YKN', label: 'Yabancı Kimlik No' },
  { value: 'PASAPORT', label: 'Pasaport No' },
];

const schema = z.object({
  fullName: z.string().trim().min(3, 'Veli / vasi adı soyadını yazın').max(128),
  idType: z.enum(['TC', 'YKN', 'PASAPORT'], { error: 'Kimlik türünü seçin' }),
  idNumber: z.string().trim().min(1, 'Kimlik numarasını yazın'),
  phone: z.string().refine(isValidMobile, 'Geçerli bir cep telefonu girin'),
}).superRefine((v, ctx) => {
  if (v.idType === 'PASAPORT') {
    if (!/^[A-Za-z0-9]{5,20}$/.test(v.idNumber)) ctx.addIssue({ code: 'custom', path: ['idNumber'], message: 'Geçerli bir pasaport numarası girin' });
  } else if (!isValidIdNumber(v.idNumber) || (v.idType === 'YKN') !== v.idNumber.startsWith('99')) {
    ctx.addIssue({ code: 'custom', path: ['idNumber'], message: v.idType === 'TC' ? 'Geçerli bir T.C. Kimlik No girin' : 'Geçerli bir Yabancı Kimlik No girin (99 ile başlar)' });
  }
});

const FIELDS = ['fullName', 'idType', 'idNumber', 'phone'];

/** Veli / vasi bilgileri. Gönderilince velinin telefonuna doğrulama kodu gider. */
export default function GuardianForm({ defaultValues, onSubmit }) {
  const { register, control, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues || { fullName: '', idType: 'TC', idNumber: '', phone: '' },
    mode: 'onTouched',
  });
  const idType = useWatch({ control, name: 'idType' });

  const submit = handleSubmit(async (v) => {
    try {
      await onSubmit(v);
    } catch (err) {
      applyApiErrors(err, setError, FIELDS);
    }
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {errors.root && <Alert variant="error">{errors.root.message}</Alert>}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Veli / Vasi Adı Soyadı" htmlFor="g-fullName" required error={errors.fullName?.message} className="sm:col-span-2">
          <TextInput id="g-fullName" invalid={!!errors.fullName} {...register('fullName')} />
        </Field>
        <Field label="Kimlik Türü" htmlFor="g-idType" required error={errors.idType?.message}>
          <Controller control={control} name="idType" render={({ field }) => (
            <Select id="g-idType" options={ID_TYPES} value={field.value} onChange={(e) => field.onChange(e.target.value)} />
          )} />
        </Field>
        <Field label={ID_TYPES.find((t) => t.value === idType)?.label} htmlFor="g-idNumber" required error={errors.idNumber?.message}>
          {idType === 'PASAPORT' ? (
            <TextInput id="g-idNumber" invalid={!!errors.idNumber} {...register('idNumber')} />
          ) : (
            <Controller control={control} name="idNumber" render={({ field }) => (
              <MaskedInput id="g-idNumber" mask={MASKS.idNumber} invalid={!!errors.idNumber} {...field} />
            )} />
          )}
        </Field>
        <Field label="Veli / Vasi Cep Telefonu" htmlFor="g-phone" required error={errors.phone?.message}
          hint="Onay kodu bu numaraya gönderilecek. Sizin numaranızdan farklı olmalı." className="sm:col-span-2">
          <Controller control={control} name="phone" render={({ field }) => (
            <MaskedInput id="g-phone" mask={MASKS.phone} invalid={!!errors.phone} {...field} />
          )} />
        </Field>
      </div>
      <Button type="submit" loading={isSubmitting} icon={Send} className="w-full sm:w-auto">Veliye Onay Kodu Gönder</Button>
    </form>
  );
}
