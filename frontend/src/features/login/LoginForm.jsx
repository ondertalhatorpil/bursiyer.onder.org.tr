import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRight } from 'lucide-react';
import { Alert, Button, Field, MaskedInput, MASKS } from '../../components/ui';
import { applyApiErrors } from '../../lib/form-errors';
import { isValidIdNumber } from '../../lib/validation';

const schema = z.object({
  idNumber: z.string().refine(isValidIdNumber, 'Geçerli bir T.C. Kimlik No veya Yabancı Kimlik No giriniz'),
});

/** Giriş: kimlik numarası -> kayıtlı telefona kod */
export default function LoginForm({ onSubmit }) {
  const { control, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { idNumber: '' },
  });

  const submit = async ({ idNumber }) => {
    try {
      await onSubmit(idNumber);
    } catch (err) {
      applyApiErrors(err, setError, ['idNumber']);
    }
  };

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="space-y-5">
      {errors.root && (
        <Alert variant={errors.root.message?.includes('bulunamadı') ? 'warning' : 'error'}
          action={errors.root.message?.includes('bulunamadı') ? <Button to="/kayit" size="sm">Yeni başvuru oluştur</Button> : null}>
          {errors.root.message}
        </Alert>
      )}
      <Field label="T.C. Kimlik No / Yabancı Kimlik No" htmlFor="idNumber" required error={errors.idNumber?.message}>
        <Controller control={control} name="idNumber" render={({ field }) => (
          <MaskedInput id="idNumber" mask={MASKS.idNumber} autoFocus invalid={!!errors.idNumber} {...field} />
        )} />
      </Field>
      <Button type="submit" size="lg" loading={isSubmitting} iconRight={ArrowRight} className="w-full">
        Doğrulama Kodu Gönder
      </Button>
    </form>
  );
}
