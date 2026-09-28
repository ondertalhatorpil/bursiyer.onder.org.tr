import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight } from 'lucide-react';
import { Alert, Button, Field, MaskedInput, MASKS, TextInput } from '../../components/ui';
import { ConsentCheckbox } from '../../components/auth';
import { applyApiErrors } from '../../lib/form-errors';
import { ageFrom, isYkn } from '../../lib/validation';
import { REGISTER_FIELDS, registerDefaults, registerSchema } from './schema';

/**
 * Adım 1: kişisel bilgiler + KVKK onayları.
 * onSubmit(values) backend'e gönderir; hata fırlatırsa alan hataları forma yazılır.
 */
export default function PersonalInfoForm({ defaultValues, onSubmit }) {
  const {
    register, control, handleSubmit, watch, setError, formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: defaultValues || registerDefaults,
    mode: 'onTouched',
  });

  const idNumber = watch('idNumber');
  const birthDate = watch('birthDate');
  const age = ageFrom(birthDate);
  const foreign = isYkn(idNumber);

  const submit = async (values) => {
    try {
      await onSubmit(values);
    } catch (err) {
      applyApiErrors(err, setError, REGISTER_FIELDS);
    }
  };

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="space-y-6">
      {errors.root && <Alert variant="error">{errors.root.message}</Alert>}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Adı" htmlFor="firstName" required error={errors.firstName?.message} hint="İkinci adınız varsa onu da yazın">
          <TextInput id="firstName" autoComplete="given-name" invalid={!!errors.firstName} {...register('firstName')} />
        </Field>
        <Field label="Soyadı" htmlFor="lastName" required error={errors.lastName?.message}>
          <TextInput id="lastName" autoComplete="family-name" invalid={!!errors.lastName} {...register('lastName')} />
        </Field>

        <Field
          label="T.C. Kimlik No / Yabancı Kimlik No"
          htmlFor="idNumber"
          required
          error={errors.idNumber?.message}
          hint="Uluslararası öğrenciler 99 ile başlayan Yabancı Kimlik Numarasını yazar"
        >
          <Controller control={control} name="idNumber" render={({ field }) => (
            <MaskedInput id="idNumber" mask={MASKS.idNumber} invalid={!!errors.idNumber} {...field} />
          )} />
        </Field>
        <Field label="Doğum Tarihi" htmlFor="birthDate" required error={errors.birthDate?.message}>
          <Controller control={control} name="birthDate" render={({ field }) => (
            <MaskedInput id="birthDate" mask={MASKS.date} autoComplete="bday" invalid={!!errors.birthDate} {...field} />
          )} />
        </Field>

        {foreign && (
          <Field label="Uyruk" htmlFor="nationality" required error={errors.nationality?.message} className="sm:col-span-2">
            <TextInput id="nationality" placeholder="Örn. Azerbaycan" invalid={!!errors.nationality} {...register('nationality')} />
          </Field>
        )}

        <Field label="Cep Telefonu" htmlFor="phone" required error={errors.phone?.message} hint="Doğrulama kodu bu numaraya gönderilecek">
          <Controller control={control} name="phone" render={({ field }) => (
            <MaskedInput id="phone" mask={MASKS.phone} autoComplete="tel-national" invalid={!!errors.phone} {...field} />
          )} />
        </Field>
        <Field label="E-posta Adresi" htmlFor="email" required error={errors.email?.message}>
          <TextInput id="email" type="email" autoComplete="email" placeholder="ornek@eposta.com" invalid={!!errors.email} {...register('email')} />
        </Field>
      </div>

      {age !== null && age < 18 && (
        <Alert variant="info" title="18 yaşından küçüksünüz">
          İlerleyen adımda veli / vasi bilgileriniz istenecek ve velinizin telefonuna bir onay kodu gönderilecek.
        </Alert>
      )}

      <fieldset className="space-y-4 rounded-xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200 sm:p-5">
        <legend className="sr-only">Hukuki onaylar</legend>
        <ConsentCheckbox control={control} name="consents.kvkk" type="kvkk" linkText="KVKK Aydınlatma Metni'ni ve Açık Rıza Beyanı'nı"
          error={errors.consents?.kvkk?.message}>
          okudum, verilerimin işlenmesini onaylıyorum.
        </ConsentCheckbox>
        <ConsentCheckbox control={control} name="consents.sharing" type="sharing" linkText="Burs başvuru, değerlendirme ve finansman süreçleri"
          error={errors.consents?.sharing?.message}>
          kapsamında kişisel, iletişim ve eğitim bilgilerimin ÖNDER'in işbirliği yaptığı protokol kurumları, vakıflar ve sponsor kuruluşlarla paylaşılmasına açık rıza veriyorum.
        </ConsentCheckbox>
      </fieldset>

      <div className="flex justify-end">
        <Button type="submit" size="lg" loading={isSubmitting} iconRight={ArrowRight} className="w-full sm:w-auto">
          Doğrulama Kodu Gönder
        </Button>
      </div>
    </form>
  );
}
