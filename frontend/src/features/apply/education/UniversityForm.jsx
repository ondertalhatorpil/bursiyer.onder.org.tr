import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Alert, Button, Field, MaskedInput, MASKS, RadioCardGroup, SearchSelect, Select, TextInput } from '../../../components/ui';
import { CitySelect, UniversityPicker } from '../../../components/lookups';
import { useFaculties, useUniversities } from '../../../hooks/useLookups';
import { applyApiErrors } from '../../../lib/form-errors';
import { GRADES, isYurt, TUITION_RATES } from '../../../config';

const FIELDS = ['cityId', 'universityId', 'universityOther', 'universityType', 'faculty', 'department', 'grade',
  'tuitionScholarshipRate', 'annualTuitionFee'];

/**
 * Üniversite, yüksek lisans ve doktora eğitim bilgileri.
 * Yurt Konaklama Bursu'nda ayrıca özel (vakıf) üniversitede burs oranı ve oran %100 değilse
 * üniversiteye ödenen yıllık ücret alınır (yurt seçimi EducationStep'te, formun üstünde).
 */
export default function UniversityForm({ formId, application, onSubmit }) {
  const yurt = isYurt(application.category);
  const grad = application.category !== 'universite' && !yurt;
  const edu = application.education;
  const [other, setOther] = useState(!!edu?.universityOther);
  const { data: universities = [] } = useUniversities();

  const { control, register, handleSubmit, setValue, getValues, setError, formState: { errors } } = useForm({
    defaultValues: {
      cityId: edu?.cityId || '',
      universityId: edu?.universityId || '',
      universityOther: edu?.universityOther || '',
      universityType: edu?.universityOther ? edu?.universityType || '' : '',
      faculty: edu?.faculty || '',
      department: edu?.department || '',
      grade: grad ? '' : edu?.grade || '',
      tuitionScholarshipRate: edu?.tuitionScholarshipRate ?? '',
      annualTuitionFee: edu?.annualTuitionFee != null ? String(edu.annualTuitionFee) : '',
    },
  });

  const universityId = useWatch({ control, name: 'universityId' });
  const facultyName = useWatch({ control, name: 'faculty' });
  const universityType = useWatch({ control, name: 'universityType' });
  const tuitionRate = useWatch({ control, name: 'tuitionScholarshipRate' });
  const selectedUni = universities.find((u) => String(u.id) === String(universityId));
  // Özel üniversite: listedekinde türü listeden, "Diğer"de adayın seçtiği türden
  const privateUni = yurt && (other ? universityType === 'vakif' : selectedUni?.type === 'vakif');
  const feeRequired = privateUni && tuitionRate !== '' && Number(tuitionRate) !== 100;

  // Listedeki üniversitede fakülte ve bölüm listeden seçilir; "Diğer" ya da listesi olmayan üniversitede elle yazılır
  const { data: faculties = [], isLoading: facultiesLoading } = useFaculties(other ? null : universityId);
  const pickList = !other && !!universityId && (facultiesLoading || faculties.length > 0);
  const facultyOptions = faculties.map((f) => ({ value: f.name, label: f.name }));
  const selectedFaculty = faculties.find((f) => f.name === facultyName);
  const departmentOptions = (selectedFaculty?.departments || []).map((d) => ({ value: d.name, label: d.name }));

  // Önceden elle yazılmış ve listede olmayan fakülte/bölüm temizlenir, aday listeden yeniden seçer
  useEffect(() => {
    if (!faculties.length) return;
    if (!selectedFaculty) {
      if (getValues('faculty')) setValue('faculty', '');
      if (getValues('department')) setValue('department', '');
    } else if (!selectedFaculty.departments.some((d) => d.name === getValues('department'))) {
      setValue('department', '');
    }
  }, [faculties, selectedFaculty, getValues, setValue]);

  const submit = handleSubmit(async (v) => {
    const body = {
      cityId: Number(v.cityId) || undefined,
      ...(other
        ? { universityOther: v.universityOther, universityType: v.universityType || undefined }
        : { universityId: Number(v.universityId) || undefined }),
      faculty: v.faculty,
      department: v.department,
      ...(grad ? {} : { grade: v.grade }),
      ...(privateUni ? {
        tuitionScholarshipRate: v.tuitionScholarshipRate === '' ? undefined : Number(v.tuitionScholarshipRate),
        ...(feeRequired ? { annualTuitionFee: v.annualTuitionFee || undefined } : {}),
      } : {}),
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
              <TextInput id="universityId" placeholder="Üniversitenizin tam adını yazınız" invalid={!!errors.universityOther} {...register('universityOther')} />
              <Button variant="ghost" size="sm" onClick={() => { setOther(false); setValue('universityOther', ''); setValue('universityType', ''); setValue('faculty', ''); setValue('department', ''); }}>Listeden seç</Button>
            </div>
          ) : (
            <Controller control={control} name="universityId" render={({ field }) => (
              <UniversityPicker id="universityId" value={field.value} invalid={!!errors.universityId}
                onChange={(val) => {
                  if (String(val) !== String(field.value)) { setValue('faculty', ''); setValue('department', ''); }
                  field.onChange(val);
                  const u = universities.find((x) => String(x.id) === String(val));
                  if (u?.cityId) setValue('cityId', u.cityId);
                }}
                onOther={() => { setOther(true); setValue('universityId', ''); setValue('faculty', ''); setValue('department', ''); }} />
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

        {privateUni && (
          <div className="space-y-4 rounded-xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200 sm:col-span-2">
            <p className="text-sm font-semibold text-slate-800">Özel üniversitede okuyanlar dolduracaktır</p>
            <Field label="Üniversitedeki Burs Oranınız" required error={errors.tuitionScholarshipRate?.message}>
              <Controller control={control} name="tuitionScholarshipRate" render={({ field }) => (
                <RadioCardGroup name="tuitionScholarshipRate" size="sm" columns={4} value={field.value} onChange={field.onChange}
                  invalid={!!errors.tuitionScholarshipRate} options={TUITION_RATES} />
              )} />
            </Field>
            {feeRequired && (
              <Field label="Üniversiteye Ödediğiniz Yıllık Ücret (TL)" htmlFor="annualTuitionFee" required
                error={errors.annualTuitionFee?.message} className="sm:max-w-xs">
                <Controller control={control} name="annualTuitionFee" render={({ field }) => (
                  <MaskedInput id="annualTuitionFee" mask={MASKS.money} placeholder="Örn. 150.000" invalid={!!errors.annualTuitionFee} {...field} />
                )} />
              </Field>
            )}
          </div>
        )}

        <Field label="Kurumun Bulunduğu İl" htmlFor="cityId" required error={errors.cityId?.message}
          hint={!other && selectedUni ? 'Üniversiteye göre dolduruldu, kampüsünüz farklı ildeyse değiştiriniz' : undefined}>
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

        {pickList ? (
          <>
            <Field label="Fakülte" htmlFor="faculty" required error={errors.faculty?.message}>
              <Controller control={control} name="faculty" render={({ field }) => (
                <SearchSelect id="faculty" options={facultyOptions} value={field.value} invalid={!!errors.faculty} loading={facultiesLoading}
                  placeholder="Fakülte seçiniz" searchPlaceholder="Fakülte adıyla arayınız…"
                  onChange={(val) => { if (val !== field.value) setValue('department', ''); field.onChange(val); }} />
              )} />
            </Field>
            <Field label="Bölüm" htmlFor="department" required error={errors.department?.message}>
              <Controller control={control} name="department" render={({ field }) => (
                <SearchSelect id="department" options={departmentOptions} value={field.value} onChange={field.onChange}
                  invalid={!!errors.department} disabled={!departmentOptions.length}
                  placeholder={selectedFaculty ? 'Bölüm seçiniz' : 'Önce fakülte seçiniz'} searchPlaceholder="Bölüm adıyla arayınız…" />
              )} />
            </Field>
          </>
        ) : (
          <>
            <Field label="Fakülte" htmlFor="faculty" required error={errors.faculty?.message}>
              <TextInput id="faculty" placeholder="Örn. İlahiyat Fakültesi" invalid={!!errors.faculty} {...register('faculty')} />
            </Field>
            <Field label="Bölüm" htmlFor="department" required error={errors.department?.message}>
              <TextInput id="department" invalid={!!errors.department} {...register('department')} />
            </Field>
          </>
        )}
      </div>
    </form>
  );
}
