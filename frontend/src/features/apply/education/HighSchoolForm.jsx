import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { School } from 'lucide-react';
import { Alert, Button, Field, Select, TextInput } from '../../../components/ui';
import { CitySelect, DistrictSelect, SchoolPicker } from '../../../components/lookups';
import { useSchools } from '../../../hooks/useLookups';
import { applyApiErrors } from '../../../lib/form-errors';
import { GRADES } from '../../../config';

const ISTANBUL = 34;
const FIELDS = ['cityId', 'districtId', 'schoolId', 'schoolOther', 'grade'];

/**
 * Lise eğitim bilgileri. Kanal seçimine göre bazı alanlar kilitli gelir:
 *   Spor lisesi / Uluslararası AİHL: okul Adım 4'te seçildi
 *   Teşkilat: il, seçilen bölgeye göre sabit
 */
export default function HighSchoolForm({ formId, application, onSubmit }) {
  const code = application.channel?.code;
  const fields = application.channel?.fields || {};
  const lockedSchoolFilter = code === 'lise_spor' ? 'sports' : code === 'lise_uluslararasi' ? 'international' : null;
  const lockedCityId = code === 'lise_teskilat'
    ? (fields.region === 'istanbul' ? ISTANBUL : Number(fields.city_id) || null)
    : null;

  const edu = application.education;
  const [other, setOther] = useState(!!edu?.schoolOther);

  const { control, register, handleSubmit, setValue, setError, formState: { errors } } = useForm({
    defaultValues: {
      cityId: lockedCityId || edu?.cityId || '',
      districtId: edu?.districtId || '',
      schoolId: edu?.schoolId || '',
      schoolOther: edu?.schoolOther || '',
      grade: edu?.grade || '',
    },
  });
  const cityId = useWatch({ control, name: 'cityId' });
  const districtId = useWatch({ control, name: 'districtId' });

  // Kilitli okulun adını göstermek için
  const { data: lockedList = [] } = useSchools({ type: lockedSchoolFilter }, !!lockedSchoolFilter);
  const lockedSchool = lockedList.find((s) => String(s.id) === String(fields.school_id));

  const submit = handleSubmit(async (v) => {
    const body = lockedSchoolFilter
      ? { grade: v.grade }
      : {
        cityId: Number(v.cityId) || undefined,
        districtId: Number(v.districtId) || undefined,
        ...(other ? { schoolOther: v.schoolOther } : { schoolId: Number(v.schoolId) || undefined }),
        grade: v.grade,
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

      {lockedSchoolFilter ? (
        <div className="flex items-start gap-3 rounded-xl bg-brand-50 p-4 ring-1 ring-inset ring-brand-100">
          <School className="mt-0.5 size-5 text-brand-600" aria-hidden />
          <div className="text-sm">
            <p className="font-semibold text-brand-900">{lockedSchool?.name || 'Adım 4\'te seçtiğiniz okul'}</p>
            {lockedSchool && <p className="text-brand-800">{lockedSchool.cityName} / {lockedSchool.districtName}</p>}
            <p className="mt-1 text-xs text-brand-700">Okulunuzu değiştirmek için Adım 4'e dönün.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Okulun Bulunduğu İl" htmlFor="cityId" required error={errors.cityId?.message}
            hint={lockedCityId ? 'Teşkilat bölgenize göre belirlendi' : undefined}>
            <Controller control={control} name="cityId" render={({ field }) => (
              <CitySelect id="cityId" value={field.value} disabled={!!lockedCityId} invalid={!!errors.cityId}
                onChange={(v) => { field.onChange(v); setValue('districtId', ''); setValue('schoolId', ''); }} />
            )} />
          </Field>
          <Field label="İlçe" htmlFor="districtId" required error={errors.districtId?.message}>
            <Controller control={control} name="districtId" render={({ field }) => (
              <DistrictSelect id="districtId" cityId={cityId} value={field.value} invalid={!!errors.districtId}
                onChange={(v) => { field.onChange(v); setValue('schoolId', ''); }} />
            )} />
          </Field>
          <Field label="Okul Adı" htmlFor="schoolId" required error={errors.schoolId?.message || errors.schoolOther?.message} className="sm:col-span-2">
            {other ? (
              <div className="space-y-2">
                <TextInput id="schoolId" placeholder="Okulunuzun tam adını yazın" invalid={!!errors.schoolOther} {...register('schoolOther')} />
                <Button variant="ghost" size="sm" onClick={() => { setOther(false); setValue('schoolOther', ''); }}>Listeden seç</Button>
              </div>
            ) : (
              <Controller control={control} name="schoolId" render={({ field }) => (
                <SchoolPicker id="schoolId" cityId={cityId} districtId={districtId} value={field.value} onChange={field.onChange}
                  invalid={!!errors.schoolId} onOther={() => { setOther(true); setValue('schoolId', ''); }} />
              )} />
            )}
          </Field>
        </div>
      )}

      <Field label="Sınıf" htmlFor="grade" required error={errors.grade?.message} className="sm:max-w-xs">
        <Controller control={control} name="grade" render={({ field }) => (
          <Select id="grade" options={GRADES.lise} value={field.value} onChange={(e) => field.onChange(e.target.value)} invalid={!!errors.grade} />
        )} />
      </Field>
    </form>
  );
}
