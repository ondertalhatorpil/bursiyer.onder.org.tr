import { useForm } from 'react-hook-form';
import { Alert, Field, TextInput } from '../../../components/ui';
import { applyApiErrors } from '../../../lib/form-errors';

const FIELDS = ['universityName', 'faculty', 'department', 'cityName'];

/**
 * Yüksek lisans ve doktora eğitim bilgileri: hepsi yazılarak girilir (listeden seçim yok).
 * Enstitü backend'de faculty, bölüm / program department olarak saklanır.
 */
export default function GradEducationForm({ formId, application, onSubmit }) {
  const edu = application.education;
  const { register, handleSubmit, setError, formState: { errors } } = useForm({
    defaultValues: {
      universityName: edu?.universityName || '',
      faculty: edu?.faculty || '',
      department: edu?.department || '',
      cityName: edu?.cityName || '',
    },
  });

  const submit = handleSubmit(async (v) => {
    try {
      await onSubmit({
        universityName: v.universityName,
        faculty: v.faculty,
        department: v.department,
        cityName: v.cityName,
      });
    } catch (err) {
      applyApiErrors(err, setError, FIELDS);
    }
  });

  return (
    <form id={formId} onSubmit={submit} noValidate className="space-y-5">
      {errors.root && <Alert variant="error">{errors.root.message}</Alert>}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Üniversite Adı" htmlFor="universityName" required error={errors.universityName?.message} className="sm:col-span-2">
          <TextInput id="universityName" placeholder="Örn. Marmara Üniversitesi" invalid={!!errors.universityName} {...register('universityName')} />
        </Field>
        <Field label="Enstitü Adı" htmlFor="faculty" required error={errors.faculty?.message}>
          <TextInput id="faculty" placeholder="Örn. Sosyal Bilimler Enstitüsü" invalid={!!errors.faculty} {...register('faculty')} />
        </Field>
        <Field label="Bölüm / Program Adı" htmlFor="department" required error={errors.department?.message}>
          <TextInput id="department" placeholder="Örn. Sosyoloji" invalid={!!errors.department} {...register('department')} />
        </Field>
        <Field label="Kurumun Bulunduğu İl" htmlFor="cityName" required error={errors.cityName?.message}>
          <TextInput id="cityName" placeholder="Örn. İstanbul" invalid={!!errors.cityName} {...register('cityName')} />
        </Field>
      </div>
    </form>
  );
}
