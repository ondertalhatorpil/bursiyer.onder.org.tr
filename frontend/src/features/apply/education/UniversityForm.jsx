import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Alert, Button, Field, RadioCardGroup, Select, TextInput } from '../../../components/ui';
import { CitySelect, UniversityPicker } from '../../../components/lookups';
import { useUniversities } from '../../../hooks/useLookups';
import { applyApiErrors } from '../../../lib/form-errors';
import { GRADES } from '../../../config';

const FIELDS = ['cityId', 'universityId', 'universityOther', 'universityType', 'faculty', 'department', 'grade', 'fallRegistration'];

/** Üniversite, yüksek lisans ve doktora eğitim bilgileri */
export default function UniversityForm({ formId, application, onSubmit }) {
  const grad = application.category !== 'universite';
  const edu = application.education;
  const [other, setOther] = useState(!!edu?.universityOther);
  const { data: universities = [] } = useUniversities();

  const { control, register, handleSubmit, setValue, setError, formState: { errors } } = useForm({
    defaultValues: {
      cityId: edu?.cityId || '',
      universityId: edu?.universityId || '',
      universityOther: edu?.universityOther || '',
      universityType: edu?.universityOther ? edu?.universityType || '' : '',
      faculty: edu?.faculty || '',
      department: edu?.department || '',
      grade: grad ? '' : edu?.grade || '',
      fallRegistration: edu?.fallRegistration || '',
    },
  });

  const universityId = useWatch({ control, name: 'universityId' });
  const manualType = useWatch({ control, name: 'universityType' });
  const selectedUni = universities.find((u) => String(u.id) === String(universityId));
  const type = other ? manualType : selectedUni?.type;

  const submit = handleSubmit(async (v) => {
    const body = {
      cityId: Number(v.cityId) || undefined,
      ...(other
        ? { universityOther: v.universityOther, universityType: v.universityType || undefined }
        : { universityId: Number(v.universityId) || undefined }),
      faculty: v.faculty,
      department: v.department,
      ...(grad ? {} : { grade: v.grade }),
      ...(type === 'vakif' ? { fallRegistration: v.fallRegistration || undefined } : {}),
    };
    try {
      await onSubmit(body);
    } catch (err) {
      applyApiErrors(err, setError, FIELDS);
    }
  });

  return (
    <form id={formId} onSubmit={submit} noValidate className="space-y-5">
      {errors.root && <Alert variant="error">{errors.root.message}</Alert>}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label={grad ? 'Üniversite' : 'Üniversite Adı'} htmlFor="universityId" required
          error={errors.universityId?.message || errors.universityOther?.message} className="sm:col-span-2">
          {other ? (
            <div className="space-y-2">
              <TextInput id="universityId" placeholder="Üniversitenizin tam adını yazın" invalid={!!errors.universityOther} {...register('universityOther')} />
              <Button variant="ghost" size="sm" onClick={() => { setOther(false); setValue('universityOther', ''); setValue('universityType', ''); }}>Listeden seç</Button>
            </div>
          ) : (
            <Controller control={control} name="universityId" render={({ field }) => (
              <UniversityPicker id="universityId" value={field.value} invalid={!!errors.universityId}
                onChange={(val) => {
                  field.onChange(val);
                  const u = universities.find((x) => String(x.id) === String(val));
                  if (u?.cityId) setValue('cityId', u.cityId);
                }}
                onOther={() => { setOther(true); setValue('universityId', ''); }} />
            )} />
          )}
        </Field>

        {other && (
          <Field label="Üniversite Türü" required error={errors.universityType?.message} className="sm:col-span-2">
            <Controller control={control} name="universityType" render={({ field }) => (
              <RadioCardGroup name="universityType" size="sm" value={field.value} onChange={field.onChange} invalid={!!errors.universityType}
                options={[{ value: 'devlet', label: 'Devlet' }, { value: 'vakif', label: 'Vakıf' }]} />
            )} />
          </Field>
        )}

        <Field label="Kurumun Bulunduğu İl" htmlFor="cityId" required error={errors.cityId?.message}
          hint={!other && selectedUni ? 'Üniversiteye göre dolduruldu, kampüsünüz farklı ildeyse değiştirin' : undefined}>
          <Controller control={control} name="cityId" render={({ field }) => (
            <CitySelect id="cityId" value={field.value} onChange={field.onChange} invalid={!!errors.cityId} />
          )} />
        </Field>

        {!grad && (
          <Field label="Sınıf" htmlFor="grade" required error={errors.grade?.message}>
            <Controller control={control} name="grade" render={({ field }) => (
              <Select id="grade" options={GRADES.universite} value={field.value} onChange={(e) => field.onChange(e.target.value)} invalid={!!errors.grade} />
            )} />
          </Field>
        )}

        <Field label={grad ? 'Enstitü' : 'Fakülte'} htmlFor="faculty" required error={errors.faculty?.message}>
          <TextInput id="faculty" placeholder={grad ? 'Örn. Sosyal Bilimler Enstitüsü' : 'Örn. İlahiyat Fakültesi'} invalid={!!errors.faculty} {...register('faculty')} />
        </Field>
        <Field label={grad ? 'Program / Anabilim Dalı' : 'Bölüm'} htmlFor="department" required error={errors.department?.message}>
          <TextInput id="department" invalid={!!errors.department} {...register('department')} />
        </Field>
      </div>

      {type === 'vakif' && (
        <Field label="Güz dönemi mali ve ders kayıt yenileme işleminiz tamamlandı mı?" required error={errors.fallRegistration?.message}>
          <Controller control={control} name="fallRegistration" render={({ field }) => (
            <RadioCardGroup name="fallRegistration" size="sm" value={field.value} onChange={field.onChange} invalid={!!errors.fallRegistration}
              options={[
                { value: 'completed', label: 'Evet, tamamlandı', description: 'Öğrenci belgem aktif' },
                { value: 'pending', label: 'Henüz değil', description: 'Kayıt yenileme tarihim gelmedi / kayıt sürecindeyim' },
              ]} />
          )} />
        </Field>
      )}
    </form>
  );
}
