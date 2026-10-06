import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Alert } from '../../../components/ui';
import StepPage from '../shared/StepPage';
import StepActions from '../shared/StepActions';
import ChannelForm from './ChannelForm';
import RequirementsPanel from './RequirementsPanel';
import GuardianSection from '../guardian/GuardianSection';
import { applicationApi } from '../../../api/endpoints';
import { useApplication, useApplicationUpdater } from '../../../hooks/useApplication';

const FORM_ID = 'channel-form';
const isGrad = (c) => c === 'yuksek_lisans' || c === 'doktora';

/**
 * Adım 4: lise/üniversitede başvuru kanalı; YL/doktorada şart beyanı.
 * 18 yaş altı adaylarda altta veli onayı bölümü açılır.
 */
export default function ChannelStep() {
  const navigate = useNavigate();
  const { application } = useApplication();
  const update = useApplicationUpdater();
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [reqChecked, setReqChecked] = useState(false);
  const [birthWarning, setBirthWarning] = useState(null);
  const [error, setError] = useState(null);

  const guardianPending = application.guardianRequired && !application.guardian?.verified;
  const goNextOrWait = (app) => {
    if (app.guardianRequired && !app.guardian?.verified) {
      setNotice('Bilgileriniz kaydedildi. Devam etmek için aşağıdan veli onayını tamamlayınız.');
      document.getElementById('veli')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/basvuru/egitim');
    }
  };

  const saveChannel = async (body) => {
    setSaving(true);
    try {
      const res = await applicationApi.setChannel(body);
      update(res.application);
      if (res.educationCleared) setNotice('Kanal değiştiği için eğitim bilgileriniz sıfırlandı.');
      goNextOrWait(res.application);
    } finally {
      setSaving(false);
    }
  };

  const acceptRequirements = async () => {
    if (application.requirementsAcceptedAt) return goNextOrWait(application);
    if (!reqChecked) return setError('Devam etmek için başvuru şartlarını onaylayınız');
    setSaving(true);
    setError(null);
    try {
      const res = await applicationApi.acceptRequirements();
      update(res.application);
      if (res.birthYearWarning) setBirthWarning(res.birthYearWarning);
      else goNextOrWait(res.application);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const grad = isGrad(application.category);

  return (
    <StepPage
      step={4}
      title={grad ? 'Başvuru Şartları' : 'Başvuru Kanalı'}
      description={grad
        ? 'Lütfen burs programına ait akademik ve idari başvuru şartlarını dikkatlice inceleyiniz.'
        : application.category === 'lise'
          ? 'Lütfen başvurunuzu gerçekleştirdiğiniz ilgili kurumu veya kontenjan türünü seçiniz.'
          : 'Lütfen başvurunuzu gerçekleştirdiğiniz kanalı seçiniz. Seçiminize göre ek bilgiler istenecektir.'}
      footer={grad ? (
        <StepActions step={4} onNext={birthWarning ? () => goNextOrWait(application) : acceptRequirements} loading={saving}
          nextLabel={application.requirementsAcceptedAt || birthWarning ? 'Devam Et' : 'Onayla ve Devam Et'} />
      ) : (
        <StepActions step={4} form={FORM_ID} loading={saving} hint={guardianPending ? 'Veli onayı da gerekli' : undefined} />
      )}
      aside={application.guardianRequired && <div id="veli"><GuardianSection application={application} /></div>}
    >
      {notice && <Alert variant="info">{notice}</Alert>}
      {error && <Alert variant="error">{error}</Alert>}
      {grad ? (
        <RequirementsPanel category={application.category} acceptedAt={application.requirementsAcceptedAt}
          checked={reqChecked} onCheckedChange={(v) => { setReqChecked(v); setError(null); }} warning={birthWarning} />
      ) : (
        <ChannelForm formId={FORM_ID} application={application} onSubmit={saveChannel} />
      )}
    </StepPage>
  );
}
