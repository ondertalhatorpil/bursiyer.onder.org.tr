import { useState } from 'react';
import { useLocation } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { PageSpinner } from '../../../components/ui';
import DocumentCard from '../documents/DocumentCard';
import IbanStep from '../iban/IbanStep';
import { documentsApi } from '../../../api/endpoints';
import { APPLICATION_KEY, useApplication } from '../../../hooks/useApplication';
import { formatDateTime } from '../../../lib/format';

const EXPLAIN = {
  submitted: 'Başvurunuz alındı ve değerlendirme sırasına girdi.',
  in_review: 'Başvurunuz ilgili birim ve Genel Merkez tarafından inceleniyor.',
  revision_requested: 'Bazı belgelerinizin yeniden yüklenmesi gerekiyor. Aşağıda işaretlenen belgeleri güncelleyin.',
  rejected: 'Başvurunuz değerlendirme sonucunda olumlu sonuçlanmadı.',
  approved: 'Tebrikler, başvurunuz onaylandı. Burs ödemesi için IBAN bilgilerinizi girin.',
  iban_pending: 'Başvurunuz onaylandı. IBAN bilgileriniz kontrol ediliyor.',
  finalized: 'Bursiyer kaydınız kesinleşti.',
};

/** Süreç adımları ve her statünün bu çizgideki yeri */
const STAGES = ['Başvuru alındı', 'İnceleme', 'Sonuç', 'IBAN', 'Kesinleşti'];
const STAGE_OF = {
  submitted: 0, in_review: 1, revision_requested: 1, rejected: 2, approved: 3, iban_pending: 3, finalized: 4,
};

/** Açıklamadaki nokta ve yazı rengi */
const TONE = {
  rejected: ['bg-accent-600', 'text-accent-700'],
  revision_requested: ['bg-amber-500', 'text-amber-800'],
  approved: ['bg-emerald-600', 'text-emerald-800'],
  iban_pending: ['bg-emerald-600', 'text-emerald-800'],
  finalized: ['bg-emerald-600', 'text-emerald-800'],
};

function Progress({ status }) {
  const current = STAGE_OF[status] ?? 0;
  const done = status === 'finalized';
  const problem = status === 'rejected' || status === 'revision_requested';

  const bar = (i) => {
    const past = i < current || (done && i === current);
    const active = i === current && !done;
    return clsx(
      'block h-1 rounded-full transition-colors',
      past && 'bg-brand-700',
      active && (problem ? 'bg-accent-600' : 'bg-brand-400'),
      !past && !active && 'bg-slate-200',
    );
  };

  return (
    <div aria-label="Başvuru süreci">
      <ol className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {STAGES.map((label, i) => {
          const active = i === current && !done;
          const past = i < current || (done && i === current);
          return (
            <li key={label} className="min-w-0" aria-current={active ? 'step' : undefined}>
              <span className={bar(i)} aria-hidden />
              {/* Etiketler sadece tablet ve üstünde */}
              <span
                className={clsx(
                  'mt-2 hidden truncate text-xs font-medium sm:block',
                  active ? (problem ? 'text-accent-700' : 'text-slate-900') : past ? 'text-slate-600' : 'text-slate-400',
                )}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
      {/* Mobilde tek satır */}
      <p className={clsx('mt-3 text-xs font-medium sm:hidden', problem ? 'text-accent-700' : 'text-slate-600')}>
        Aşama {current + 1} / {STAGES.length} · {STAGES[current]}
      </p>
    </div>
  );
}

/** Başlık + iki yanda ince çizgi (ortalı) */
function SectionTitle({ children }) {
  return (
    <div className="flex items-center gap-4">
      <span className="h-px flex-1 bg-slate-200" aria-hidden />
      <h2 className="shrink-0 text-xs font-bold uppercase tracking-[0.15em] text-slate-500">{children}</h2>
      <span className="h-px flex-1 bg-slate-200" aria-hidden />
    </div>
  );
}

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
  const pending = ['submitted', 'in_review', 'revision_requested'].includes(application.status);
  const [dot, text] = TONE[application.status] || ['bg-brand-700', 'text-slate-700'];

  const copy = async () => {
    await navigator.clipboard?.writeText(application.trackingNo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto w-full max-w-xl space-y-12 py-4 sm:py-8">
      {/* Başlık: gönderimden hemen sonra başarı mesajı, sonra normal durum başlığı */}
      <header className="text-center">
        {justSubmitted ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Başvurunuz alındı</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{justSubmitted.message.title}</h1>
            <p className="mx-auto mt-3 max-w-md whitespace-pre-line text-sm leading-relaxed text-slate-600">
              {justSubmitted.message.body.replace(/Başvuru Takip Numaranız: \S+\n?/, '')}
            </p>
          </>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">{application.program?.title}</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Başvuru Durumu</h1>
          </>
        )}
      </header>

      <section className="space-y-10 text-center">
        <Progress status={application.status} />

        {/* Takip numarası */}
        <div>
          <p className="text-xs font-medium text-slate-500">Başvuru takip numaranız</p>
          <p className="mt-1 break-all text-[26px] font-bold tracking-wide text-slate-900 tabular-nums sm:text-4xl">
            {application.trackingNo}
          </p>
          <button
            type="button"
            onClick={copy}
            className="mt-2 inline-flex min-h-10 items-center px-2 text-sm font-semibold text-brand-700 underline-offset-4 hover:underline"
          >
            {copied ? 'Kopyalandı' : 'Numarayı kopyala'}
          </button>
        </div>

        {/* Bilgiler */}
        <dl className="divide-y divide-slate-200 border-y border-slate-200 text-left text-sm">
          <div className="flex justify-between gap-4 py-3.5">
            <dt className="text-slate-500">Durum</dt>
            <dd className="text-right font-semibold text-slate-900">{application.statusLabel}</dd>
          </div>
          <div className="flex justify-between gap-4 py-3.5">
            <dt className="text-slate-500">Kategori</dt>
            <dd className="text-right font-semibold text-slate-900">{application.categoryLabel}</dd>
          </div>
          <div className="flex justify-between gap-4 py-3.5">
            <dt className="text-slate-500">Gönderim tarihi</dt>
            <dd className="text-right font-semibold text-slate-900 tabular-nums">{formatDateTime(application.submittedAt)}</dd>
          </div>
        </dl>
      </section>

      {/* Adım 8: IBAN */}
      {['approved', 'iban_pending', 'finalized'].includes(application.status) && <IbanStep />}

      {/* Revize istenen belgeler */}
      {revision && (
        <section className="space-y-5">
          <SectionTitle>Güncellenmesi istenen belgeler</SectionTitle>
          {docs.isLoading && <PageSpinner />}
          <div className="space-y-4">
            {docs.data?.items.filter((i) => i.upload?.reviewStatus === 'revision_requested' || i.editable).map((item) => (
              <DocumentCard key={item.code} item={item} canRemove={false}
                onChange={(list) => { qc.setQueryData(['documents'], list); qc.invalidateQueries({ queryKey: APPLICATION_KEY }); }} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}