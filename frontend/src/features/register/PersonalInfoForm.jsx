import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight } from 'lucide-react';
import { Alert, Button, Field, MaskedInput, MASKS, TextInput } from '../../components/ui';
import { ConsentCheckbox } from '../../components/auth';
import { applyApiErrors } from '../../lib/form-errors';
import { ageFrom, isYkn } from '../../lib/validation';
import { REGISTER_FIELDS, registerDefaults, registerSchema } from './schema';

/** Bölüm başlığı: küçük yazı + yanında ince çizgi */
function Section({ title, children }) {
  return (
    <section className="space-y-5">
      <div className="flex items-center gap-4">
        <h2 className="shrink-0 text-xs font-bold uppercase tracking-[0.15em] text-slate-500">{title}</h2>
        <span className="h-px flex-1 bg-slate-200" aria-hidden />
      </div>
      {children}
    </section>
  );
}

/**
 * Adım 1: kişisel bilgiler + KVKK onayları.
 * Mobil: tek sütun, gönder butonu ekranın altında sabit.
 * Geniş ekran: solda bilgiler, sağda onaylar + gönder (kaydırırken sabit).
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
    <form
      onSubmit={handleSubmit(submit)}
      noValidate
      className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-14"
    >
      {/* Sol: kişisel bilgiler */}
      <div className="min-w-0 space-y-10">
        {errors.root && <Alert variant="error">{errors.root.message}</Alert>}

        <Section title="Kimlik bilgileri">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Adı" htmlFor="firstName" required error={errors.firstName?.message}>
              <TextInput id="firstName" autoComplete="given-name" className="text-base" invalid={!!errors.firstName} {...register('firstName')} />
            </Field>
            <Field label="Soyadı" htmlFor="lastName" required error={errors.lastName?.message}>
              <TextInput id="lastName" autoComplete="family-name" className="text-base" invalid={!!errors.lastName} {...register('lastName')} />
            </Field>
            <Field
              label="T.C. Kimlik No / YKN"
              htmlFor="idNumber"
              required
              error={errors.idNumber?.message}
              hint="Uluslararası öğrenciler 99 ile başlayan numarayı yazar"
            >
              <Controller control={control} name="idNumber" render={({ field }) => (
                <MaskedInput id="idNumber" mask={MASKS.idNumber} className="text-base" invalid={!!errors.idNumber} {...field} />
              )} />
            </Field>
            <Field label="Doğum Tarihi" htmlFor="birthDate" required error={errors.birthDate?.message} hint="GG/AA/YYYY">
              <Controller control={control} name="birthDate" render={({ field }) => (
                <MaskedInput id="birthDate" mask={MASKS.date} autoComplete="bday" className="text-base" invalid={!!errors.birthDate} {...field} />
              )} />
            </Field>
            {foreign && (
              <Field label="Uyruk" htmlFor="nationality" required error={errors.nationality?.message} className="sm:col-span-2">
                <TextInput id="nationality" placeholder="Örn. Azerbaycan" className="text-base" invalid={!!errors.nationality} {...register('nationality')} />
              </Field>
            )}
          </div>

          {age !== null && age < 18 && (
            <Alert variant="info" title="18 yaşından küçüksünüz">
              İlerleyen adımda veli / vasi bilgileriniz istenecek ve velinizin telefonuna bir onay kodu gönderilecek.
            </Alert>
          )}
        </Section>

        <Section title="İletişim bilgileri">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Cep Telefonu" htmlFor="phone" required error={errors.phone?.message} hint="Doğrulama kodu bu numaraya gelir">
              <Controller control={control} name="phone" render={({ field }) => (
                <MaskedInput id="phone" mask={MASKS.phone} autoComplete="tel-national" className="text-base" invalid={!!errors.phone} {...field} />
              )} />
            </Field>
            <Field label="E-posta Adresi" htmlFor="email" required error={errors.email?.message}>
              <TextInput
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                placeholder="ornek@eposta.com"
                className="text-base"
                invalid={!!errors.email}
                {...register('email')}
              />
            </Field>
          </div>
        </Section>
      </div>

      {/* Sağ: onaylar + gönder */}
      <div className="lg:sticky lg:top-28 lg:self-start lg:border-l lg:border-slate-200 lg:pl-10">
        <Section title="Onaylar">
          <fieldset className="space-y-5">
            <legend className="sr-only">Hukuki onaylar</legend>
            <ConsentCheckbox
              control={control}
              name="consents.kvkk"
              type="kvkk"
              linkText="KVKK Aydınlatma Metni'ni ve Açık Rıza Beyanı'nı"
              error={errors.consents?.kvkk?.message}
            >
              okudum, verilerimin işlenmesini onaylıyorum.
            </ConsentCheckbox>
            <ConsentCheckbox
              control={control}
              name="consents.sharing"
              type="sharing"
              linkText="Burs başvuru, değerlendirme ve finansman süreçleri"
              error={errors.consents?.sharing?.message}
            >
              kapsamında kişisel, iletişim ve eğitim bilgilerimin ÖNDER'in işbirliği yaptığı protokol kurumları, vakıflar ve sponsor kuruluşlarla paylaşılmasına açık rıza veriyorum.
            </ConsentCheckbox>
          </fieldset>
        </Section>

        {/* Gönder: mobilde ekranın altında sabit, geniş ekranda onayların altında */}
        <div className="sticky bottom-0 -mx-4 mt-8 border-t border-slate-200 bg-white/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
          <Button type="submit" size="lg" loading={isSubmitting} iconRight={ArrowRight} className="w-full">
            Doğrulama Kodu Gönder
          </Button>
          <p className="mt-3 hidden text-center text-xs text-slate-500 lg:block">
            Telefonunuza 6 haneli bir kod gönderilecek.
          </p>
        </div>
      </div>
    </form>
  );
}