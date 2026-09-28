import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Send } from 'lucide-react';
import { Alert, Button, CardFooter, Checkbox, PageSpinner } from '../../../components/ui';
import StepPage from '../shared/StepPage';
import SummarySection from './SummarySection';
import MissingList from './MissingList';
import { useChannelFieldRows } from './ChannelFieldValues';
import { applicationApi } from '../../../api/endpoints';
import { useApplicationUpdater } from '../../../hooks/useApplication';
import { formatDate } from '../../../lib/format';
import { GRADE_LABELS } from '../../../config';

const FALL = { completed: 'Evet, tamamlandı', pending: 'Henüz değil / kayıt sürecinde' };
const ID_TYPE = { TC: 'T.C. Kimlik No', YKN: 'Yabancı Kimlik No', PASAPORT: 'Pasaport' };

/** Adım 7: tüm bilgilerin özeti, eksikler, beyan ve gönderim */
export default function SummaryStep() {
  const navigate = useNavigate();
  const update = useApplicationUpdater();
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['summary'], queryFn: applicationApi.summary });
  const [confirm, setConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const channelRows = useChannelFieldRows(data?.application || {});

  if (isLoading) return <PageSpinner />;
  if (error) return <Alert variant="error">{error.message}</Alert>;

  const { applicant, application: app, documents, missing, canSubmit } = data;
  const edu = app.education;
  const grad = app.category === 'yuksek_lisans' || app.category === 'doktora';

  const submit = async () => {
    setSending(true);
    setSendError(null);
    try {
      const res = await applicationApi.submit();
      // Başarı mesajı durum sayfasında gösterilir (yönlendirme sırasında kaybolmasın diye önbellekte)
      qc.setQueryData(['submitResult'], res);
      update(res.application);
      navigate('/basvuru/durum', { replace: true, state: { submitted: res } });
    } catch (err) {
      setSendError(err.details?.missing ? 'Başvurunuzda eksikler var, lütfen yukarıdaki listeyi kontrol edin.' : err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <StepPage
      step={7}
      title="Özet ve Gönderim"
      description="Bilgilerinizi kontrol edin. Gönderdikten sonra başvurunuzda değişiklik yapamazsınız."
      footer={(
        <CardFooter>
          <Button to="/basvuru/belgeler" variant="ghost">Geri</Button>
          <Button size="lg" icon={Send} loading={sending} disabled={!canSubmit || !confirm} onClick={submit}>
            Başvuruyu İncelemeye Gönder
          </Button>
        </CardFooter>
      )}
    >
      <MissingList missing={missing} />

      <SummarySection title="Kişisel Bilgiler" rows={[
        ['Ad Soyad', `${applicant.firstName} ${applicant.lastName}`],
        [applicant.idType === 'YKN' ? 'Yabancı Kimlik No' : 'T.C. Kimlik No', applicant.idNumberMasked],
        ['Doğum Tarihi', formatDate(applicant.birthDate)],
        ['Uyruk', applicant.nationality],
        ['Cep Telefonu', applicant.phoneMasked],
        ['E-posta', applicant.email],
      ]} />

      <SummarySection title="Burs Kategorisi ve Başvuru Kanalı" editTo="/basvuru/kategori" rows={[
        ['Kategori', app.categoryLabel],
        ['Başvuru Kanalı', app.channel?.name],
        ['Birim', app.channel?.subUnit?.name],
        ...channelRows,
        ...(grad ? [['Başvuru Şartları', app.requirementsAcceptedAt ? 'Onaylandı' : 'Onaylanmadı']] : []),
      ]} />

      {app.guardianRequired && (
        <SummarySection title="Veli / Vasi" editTo="/basvuru/kanal" rows={[
          ['Ad Soyad', app.guardian?.fullName],
          [ID_TYPE[app.guardian?.idType] || 'Kimlik No', app.guardian?.idNumberMasked],
          ['Telefon', app.guardian?.phoneMasked],
          ['Onay', app.guardian?.verified ? 'Veli onayı alındı' : 'Onay bekleniyor'],
        ]} />
      )}

      <SummarySection title="Eğitim Bilgileri" editTo="/basvuru/egitim" rows={edu ? [
        ['İl', edu.cityName],
        ['İlçe', edu.districtName],
        [app.category === 'lise' ? 'Okul' : 'Üniversite', edu.schoolName || edu.universityName],
        ['Üniversite Türü', edu.universityType ? (edu.universityType === 'vakif' ? 'Vakıf' : 'Devlet') : null],
        [grad ? 'Enstitü' : 'Fakülte', edu.faculty],
        [grad ? 'Program' : 'Bölüm', edu.department],
        ['Sınıf', GRADE_LABELS[edu.grade]],
        ['Kayıt Yenileme', FALL[edu.fallRegistration]],
      ] : []}>
        {!edu && <p className="text-sm text-slate-500">Henüz girilmedi.</p>}
      </SummarySection>

      <SummarySection title="Belgeler" editTo="/basvuru/belgeler">
        <ul className="divide-y divide-slate-100 text-sm">
          {documents.map((d) => (
            <li key={d.code} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <span className="flex items-center gap-2 font-medium text-slate-900"><FileText className="size-4 text-brand-600" aria-hidden />{d.name}</span>
              {d.upload ? (
                <span className="flex items-center gap-2 text-slate-600">
                  {d.upload.originalName}
                </span>
              ) : <span className="font-semibold text-accent-600">Yüklenmedi</span>}
            </li>
          ))}
        </ul>
      </SummarySection>

      <div className="rounded-xl bg-brand-50 p-4 ring-1 ring-inset ring-brand-100 sm:p-5">
        <Checkbox id="confirm" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} disabled={!canSubmit}>
          Başvuru formunda verdiğim bilgilerin ve yüklediğim belgelerin doğru ve güncel olduğunu, gerçeğe aykırı beyan
          halinde bursun iptal edileceğini kabul ederim.
        </Checkbox>
      </div>

      {sendError && <Alert variant="error">{sendError}</Alert>}
    </StepPage>
  );
}
