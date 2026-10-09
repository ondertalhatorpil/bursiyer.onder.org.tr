import { useNavigate } from 'react-router';
import { Alert, Field } from '../../../components/ui';
import { DormitorySelect } from '../../../components/lookups';
import StepPage from '../shared/StepPage';
import StepActions from '../shared/StepActions';
import HighSchoolForm from './HighSchoolForm';
import UniversityForm from './UniversityForm';
import GradEducationForm from './GradEducationForm';
import GuardianSection from '../guardian/GuardianSection';
import { applicationApi } from '../../../api/endpoints';
import { useApplication, useApplicationUpdater } from '../../../hooks/useApplication';
import { useDormitories } from '../../../hooks/useLookups';
import { useState } from 'react';
import { isYurt } from '../../../config';

const FORM_ID = 'education-form';

/**
 * Adım 5: eğitim ve okul bilgileri (kategoriye göre farklı form).
 * Yurt Konaklama Bursu'nda Adım 4'tür: önce konaklanan yurt seçilir; lise (ortaöğretim) yurdunda
 * lise bilgileri, diğerlerinde üniversite bilgileri (+ özel üniversite burs oranı) istenir.
 * Kanal adımı olmadığı için 18 yaş altı adayların veli onayı da burada alınır.
 */
export default function EducationStep() {
  const navigate = useNavigate();
  const { application } = useApplication();
  const update = useApplicationUpdater();
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const yurt = isYurt(application.category);

  const { data: dormitories = [] } = useDormitories();
  const [dormitoryId, setDormitoryId] = useState(application.education?.dormitoryId ? String(application.education.dormitoryId) : '');
  const [dormError, setDormError] = useState(null);
  const dorm = dormitories.find((d) => String(d.id) === String(dormitoryId));

  const save = async (body) => {
    setSaving(true);
    try {
      const res = await applicationApi.setEducation(yurt ? { ...body, dormitoryId: Number(dormitoryId) || undefined } : body);
      update(res.application);
      if (!yurt) {
        navigate('/basvuru/belgeler');
      } else if (res.application.guardianRequired && !res.application.guardian?.verified) {
        setNotice('Bilgileriniz kaydedildi. Devam etmek için aşağıdan veli onayını tamamlayınız.');
        document.getElementById('veli')?.scrollIntoView({ behavior: 'smooth' });
      } else {
        navigate('/basvuru/aile');
      }
    } catch (err) {
      if (err.details?.dormitoryId) setDormError(err.details.dormitoryId);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  // Yurtta form, yurt seçilince açılır (lise yurdu -> lise formu)
  const grad = application.category === 'yuksek_lisans' || application.category === 'doktora';
  const Form = application.category === 'lise' || dorm?.level === 'lise' ? HighSchoolForm
    : grad ? GradEducationForm : UniversityForm;
  const formReady = !yurt || !!dorm;
  const guardianPending = yurt && application.guardianRequired && !application.guardian?.verified;
  return (
    <StepPage
      step={yurt ? 4 : 5}
      title="Eğitim Bilgileri"
      description={application.category === 'lise'
        ? 'Okuduğunuz liseyi ve sınıfınızı seçiniz.'
        : yurt
          ? 'Konakladığınız ÖNDER yurdunu seçiniz, ardından okulunuzun bilgilerini giriniz.'
          : grad
            ? 'Kayıtlı olduğunuz üniversite, enstitü ve programın adlarını ve kurumun bulunduğu ili yazınız.'
            : 'Kayıtlı olduğunuz üniversite ve programı giriniz.'}
      footer={formReady
        ? <StepActions step={yurt ? 4 : 5} form={FORM_ID} loading={saving} hint={guardianPending ? 'Veli onayı da gerekli' : undefined} />
        : <StepActions step={4} onNext={() => setDormError('Konakladığınız yurdu seçiniz')} />}
      aside={yurt && application.guardianRequired && <div id="veli"><GuardianSection application={application} /></div>}
    >
      {notice && <Alert variant="info">{notice}</Alert>}
      {yurt && (
        <Field label="Konakladığınız Yurt" htmlFor="dormitoryId" required error={dormError}
          hint={dorm ? (dorm.level !== 'lise' ? 'Üniversite yurdu: üniversite bilgileriniz istenecek'
            : dorm.school ? `Ortaöğretim (lise) yurdu: okulunuz ${dorm.school.name}` : 'Ortaöğretim (lise) yurdu: lise bilgileriniz istenecek') : undefined}>
          <DormitorySelect id="dormitoryId" value={dormitoryId} invalid={!!dormError}
            onChange={(v) => { setDormitoryId(v); setDormError(null); }} />
        </Field>
      )}
      {formReady && (
        <>
          {yurt && <h3 className="border-t border-slate-200 pt-6 text-base font-bold text-brand-900">{dorm.level === 'lise' ? 'Lise Bilgileri' : 'Üniversite Bilgileri'}</h3>}
          <Form key={yurt ? `${dorm.level}-${dorm.school?.id || ''}` : 'form'} formId={FORM_ID} application={application} onSubmit={save}
            fixedSchool={yurt ? dorm.school : undefined} />
        </>
      )}
    </StepPage>
  );
}
