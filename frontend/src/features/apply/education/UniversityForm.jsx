import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Alert, Button, Field, RadioCardGroup, SearchSelect, Select, TextInput } from '../../../components/ui';
import { CitySelect, UniversityPicker } from '../../../components/lookups';
import { useFaculties, useUniversities } from '../../../hooks/useLookups';
import { applyApiErrors } from '../../../lib/form-errors';
import { GRADES } from '../../../config';

const FIELDS = ['cityId', 'universityId', 'universityOther', 'universityType', 'faculty', 'department', 'grade'];

/** Üniversite, yüksek lisans ve doktora eğitim bilgileri */
export default function UniversityForm({ formId, application, onSubmit }) {
  const grad = application.category !== 'universite';
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
    },
  });

  const universityId = useWatch({ control, name: 'universityId' });
  const facultyName = useWatch({ control, name: 'faculty' });
  const selectedUni = universities.find((u) => String(u.id) === String(universityId));

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
