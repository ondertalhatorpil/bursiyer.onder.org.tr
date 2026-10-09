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
import { formatDate, formatMoney } from '../../../lib/format';
import {
  GRADE_LABELS, GUARDIAN_HOUSING, isYurt, KYK_SUPPORT, optionLabel, PARENT_STATUS, PARENTS_LIVING,
} from '../../../config';

const ID_TYPE = { TC: 'T.C. Kimlik No', YKN: 'Yabancı Kimlik No', PASAPORT: 'Pasaport' };
// T.C. vatandaşlarının uyruğu kayıtta 'T.C.' olarak tutulur
const nationalityName = (n) => (n === 'T.C.' ? 'Türkiye Cumhuriyeti' : n);
const yesNo = (v) => (v ? 'Evet' : 'Hayır');

/** Yurt Konaklama Bursu: anne / baba bilgileri (özet içinde alt liste) */
function ParentSummary({ title, parent }) {
  if (!parent) return null;
  const rows = [
    ['Durumu', optionLabel(PARENT_STATUS, parent.status)],
    ['Adı Soyadı', parent.fullName],
    ['Mesleği', parent.job],
    ['Yaşadığı İl ve İlçe', parent.location],
    ['Aylık Geliri', formatMoney(parent.income)],
    ['Ek Geliri', formatMoney(parent.extraIncome)],
  ].filter(([, v]) => v !== undefined && v !== null && v !== '');
  return (
    <div className="min-w-0">
      <h4 className="mb-2 text-sm font-bold text-slate-800">{title}</h4>
      <dl className="space-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-slate-500">{label}</dt>
            <dd className="mt-0.5 font-medium text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

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
  const yurt = isYurt(app.category);
  const family = app.yurt?.family;
  const scholarship = app.yurt?.scholarship;

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
      setSendError(err.details?.missing ? 'Başvurunuzda eksikler var, lütfen yukarıdaki listeyi kontrol ediniz.' : err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <StepPage
      step={7}
      title="Özet ve Gönderim"
      description={yurt
        ? 'Lütfen başvuru formunda beyan ettiğiniz bilgileri dikkatlice kontrol ediniz. Başvurunuzu onaylayıp gönderdikten sonra sistem üzerinden herhangi bir veri güncellemesi yapılamayacaktır.'
        : 'Lütfen başvuru formunda beyan ettiğiniz bilgileri ve yüklediğiniz evrakları dikkatlice kontrol ediniz. Başvurunuzu onaylayıp gönderdikten sonra sistem üzerinden herhangi bir veri güncellemesi yapılamayacaktır.'}
      footer={(
        <CardFooter>
          <Button to={yurt ? '/basvuru/burs-bilgileri' : '/basvuru/belgeler'} variant="ghost">Geri</Button>
          <Button size="lg" icon={Send} loading={sending} disabled={!canSubmit || !confirm} onClick={submit}>
            Başvuruyu Onayla ve Tamamla
          </Button>
        </CardFooter>
      )}
    >
      <MissingList missing={missing} category={app.category} />

      <SummarySection title="Kişisel Bilgiler" rows={[
        ['Ad Soyad', `${applicant.firstName} ${applicant.lastName}`],
        [applicant.idType === 'YKN' ? 'Yabancı Kimlik No' : 'T.C. Kimlik No', applicant.idNumberMasked],
        ['Doğum Tarihi', formatDate(applicant.birthDate)],
        ['Uyruk', nationalityName(applicant.nationality)],
        ['Cep Telefonu', applicant.phoneMasked],
        ['E-posta', applicant.email],
      ]} />

      <SummarySection title={yurt ? 'Burs Kategorisi' : 'Burs Kategorisi ve Başvuru Kanalı'} editTo="/basvuru/kategori" rows={[
        ['Kategori', app.categoryLabel],
        ['Başvuru Kanalı', app.channel?.name],
        ['Birim', app.channel?.subUnit?.name],
        ...channelRows,
        ...(grad ? [['Başvuru Şartları', app.requirementsAcceptedAt ? 'Onaylandı' : 'Onaylanmadı']] : []),
      ]} />

      {app.guardianRequired && (
        <SummarySection title="Veli / Vasi" editTo={yurt ? '/basvuru/egitim' : '/basvuru/kanal'} rows={[
          ['Ad Soyad', app.guardian?.fullName],
          [ID_TYPE[app.guardian?.idType] || 'Kimlik No', app.guardian?.idNumberMasked],
          ['Telefon', app.guardian?.phoneMasked],
          ['Onay', app.guardian?.verified ? 'Veli onayı alındı' : 'Onay bekleniyor'],
        ]} />
      )}

      <SummarySection title="Eğitim Bilgileri" editTo="/basvuru/egitim" rows={edu ? [
        ['İl', edu.cityName],
        ['İlçe', edu.districtName],
        [edu.schoolName ? 'Okul' : 'Üniversite', edu.schoolName || edu.universityName],
        ['Üniversite Türü', edu.universityType ? (edu.universityType === 'vakif' ? 'Vakıf' : 'Devlet') : null],
        [grad ? 'Enstitü' : 'Fakülte', edu.faculty],
        ['Bölüm', edu.department],
        ['Sınıf', GRADE_LABELS[edu.grade]],
        ['Konakladığı Yurt', edu.dormitoryName],
        ['Üniversitedeki Burs Oranı', edu.tuitionScholarshipRate ? `%${edu.tuitionScholarshipRate}` : null],
        ['Ödenen Yıllık Ücret', formatMoney(edu.annualTuitionFee)],
      ] : []}>
        {!edu && <p className="text-sm text-slate-500">Henüz girilmedi.</p>}
      </SummarySection>

      {yurt && (
        <SummarySection title="Aile ve Gelir Bilgileri" editTo="/basvuru/aile" rows={family ? [
          ['Toplam Kardeş Sayısı (Kendisi Dahil)', family.siblingCount],
          ['Okuyan Kardeş Sayısı (Kendisi Dahil)', family.studyingSiblingCount],
          ['Velinin Yaşadığı Yer', optionLabel(GUARDIAN_HOUSING, family.guardianHousing)],
          ['Açıklama', family.guardianHousingNote],
          ['Anne ve Baba', optionLabel(PARENTS_LIVING, family.parentsLiving)],
        ] : []}>
          {family ? (
            <div className="mt-4 grid gap-6 border-t border-slate-100 pt-4 sm:grid-cols-2">
              <ParentSummary title="Anne Bilgileri" parent={family.mother} />
              <ParentSummary title="Baba Bilgileri" parent={family.father} />
            </div>
          ) : <p className="text-sm text-slate-500">Henüz girilmedi.</p>}
        </SummarySection>
      )}

      {yurt && (
        <SummarySection title="Burs Bilgileri" editTo="/basvuru/burs-bilgileri" rows={scholarship ? [
          ['Başka Kuruluştan / Kişiden Burs', yesNo(scholarship.otherScholarship)],
          ['Burs Aldığı Kurum', scholarship.otherScholarshipOrg],
          ['Aldığı Burs Miktarı', formatMoney(scholarship.otherScholarshipAmount)],
          // Lise yurdunda GSB / KYK sorulmaz (null)
          ['GSB Beslenme Barınma Yardımı', scholarship.gsbSupport == null ? null : yesNo(scholarship.gsbSupport)],
          ["KYK'dan Destek", optionLabel(KYK_SUPPORT, scholarship.kykSupport)],
          ['Talep Edilen Aylık Burs', formatMoney(scholarship.requestedAmount)],
        ] : []}>
          {scholarship?.commissionNote && (
            <div className="mt-3 text-sm">
              <p className="text-slate-500">Burs Komisyonuna</p>
              <p className="mt-0.5 whitespace-pre-line font-medium text-slate-900">{scholarship.commissionNote}</p>
            </div>
          )}
          {!scholarship && <p className="text-sm text-slate-500">Henüz girilmedi.</p>}
        </SummarySection>
      )}

      {!yurt && <SummarySection title="Belgeler" editTo="/basvuru/belgeler">
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
      </SummarySection>}

      <div className="rounded-xl bg-brand-50 p-4 ring-1 ring-inset ring-brand-100 sm:p-5">
        <Checkbox id="confirm" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} disabled={!canSubmit}>
          Bu formda beyan ettiğim tüm bilgi ve belgelerin doğruluğunu, eksiksiz ve güncel olduğunu taahhüt ederim.
          Gerçeğe aykırı, eksik veya yanıltıcı beyanda bulunmam durumunda burs başvurumun geçersiz sayılacağını, burs
          tahsis edilmiş olsa dahi derhal iptal edilerek yapılan ödemelerin yasal mevzuat çerçevesinde tahsil edileceğini
          kabul, beyan ve taahhüt ederim.
        </Checkbox>
      </div>

      {sendError && <Alert variant="error">{sendError}</Alert>}
    </StepPage>
  );
}
