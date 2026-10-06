import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleCheckBig, ExternalLink, Hourglass } from 'lucide-react';
import { Alert, Badge, Card, CardBody, CardHeader, PageSpinner } from '../../../components/ui';
import { ibanApi } from '../../../api/endpoints';
import { APPLICATION_KEY } from '../../../hooks/useApplication';
import { formatDateTime } from '../../../lib/format';
import IbanForm from './IbanForm';

export const IBAN_KEY = ['iban'];
const TONE = { pending: 'brand', accepted: 'success', rejected: 'danger' };

/** Adım 8: onaylanan adaydan IBAN; kontrol sürecinde ve kesinleşince durum */
export default function IbanStep() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: IBAN_KEY, queryFn: ibanApi.get });
  if (isLoading) return <PageSpinner />;
  if (error) return <Alert variant="error">{error.message}</Alert>;
  if (!data.available) return null;

  if (data.finalized) {
    return (
      <div className="rounded-[var(--radius-card)] bg-emerald-600 px-6 py-8 text-center text-white sm:px-10">
        <CircleCheckBig className="mx-auto size-12" aria-hidden />
        <h2 className="mt-4 text-2xl font-extrabold !text-white">{data.finalized.title}</h2>
        <p className="mx-auto mt-3 max-w-xl whitespace-pre-line text-sm leading-relaxed text-emerald-50">{data.finalized.body}</p>
        {data.account && <p className="mt-4 text-sm text-emerald-100">{data.account.ibanMasked}</p>}
      </div>
    );
  }

  const acc = data.account;
  return (
    <Card>
      <CardHeader eyebrow="Adım 8" title="IBAN Bilgileri"
        description={data.canSubmit ? 'Burs ödemesinin yapılacağı hesap bilgilerinizi giriniz.' : undefined}
        actions={acc && <Badge tone={TONE[acc.status]} dot>{acc.statusLabel}</Badge>} />
      <CardBody className="space-y-5">
        {data.warning && (
          <Alert variant="warning" title={data.warning.title}>{data.warning.body}</Alert>
        )}

        {acc?.status === 'rejected' && data.canSubmit && (
          <Alert variant="error" title="Girdiğiniz IBAN kabul edilmedi">
            {acc.reviewNote}
            <p className="mt-1">Lütfen bilgileri kontrol edip yeniden giriniz.</p>
          </Alert>
        )}

        {data.canSubmit ? (
          <IbanForm data={data} onSaved={(res) => {
            qc.setQueryData(IBAN_KEY, res);
            qc.invalidateQueries({ queryKey: APPLICATION_KEY });
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }} />
        ) : acc && (
          <div className="space-y-4">
            <Alert variant="info" title="IBAN bilgileriniz kontrol ediliyor">
              Bilgileriniz personelimiz tarafından kontrol edildikten sonra sonuç SMS ile bildirilecektir.
            </Alert>
            <dl className="grid gap-4 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
              <div><dt className="text-slate-500">Hesap sahibi</dt><dd className="mt-0.5 font-semibold">{data.holderName}</dd></div>
              <div><dt className="text-slate-500">IBAN</dt><dd className="mt-0.5 font-mono font-semibold">{acc.ibanMasked}</dd></div>
              <div><dt className="text-slate-500">Gönderim</dt><dd className="mt-0.5 font-semibold">{formatDateTime(acc.submittedAt)}</dd></div>
              <div className="sm:col-span-2">
                <dt className="text-slate-500">Hesap belgesi</dt>
                <dd className="mt-0.5">
                  <a href={ibanApi.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">
                    {acc.documentName} <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                </dd>
              </div>
            </dl>
            <p className="flex items-center gap-2 text-xs text-slate-500"><Hourglass className="size-4" aria-hidden />Kontrol tamamlanana kadar bilgiler değiştirilemez.</p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
