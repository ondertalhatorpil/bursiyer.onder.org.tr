import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Alert, Field, MaskedInput, MASKS, RadioCardGroup, Textarea, TextInput } from '../../../components/ui';
import StepPage from '../shared/StepPage';
import StepActions from '../shared/StepActions';
import { applicationApi } from '../../../api/endpoints';
import { useApplication, useApplicationUpdater } from '../../../hooks/useApplication';
import { applyApiErrors } from '../../../lib/form-errors';
import { KYK_SUPPORT, YES_NO } from '../../../config';

const FORM_ID = 'scholarship-form';
const FIELDS = ['otherScholarship', 'otherScholarshipOrg', 'otherScholarshipAmount', 'gsbSupport', 'kykSupport', 'requestedAmount', 'commissionNote'];
const str = (v) => (v === null || v === undefined ? '' : String(v));
const bool = (v) => (v === true || v === false ? v : undefined);

/**
 * Yurt Konaklama Bursu Adım 6: başka burs / destekler ve talep edilen aylık burs.
 * IBAN burada alınmaz; başvuru onaylandıktan sonra istenir.
 * Lise (ortaöğretim) yurdunun formunda GSB ve KYK soruları yoktur.
 */
export default function ScholarshipStep() {
  const navigate = useNavigate();
  const { application } = useApplication();
  const update = useApplicationUpdater();
  const [saving, setSaving] = useState(false);
  const saved = application.yurt?.scholarship;
  const lise = application.education?.dormitoryLevel === 'lise';

  const { control, register, handleSubmit, setError, formState: { errors } } = useForm({
    defaultValues: {
      otherScholarship: saved ? saved.otherScholarship : '',
      otherScholarshipOrg: saved?.otherScholarshipOrg || '',
      otherScholarshipAmount: str(saved?.otherScholarshipAmount),
      gsbSupport: saved?.gsbSupport ?? '',
      kykSupport: saved?.kykSupport || '',
      requestedAmount: str(saved?.requestedAmount),
      commissionNote: saved?.commissionNote || '',
    },
  });
  const otherScholarship = useWatch({ control, name: 'otherScholarship' });

  const submit = handleSubmit(async (v) => {
    const body = {
      otherScholarship: bool(v.otherScholarship),
      ...(v.otherScholarship === true ? {
        otherScholarshipOrg: v.otherScholarshipOrg,
        otherScholarshipAmount: v.otherScholarshipAmount || undefined,
      } : {}),
      ...(lise ? {} : { gsbSupport: bool(v.gsbSupport), kykSupport: v.kykSupport || undefined }),
      requestedAmount: v.requestedAmount || undefined,
      commissionNote: v.commissionNote,
    };
    setSaving(true);
    try {
      const res = await applicationApi.setYurtScholarship(body);
      update(res.application);
      navigate('/basvuru/ozet');
    } catch (err) {
      applyApiErrors(err, setError, FIELDS);
    } finally {
      setSaving(false);
    }
  });

  return (
    <StepPage
      step={6}
      title="Burs Bilgileri"
      description="Aldığınız diğer burs ve destekleri belirtiniz, talep ettiğiniz aylık burs miktarını yazınız."
      footer={<StepActions step={6} form={FORM_ID} loading={saving} />}
    >
      <form id={FORM_ID} onSubmit={submit} noValidate className="space-y-6">
        {errors.root && <Alert variant="error">{errors.root.message}</Alert>}

        <Field label="Başka Herhangi Bir Kuruluştan / Kişiden Burs Alıyor musunuz?" required error={errors.otherScholarship?.message}>
          <Controller control={control} name="otherScholarship" render={({ field }) => (
            <RadioCardGroup name="otherScholarship" size="sm" value={field.value} onChange={field.onChange}
              invalid={!!errors.otherScholarship} options={YES_NO} />
          )} />
        </Field>
        {otherScholarship === true && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Burs Aldığınız Kurum" htmlFor="otherScholarshipOrg" required error={errors.otherScholarshipOrg?.message}>
              <TextInput id="otherScholarshipOrg" invalid={!!errors.otherScholarshipOrg} {...register('otherScholarshipOrg')} />
            </Field>
            <Field label="Aldığınız Burs Miktarı (Aylık, TL)" htmlFor="otherScholarshipAmount" required error={errors.otherScholarshipAmount?.message}>
              <Controller control={control} name="otherScholarshipAmount" render={({ field }) => (
                <MaskedInput id="otherScholarshipAmount" mask={MASKS.money} placeholder="Örn. 2.500" invalid={!!errors.otherScholarshipAmount} {...field} />
              )} />
            </Field>
          </div>
        )}

        {!lise && (
          <>
            <Field label="GSB Beslenme ve Barınma Yardımı Alıyor musunuz?" required error={errors.gsbSupport?.message}>
              <Controller control={control} name="gsbSupport" render={({ field }) => (
                <RadioCardGroup name="gsbSupport" size="sm" value={field.value} onChange={field.onChange}
                  invalid={!!errors.gsbSupport} options={YES_NO} />
              )} />
            </Field>

            <Field label="KYK'dan Destek Alıyor musunuz?" required error={errors.kykSupport?.message}>
              <Controller control={control} name="kykSupport" render={({ field }) => (
                <RadioCardGroup name="kykSupport" size="sm" columns={3} value={field.value} onChange={field.onChange}
                  invalid={!!errors.kykSupport} options={KYK_SUPPORT} />
              )} />
            </Field>
          </>
        )}

        <Field label="Talep Ettiğiniz Aylık Burs Miktarı (TL)" htmlFor="requestedAmount" required error={errors.requestedAmount?.message}
          className="sm:max-w-xs">
          <Controller control={control} name="requestedAmount" render={({ field }) => (
            <MaskedInput id="requestedAmount" mask={MASKS.money} placeholder="Örn. 3.000" invalid={!!errors.requestedAmount} {...field} />
          )} />
        </Field>

        <Field label="ÖNDER İmam Hatipliler Derneği Burs Komisyonuna" htmlFor="commissionNote" error={errors.commissionNote?.message}
          hint="İsteğe bağlı. Maddi durumunuzu ve burs talebinizin gerekçesini kısaca yazabilirsiniz (en fazla 2000 karakter).">
          <Textarea id="commissionNote" rows={5} maxLength={2000} invalid={!!errors.commissionNote} {...register('commissionNote')} />
        </Field>

        <Alert variant="info">Banka hesap (IBAN) bilgileriniz, başvurunuz onaylandıktan sonra ayrıca istenecektir.</Alert>
      </form>
    </StepPage>
  );
}
