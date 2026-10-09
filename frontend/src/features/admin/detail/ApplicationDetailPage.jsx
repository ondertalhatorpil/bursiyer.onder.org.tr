import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Award, CircleCheck, CircleX, TriangleAlert } from 'lucide-react';
import { Alert, Badge, PageSpinner } from '../../../components/ui';
import StatusBadge from '../shared/StatusBadge';
import InfoSection from './InfoSection';
import StatusActions from './StatusActions';
import DocumentsReview from './DocumentsReview';
import NotesPanel from './NotesPanel';
import HistoryTimeline from './HistoryTimeline';
import ReferenceToggle from './ReferenceToggle';
import IbanReview from './IbanReview';
import QualifiedToggle from './QualifiedToggle';
import SponsorsPanel from './SponsorsPanel';
import YurtReviewPanel from './YurtReviewPanel';
import { adminApi } from '../../../api/adminEndpoints';
import { can, useAdminSession } from '../../../hooks/useAdmin';
import { formatDate, formatDateTime, formatMoney } from '../../../lib/format';
import {
  GRADE_LABELS, GUARDIAN_HOUSING, isYurt, KYK_SUPPORT, optionLabel, PARENT_STATUS, PARENTS_LIVING,
} from '../../../config';
import { SMS_STATUS, SMS_TEMPLATES } from '../shared/constants';

const ID_TYPES = { TC: 'T.C. Kimlik No', YKN: 'Yabancı Kimlik No', PASAPORT: 'Pasaport' };
const UNI_TYPES = { devlet: 'Devlet', vakif: 'Vakıf' };
const YES_NO = (v) => (v ? 'Evet' : 'Hayır');

/** Yurt Konaklama Bursu: anne / baba satırları */
const parentRows = (prefix, p) => (p ? [
  { label: `${prefix} durumu`, value: optionLabel(PARENT_STATUS, p.status) },
  { label: `${prefix} adı soyadı`, value: p.fullName },
  { label: `${prefix} mesleği`, value: p.job },
  { label: `${prefix} yaşadığı il / ilçe`, value: p.location },
  { label: `${prefix} aylık geliri`, value: formatMoney(p.income) },
  { label: `${prefix} ek geliri`, value: formatMoney(p.extraIncome) },
] : []);

