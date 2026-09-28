import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Fingerprint, ScrollText, Smartphone } from 'lucide-react';
import { Alert, Button, Card, CardBody, Field, MaskedInput, MASKS, TextInput } from '../../components/ui';
import { ConsentCheckbox } from '../../components/auth';
import { applyApiErrors } from '../../lib/form-errors';
import { ageFrom, isYkn } from '../../lib/validation';
import { REGISTER_FIELDS, registerDefaults, registerSchema } from './schema';

/** Rozetli ikon: marka renginde yumuşak zemin + ince çerçeve */
function IconBadge({ icon: Icon }) {
  return (
    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand-700 shadow-sm ring-1 ring-inset ring-brand-200/70">
      <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
    </span>
  );
}

/** Kart içi bölüm başlığı: rozetli ikon + başlık + kısa açıklama */
function SectionHeading({ icon, title, note }) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
      <IconBadge icon={icon} />
      <div className="min-w-0">
        <h2 className="text-[15px] font-bold text-slate-900">{title}</h2>
        {note && <p className="text-xs text-slate-500">{note}</p>}
      </div>
    </div>
  );
}

function Section({ icon, title, note, children }) {
  return (
    <section className="space-y-5">
      <SectionHeading icon={icon} title={title} note={note} />
      {children}
    </section>
  );
}

/**
 * Adım 1: kişisel bilgiler + KVKK onayları.
 * Geniş ekranda yatay düzen: solda bilgiler (iki bölüm), sağda onaylar ve gönder (sabit panel).
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
    <form
      onSubmit={handleSubmit(submit)}
      noValidate
      className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start"
    >
      {/* Sol: kişisel bilgiler */}
      <Card>
        <CardBody className="space-y-8">
          {errors.root && <Alert variant="error">{errors.root.message}</Alert>}

          <Section
            icon={Fingerprint}
            title="Kimlik bilgileri"
            note="Kimlik kartınızdaki gibi yazın; ikinci adınız varsa ekleyin."
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Adı" htmlFor="firstName" required error={errors.firstName?.message}>
                <TextInput id="firstName" autoComplete="given-name" invalid={!!errors.firstName} {...register('firstName')} />
              </Field>
              <Field label="Soyadı" htmlFor="lastName" required error={errors.lastName?.message}>
                <TextInput id="lastName" autoComplete="family-name" invalid={!!errors.lastName} {...register('lastName')} />
              </Field>
              <Field label="T.C. Kimlik No / Yabancı Kimlik No" htmlFor="idNumber" required error={errors.idNumber?.message}>
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
            </div>
            <p className="text-xs text-slate-500">
              Uluslararası öğrenciler 99 ile başlayan Yabancı Kimlik Numarasını yazar.
            </p>
          </Section>

          <Section
            icon={Smartphone}
            title="İletişim bilgileri"
            note="Doğrulama kodu cep telefonunuza gönderilir."
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Cep Telefonu" htmlFor="phone" required error={errors.phone?.message}>
                <Controller control={control} name="phone" render={({ field }) => (
                  <MaskedInput id="phone" mask={MASKS.phone} autoComplete="tel-national" invalid={!!errors.phone} {...field} />
                )} />
              </Field>
              <Field label="E-posta Adresi" htmlFor="email" required error={errors.email?.message}>
                <TextInput id="email" type="email" autoComplete="email" placeholder="ornek@eposta.com" invalid={!!errors.email} {...register('email')} />
              </Field>
            </div>
          </Section>

          {age !== null && age < 18 && (
            <Alert variant="info" title="18 yaşından küçüksünüz">
              İlerleyen adımda veli / vasi bilgileriniz istenecek ve velinizin telefonuna bir onay kodu gönderilecek.
            </Alert>
          )}
        </CardBody>
      </Card>

      {/* Sağ: onaylar + gönder (geniş ekranda kaydırırken sabit kalır) */}
      <Card className="lg:sticky lg:top-28">
        <CardBody className="space-y-5">
          <SectionHeading icon={ScrollText} title="Onaylar" note="Devam etmek için iki onay da gerekli." />

          <fieldset className="space-y-4">
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

          <Button type="submit" size="lg" loading={isSubmitting} iconRight={ArrowRight} className="w-full">
            Doğrulama Kodu Gönder
          </Button>
          <p className="text-center text-xs text-slate-500">Telefonunuza 6 haneli bir kod gönderilecek.</p>
        </CardBody>
      </Card>
    </form>
  );
}