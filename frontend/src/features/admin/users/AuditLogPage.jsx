import { Link, useSearchParams } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { Alert, PageSpinner, inputClass } from '../../../components/ui';
import { usersApi } from '../../../api/adminEndpoints';
import { formatDateTime } from '../../../lib/format';
import Pagination from '../applications/Pagination';
import clsx from 'clsx';

const KEYS = ['adminId', 'action', 'from', 'to', 'page'];
const STATUS = {
  submitted: 'Başvuru Tamamlandı', in_review: 'İncelemede', revision_requested: 'Revize İstendi',
  rejected: 'Reddedildi', approved: 'Onaylandı', iban_pending: 'IBAN Kontrolünde', finalized: 'Kesinleşti',
};
const REVIEW = { accepted: 'belge uygun', revision_requested: 'belge revize', pending: 'değerlendirme geri alındı' };

/** Başvuruya bağlı kayıtlarda başvuru linki */
function Target({ meta }) {
  if (!meta) return null;
  const appId = meta.application || (meta.id && typeof meta.id === 'string' ? meta.id : null);
  const parts = [];
  if (meta.trackingNo) parts.push(meta.trackingNo);
  if (meta.to) parts.push(`→ ${STATUS[meta.to] || meta.to}`);
  if (meta.reviewStatus) parts.push(REVIEW[meta.reviewStatus] || meta.reviewStatus);
  if (meta.decision) parts.push(meta.decision === 'accepted' ? 'IBAN uygun' : 'IBAN reddedildi');
  if (meta.email) parts.push(meta.email);
  if (meta.type) parts.push(meta.type + (meta.version ? ` v${meta.version}` : ''));
  if (meta.key) parts.push(meta.key);
  if (meta.code) parts.push(meta.code);
  if (meta.count != null) parts.push(`${meta.count} satır`);
  if (typeof meta.isOpen === 'boolean') parts.push(meta.isOpen ? 'başvuruya açtı' : 'başvuruya kapattı');
  const text = parts.join(' · ');
  if (appId) return <Link to={`/admin/basvurular/${appId}`} className="text-brand-700 hover:underline">{text || 'Başvuru'}</Link>;
  return <span>{text}</span>;
}

export default function AuditLogPage() {
  const [params, setParams] = useSearchParams();
  const f = Object.fromEntries(KEYS.map((k) => [k, params.get(k) || '']));
  const filters = { ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)), page: Number(f.page) || 1 };
  const setFilter = (patch) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    if (!('page' in patch)) next.delete('page');
    setParams(next, { replace: true });
  };

  const users = useQuery({ queryKey: ['admin', 'users'], queryFn: usersApi.list });
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['admin', 'audit', filters], queryFn: () => usersApi.auditLogs(filters), placeholderData: keepPreviousData,
  });

  const cls = clsx(inputClass(false), 'h-10 text-sm');
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">İşlem kayıtları</h1>
        <p className="text-sm text-slate-500">Panelde kimin ne zaman hangi işlemi yaptığı (KVKK kaydı).</p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Sel className={cls} label="Kullanıcı" value={f.adminId} onChange={(v) => setFilter({ adminId: v })}
          options={(users.data?.items || []).map((u) => ({ value: String(u.id), label: u.fullName }))} placeholder="Tüm kullanıcılar" />
        <Sel className={cls} label="İşlem" value={f.action} onChange={(v) => setFilter({ action: v })}
          options={data?.actions || []} placeholder="Tüm işlemler" />
        <input type="date" aria-label="Başlangıç tarihi" className={cls} value={f.from} onChange={(e) => setFilter({ from: e.target.value })} />
        <input type="date" aria-label="Bitiş tarihi" className={cls} value={f.to} onChange={(e) => setFilter({ to: e.target.value })} />
      </div>

      {error && <Alert variant="error">{error.message}</Alert>}
      {isLoading ? <PageSpinner /> : data && (
        <div className={clsx('space-y-4', isFetching && 'opacity-60')}>
          <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-slate-200">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr><th className="px-4 py-3">Zaman</th><th className="px-4 py-3">Kullanıcı</th><th className="px-4 py-3">İşlem</th><th className="px-4 py-3">Ayrıntı</th><th className="px-4 py-3">IP</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((l) => (
                  <tr key={l.id} className="align-top">
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{formatDateTime(l.at)}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-900">{l.admin || '—'}</td>
                    <td className="px-4 py-2.5 text-slate-700">{l.actionLabel}</td>
                    <td className="px-4 py-2.5 text-slate-600"><Target meta={l.meta} /></td>
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-slate-500">{l.ip}</td>
                  </tr>
                ))}
                {!data.items.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Kayıt yok</td></tr>}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize}
            onChange={(p) => setFilter({ page: String(p) })} unit="kayıt" />
        </div>
      )}
    </div>
  );
}

function Sel({ label, value, onChange, options, placeholder, className }) {
  return (
    <div className="relative min-w-0">
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={clsx(className, 'appearance-none pr-9', !value && 'text-slate-500')}>
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o.value} value={o.value} className="text-slate-900">{o.label}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
    </div>
  );
}
