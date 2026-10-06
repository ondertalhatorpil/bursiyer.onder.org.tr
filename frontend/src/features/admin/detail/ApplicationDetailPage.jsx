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
import { adminApi } from '../../../api/adminEndpoints';
import { can, useAdminSession } from '../../../hooks/useAdmin';
import { formatDate, formatDateTime } from '../../../lib/format';
import { GRADE_LABELS } from '../../../config';
import { SMS_STATUS, SMS_TEMPLATES } from '../shared/constants';

const ID_TYPES = { TC: 'T.C. Kimlik No', YKN: 'Yabancı Kimlik No', PASAPORT: 'Pasaport' };
const UNI_TYPES = { devlet: 'Devlet', vakif: 'Vakıf' };

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
            {app.status === 'finalized' && app.qualified.value && <Badge tone="brand"><Award className="size-3.5" aria-hidden />Nitelikli bursiyer</Badge>}
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
              { label: 'Fakülte', value: e.faculty },
              { label: 'Bölüm / program', value: e.department },
              { label: 'Sınıf', value: GRADE_LABELS[e.grade] || e.grade },
            ]} />
          )}

          <DocumentsReview app={app} canReview={canReview} />

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
          {app.qualified.editable && <QualifiedToggle app={app} canWrite={can(admin, 'decide')} />}
          {app.sponsors.editable && <SponsorsPanel app={app} canWrite={canReview} />}
          <ReferenceToggle app={app} canWrite={canReview} />
          <NotesPanel app={app} canWrite={canReview} />
          <HistoryTimeline history={app.history} />
        </aside>
      </div>
    </div>
  );
}

const OkText = ({ children }) => <span className="inline-flex items-center gap-1 text-emerald-700"><CircleCheck className="size-4" aria-hidden />{children}</span>;
const WarnText = ({ children }) => <span className="inline-flex items-center gap-1 text-amber-700"><CircleX className="size-4" aria-hidden />{children}</span>;
