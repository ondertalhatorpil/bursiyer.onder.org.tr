import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Alert, Field, MaskedInput, MASKS, RadioCardGroup, TextInput } from '../../../components/ui';
import StepPage from '../shared/StepPage';
import StepActions from '../shared/StepActions';
import ParentFields from './ParentFields';
import { applicationApi } from '../../../api/endpoints';
import { useApplication, useApplicationUpdater } from '../../../hooks/useApplication';
import { applyApiErrors } from '../../../lib/form-errors';
import { GUARDIAN_HOUSING, PARENTS_LIVING } from '../../../config';

const FORM_ID = 'family-form';
const PARENT_KEYS = ['status', 'fullName', 'job', 'location', 'income', 'extraIncome'];
const FIELDS = [
  'siblingCount', 'studyingSiblingCount', 'guardianHousing', 'guardianHousingNote', 'parentsLiving',
  ...PARENT_KEYS.map((k) => `mother.${k}`), ...PARENT_KEYS.map((k) => `father.${k}`),
];

const str = (v) => (v === null || v === undefined ? '' : String(v));
const parentDefaults = (p) => ({
  status: p?.status || '',
  fullName: p?.fullName || '',
  job: p?.job || '',
  location: p?.location || '',
  income: str(p?.income),
  extraIncome: str(p?.extraIncome),
});
const parentBody = (p) => ({
  status: p.status || undefined,
  fullName: p.fullName,
  ...(p.status === 'sag' ? {
    job: p.job,
    location: p.location,
    income: p.income === '' ? undefined : p.income,
    extraIncome: p.extraIncome === '' ? undefined : p.extraIncome,
  } : {}),
});

/** Bölüm başlığı + içerik (kutusuz, çizgiyle ayrılır) */
function Section({ title, children }) {
  return (
    <section className="space-y-5 border-t border-slate-200 pt-6 first:border-t-0 first:pt-0">
      {title && <h3 className="text-base font-bold text-brand-900">{title}</h3>}
      {children}
    </section>
  );
}

/** Yurt Konaklama Bursu Adım 5: aile ve gelir bilgileri */
export default function FamilyStep() {
  const navigate = useNavigate();
  const { application } = useApplication();
  const update = useApplicationUpdater();
  const [saving, setSaving] = useState(false);
  const saved = application.yurt?.family;

  const { control, register, handleSubmit, setError, formState: { errors } } = useForm({
    defaultValues: {
      siblingCount: str(saved?.siblingCount),
      studyingSiblingCount: str(saved?.studyingSiblingCount),
      guardianHousing: saved?.guardianHousing || '',
      guardianHousingNote: saved?.guardianHousingNote || '',
      mother: parentDefaults(saved?.mother),
      father: parentDefaults(saved?.father),
      parentsLiving: saved?.parentsLiving || '',
    },
  });
  const housing = useWatch({ control, name: 'guardianHousing' });
  const motherStatus = useWatch({ control, name: 'mother.status' });
  const fatherStatus = useWatch({ control, name: 'father.status' });
  const bothAlive = motherStatus === 'sag' && fatherStatus === 'sag';

  const submit = handleSubmit(async (v) => {
    const body = {
      siblingCount: v.siblingCount || undefined,
      studyingSiblingCount: v.studyingSiblingCount || undefined,
      guardianHousing: v.guardianHousing || undefined,
      ...(v.guardianHousing === 'diger' ? { guardianHousingNote: v.guardianHousingNote } : {}),
      mother: parentBody(v.mother),
      father: parentBody(v.father),
      ...(bothAlive && v.parentsLiving ? { parentsLiving: v.parentsLiving } : {}),
    };
    setSaving(true);
    try {
      const res = await applicationApi.setYurtFamily(body);
      update(res.application);
      navigate('/basvuru/burs-bilgileri');
    } catch (err) {
      applyApiErrors(err, setError, FIELDS);
    } finally {
      setSaving(false);
    }
  });

  return (
    <StepPage
      step={5}
      title="Aile ve Gelir Bilgileri"
      description="Ailenize ve hane gelirinize ait bilgileri eksiksiz ve doğru olarak giriniz. Tutarları aylık ve Türk Lirası olarak yazınız."
      footer={<StepActions step={5} form={FORM_ID} loading={saving} />}
    >
      <form id={FORM_ID} onSubmit={submit} noValidate className="space-y-8">
        {errors.root && <Alert variant="error">{errors.root.message}</Alert>}

        <Section>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Toplam Kardeş Sayısı (Kendiniz Dahil)" htmlFor="siblingCount" required error={errors.siblingCount?.message}>
              <Controller control={control} name="siblingCount" render={({ field }) => (
                <MaskedInput id="siblingCount" mask={MASKS.count} placeholder="Örn. 3" invalid={!!errors.siblingCount} {...field} />
              )} />
            </Field>
            <Field label="Okuyan Kardeş Sayısı (Kendiniz Dahil)" htmlFor="studyingSiblingCount" required error={errors.studyingSiblingCount?.message}>
              <Controller control={control} name="studyingSiblingCount" render={({ field }) => (
                <MaskedInput id="studyingSiblingCount" mask={MASKS.count} placeholder="Örn. 2" invalid={!!errors.studyingSiblingCount} {...field} />
              )} />
            </Field>
          </div>

          <Field label="Velinizin Yaşadığı Yer Durumu" required error={errors.guardianHousing?.message}>
            <Controller control={control} name="guardianHousing" render={({ field }) => (
              <RadioCardGroup name="guardianHousing" size="sm" columns={4} value={field.value} onChange={field.onChange}
                invalid={!!errors.guardianHousing} options={GUARDIAN_HOUSING} />
            )} />
          </Field>
          {housing === 'diger' && (
            <Field label="Diğer ise Açıklama" htmlFor="guardianHousingNote" required error={errors.guardianHousingNote?.message}>
              <TextInput id="guardianHousingNote" placeholder="Örn. Akraba yanında kalıyor" invalid={!!errors.guardianHousingNote}
                {...register('guardianHousingNote')} />
            </Field>
          )}
        </Section>

        <Section>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <ParentFields name="mother" title="Anne Bilgileri" control={control} register={register} errors={errors.mother} />
            <ParentFields name="father" title="Baba Bilgileri" control={control} register={register} errors={errors.father} />
          </div>
        </Section>

        {bothAlive && (
          <Section>
            <Field label="Anne ve Babanız" required error={errors.parentsLiving?.message}>
              <Controller control={control} name="parentsLiving" render={({ field }) => (
                <RadioCardGroup name="parentsLiving" size="sm" value={field.value} onChange={field.onChange}
                  invalid={!!errors.parentsLiving} options={PARENTS_LIVING} />
              )} />
            </Field>
          </Section>
        )}
      </form>
    </StepPage>
  );
}