export default function ApplicationDetailPage() {
  const { id } = useParams();
  const { admin } = useAdminSession();
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'application', id],
    queryFn: () => adminApi.application(id),
  });

  if (isLoading) return <PageSpinner />;
  if (error) return <Alert variant="error" action={<Link to="/admin/basvurular" className="font-semibold underline">Listeye dön</Link>}>{error.message}</Alert>;

  const app = data.application;
  const p = app.applicant;
  const e = app.education;
  const yurt = isYurt(app.category);
  const family = app.yurt?.family;
  const scholarship = app.yurt?.scholarship;
  const canReview = can(admin, 'review');
  const yesNo = (v, yes, no) => (v ? <OkText>{yes}</OkText> : <WarnText>{no}</WarnText>);

  return (
    <div className="space-y-5">
      <Link to="/admin/basvurular" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> Başvurular
      </Link>

      {/* Başlık */}
      <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 ring-1 ring-slate-200 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold">{p.firstName} {p.lastName}</h1>
            <StatusBadge status={app.status} label={app.statusLabel} />
            {app.isMinor && <Badge>18 yaş altı</Badge>}
            {app.status === 'finalized' && app.qualified?.value && <Badge tone="brand"><Award className="size-3.5" aria-hidden />Nitelikli bursiyer</Badge>}
          </div>
          <p className="mt-1 text-sm text-slate-600">
            <span className="font-mono font-semibold text-slate-800">{app.trackingNo || 'Takip no yok (taslak)'}</span>
            {' · '}{app.categoryLabel || 'Kategori seçilmedi'}
            {app.submittedAt && <> · Gönderim {formatDateTime(app.submittedAt)}</>}
          </p>
          {app.flags.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {app.flags.map((f) => <li key={f.code}><Badge tone="warning"><TriangleAlert className="size-3.5" aria-hidden />{f.label}</Badge></li>)}
            </ul>
          )}
          {app.rejectionReason && <p className="mt-2 text-sm text-accent-700"><strong>Red gerekçesi:</strong> {app.rejectionReason}</p>}
        </div>
        <StatusActions app={app} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-5">
          {['approved', 'iban_pending', 'finalized'].includes(app.status) && <IbanReview app={app} canDecide={can(admin, 'decide')} />}
          {yurt && app.status !== 'draft' && <YurtReviewPanel app={app} />}
          <InfoSection title="Kişisel bilgiler" rows={[
            { label: ID_TYPES[p.idType] || 'Kimlik No', value: <span className="font-mono">{p.idNumber}</span> },
            { label: 'Doğum tarihi', value: `${formatDate(p.birthDate)} (${p.age} yaş)` },
            { label: 'Uyruk', value: p.nationality },
            { label: 'Cep telefonu', value: p.phone },
            { label: 'E-posta', value: p.email },
          ]} />

          {app.guardian && (
            <InfoSection title="Veli / vasi" rows={[
              { label: 'Ad soyad', value: app.guardian.fullName },
              { label: ID_TYPES[app.guardian.idType] || 'Kimlik No', value: <span className="font-mono">{app.guardian.idNumber}</span> },
              { label: 'Cep telefonu', value: app.guardian.phone },
              { label: 'SMS onayı', value: yesNo(app.guardian.verified, `Onaylandı · ${formatDateTime(app.guardian.verifiedAt)}`, 'Onaylanmadı') },
            ]} />
          )}

          {app.channel && (
            <InfoSection title="Başvuru kanalı" rows={[
              { label: 'Kanal', value: app.channel.name },
              { label: 'Birim', value: app.channel.subUnit },
              ...app.channel.fields.map((f) => ({ label: f.label, value: f.value })),
              { label: 'Şartlar kabulü', value: app.requirementsAcceptedAt && formatDateTime(app.requirementsAcceptedAt) },
            ]} />
          )}

          {e && (
            <InfoSection title="Eğitim bilgileri" rows={[
              { label: 'İl / ilçe', value: [e.city, e.district].filter(Boolean).join(' / ') },
              { label: 'Okul', value: e.school && <>{e.school}{e.schoolMebCode && <span className="text-slate-500"> ({e.schoolMebCode})</span>}{e.schoolNotInList && <WarnText> · listede yok</WarnText>}</>, wide: true },
              { label: 'Üniversite', value: e.university && <>{e.university}{e.universityNotInList && <WarnText> · listede yok</WarnText>}</>, wide: true },
              { label: 'Üniversite türü', value: UNI_TYPES[e.universityType] },
              { label: ['yuksek_lisans', 'doktora'].includes(app.category) ? 'Enstitü' : 'Fakülte', value: e.faculty },
              { label: 'Bölüm / program', value: e.department },
              { label: 'Sınıf', value: GRADE_LABELS[e.grade] || e.grade },
              { label: 'Konakladığı yurt', value: e.dormitory, wide: true },
              { label: 'Üniversitedeki burs oranı', value: e.tuitionScholarshipRate && `%${e.tuitionScholarshipRate}` },
              { label: 'Ödenen yıllık ücret', value: formatMoney(e.annualTuitionFee) },
            ]} />
          )}

          {yurt && (
            <InfoSection title="Aile ve gelir bilgileri" rows={family ? [
              { label: 'Toplam kardeş sayısı (kendisi dahil)', value: family.siblingCount },
              { label: 'Okuyan kardeş sayısı (kendisi dahil)', value: family.studyingSiblingCount },
              { label: 'Velinin yaşadığı yer', value: optionLabel(GUARDIAN_HOUSING, family.guardianHousing) },
              { label: 'Açıklama', value: family.guardianHousingNote },
              ...parentRows('Anne', family.mother),
              ...parentRows('Baba', family.father),
              { label: 'Anne ve baba', value: optionLabel(PARENTS_LIVING, family.parentsLiving) },
            ] : []}>
              {!family && <p className="text-sm text-slate-500">Girilmedi</p>}
            </InfoSection>
          )}

          {yurt && (
            <InfoSection title="Burs bilgileri" rows={scholarship ? [
              { label: 'Talep edilen aylık burs', value: <strong>{formatMoney(scholarship.requestedAmount)}</strong> },
              { label: 'Başka kuruluştan / kişiden burs', value: YES_NO(scholarship.otherScholarship) },
              { label: 'Burs aldığı kurum', value: scholarship.otherScholarshipOrg },
              { label: 'Aldığı burs miktarı', value: formatMoney(scholarship.otherScholarshipAmount) },
              { label: 'GSB beslenme barınma yardımı', value: scholarship.gsbSupport == null ? null : YES_NO(scholarship.gsbSupport) },
              { label: "KYK'dan destek", value: optionLabel(KYK_SUPPORT, scholarship.kykSupport) },
              { label: 'Burs Komisyonuna', value: scholarship.commissionNote && <span className="whitespace-pre-line">{scholarship.commissionNote}</span>, wide: true },
            ] : []}>
              {!scholarship && <p className="text-sm text-slate-500">Girilmedi</p>}
            </InfoSection>
          )}

          {!yurt && <DocumentsReview app={app} canReview={canReview} />}

          <InfoSection title="Onaylar ve bildirimler">
            <div className="grid gap-6 text-sm md:grid-cols-2">
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Onay metinleri</h3>
                <ul className="space-y-1.5">
                  {app.consents.map((c, i) => (
                    <li key={i} className="text-slate-700">
                      {c.title} <span className="text-slate-400">v{c.version}{c.byGuardian ? ' · veli' : ''} · {formatDateTime(c.acceptedAt)}</span>
                    </li>
                  ))}
                  {!app.consents.length && <li className="text-slate-500">Kayıt yok</li>}
                </ul>
              </div>
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Gönderilen SMS'ler</h3>
                <ul className="space-y-1.5">
                  {app.sms.map((s, i) => (
                    <li key={i} className="text-slate-700">{SMS_TEMPLATES[s.template] || s.template} <span className="text-slate-400">· {SMS_STATUS[s.status] || s.status} · {formatDateTime(s.at)}</span></li>
                  ))}
                  {!app.sms.length && <li className="text-slate-500">Kayıt yok</li>}
                </ul>
              </div>
            </div>
          </InfoSection>
        </div>

        <aside className="min-w-0 space-y-5">
          {/* Yurt Konaklama Bursu'nda nitelikli bursiyer, burs veren ve referans teyidi yok (backend null döner) */}
          {app.qualified?.editable && <QualifiedToggle app={app} canWrite={can(admin, 'decide')} />}
          {app.sponsors?.editable && <SponsorsPanel app={app} canWrite={canReview} />}
          {app.reference && <ReferenceToggle app={app} canWrite={canReview} />}
          <NotesPanel app={app} canWrite={canReview} />
          <HistoryTimeline history={app.history} />
        </aside>
      </div>
    </div>
  );
}

const OkText = ({ children }) => <span className="inline-flex items-center gap-1 text-emerald-700"><CircleCheck className="size-4" aria-hidden />{children}</span>;
const WarnText = ({ children }) => <span className="inline-flex items-center gap-1 text-amber-700"><CircleX className="size-4" aria-hidden />{children}</span>;
