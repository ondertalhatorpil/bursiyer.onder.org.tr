import { useNavigate } from 'react-router';
import StepPage from '../shared/StepPage';
import StepActions from '../shared/StepActions';
import HighSchoolForm from './HighSchoolForm';
import UniversityForm from './UniversityForm';
import { applicationApi } from '../../../api/endpoints';
import { useApplication, useApplicationUpdater } from '../../../hooks/useApplication';
import { useState } from 'react';

const FORM_ID = 'education-form';

/** Adım 5: eğitim ve okul bilgileri (kategoriye göre farklı form) */
export default function EducationStep() {
  const navigate = useNavigate();
  const { application } = useApplication();
  const update = useApplicationUpdater();
  const [saving, setSaving] = useState(false);

  const save = async (body) => {
    setSaving(true);
    try {
      const res = await applicationApi.setEducation(body);
      update(res.application);
      navigate('/basvuru/belgeler');
    } finally {
      setSaving(false);
    }
  };

  const Form = application.category === 'lise' ? HighSchoolForm : UniversityForm;
  return (
    <StepPage
      step={5}
      title="Eğitim Bilgileri"
      description={application.category === 'lise'
        ? 'Okuduğunuz liseyi ve sınıfınızı seçiniz.'
        : 'Kayıtlı olduğunuz üniversite ve programı giriniz.'}
      footer={<StepActions step={5} form={FORM_ID} loading={saving} />}
    >
      <Form formId={FORM_ID} application={application} onSubmit={save} />
    </StepPage>
  );
}
