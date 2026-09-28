import { useLocation } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleCheckBig, Copy } from 'lucide-react';
import { useState } from 'react';
import { Alert, Badge, Button, Card, CardBody, CardHeader, PageSpinner } from '../../../components/ui';
import DocumentCard from '../documents/DocumentCard';
import IbanStep from '../iban/IbanStep';
import { documentsApi } from '../../../api/endpoints';
import { APPLICATION_KEY, useApplication } from '../../../hooks/useApplication';
import { formatDateTime } from '../../../lib/format';
import { STATUS_TONES } from '../../../config';

const EXPLAIN = {
  submitted: 'Başvurunuz alındı ve değerlendirme sırasına girdi.',
  in_review: 'Başvurunuz ilgili birim ve Genel Merkez tarafından inceleniyor.',
  revision_requested: 'Bazı belgelerinizin yeniden yüklenmesi gerekiyor. Aşağıda işaretlenen belgeleri güncelleyin.',
  rejected: 'Başvurunuz değerlendirme sonucunda olumlu sonuçlanmadı.',
  approved: 'Tebrikler, başvurunuz onaylandı. Burs ödemesi için aşağıdan IBAN bilgilerinizi girin.',
  iban_pending: 'Başvurunuz onaylandı. IBAN bilgileriniz kontrol ediliyor.',
  finalized: 'Bursiyer kaydınız kesinleşti.',
};

/** Gönderilmiş başvurunun durumu (ve gönderimden hemen sonra başarı mesajı) */
export default function StatusPage() {
  const { state } = useLocation();
  const { application } = useApplication();
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);
  const revision = application?.status === 'revision_requested';
  const docs = useQuery({ queryKey: ['documents'], queryFn: documentsApi.list, enabled: revision });

  if (!application) return <PageSpinner />;
  const justSubmitted = state?.submitted || qc.getQueryData(['submitResult']);

  const copy = async () => {
    await navigator.clipboard?.writeText(application.trackingNo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {justSubmitted && (
        <div className="rounded-[var(--radius-card)] bg-emerald-600 px-6 py-8 text-center text-white sm:px-10">
          <CircleCheckBig className="mx-auto size-12" aria-hidden />
          <h1 className="mt-4 text-2xl font-extrabold !text-white">{justSubmitted.message.title}</h1>
          <p className="mx-auto mt-3 max-w-xl whitespace-pre-line text-sm leading-relaxed text-emerald-50">
            {justSubmitted.message.body.replace(/Başvuru Takip Numaranız: \S+\n?/, '')}
          </p>
        </div>
      )}

      {['approved', 'iban_pending', 'finalized'].includes(application.status) && <IbanStep />}

      <Card>
        <CardHeader
          title="Başvuru Durumu"
          description={application.program?.title}
          actions={<Badge tone={STATUS_TONES[application.status]} dot>{application.statusLabel}</Badge>}
        />
        <CardBody className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4">
            <div>
              <p className="text-sm text-slate-500">Başvuru Takip Numaranız</p>
              <p className="mt-0.5 text-2xl font-extrabold tracking-wide text-brand-900 tabular-nums">{application.trackingNo}</p>
            </div>
            <Button variant="secondary" size="sm" icon={Copy} onClick={copy}>{copied ? 'Kopyalandı' : 'Kopyala'}</Button>
          </div>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-500">Kategori</dt><dd className="mt-0.5 font-semibold">{application.categoryLabel}</dd></div>
            <div><dt className="text-slate-500">Gönderim Tarihi</dt><dd className="mt-0.5 font-semibold">{formatDateTime(application.submittedAt)}</dd></div>
          </dl>
          <Alert variant={application.status === 'rejected' ? 'error' : revision ? 'warning' : ['approved', 'finalized'].includes(application.status) ? 'success' : 'info'}>
            {EXPLAIN[application.status]}
            {['submitted', 'in_review', 'revision_requested'].includes(application.status) && ' Değerlendirme sonucu SMS ile bildirilecektir.'}
          </Alert>
        </CardBody>
      </Card>

      {revision && (
        <Card>
          <CardHeader title="Güncellenmesi istenen belgeler" />
          <CardBody className="space-y-4">
            {docs.isLoading && <PageSpinner />}
            {docs.data?.items.filter((i) => i.upload?.reviewStatus === 'revision_requested' || i.editable).map((item) => (
              <DocumentCard key={item.code} item={item} canRemove={false}
                onChange={(list) => { qc.setQueryData(['documents'], list); qc.invalidateQueries({ queryKey: APPLICATION_KEY }); }} />
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
