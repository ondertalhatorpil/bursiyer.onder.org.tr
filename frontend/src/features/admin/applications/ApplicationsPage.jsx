import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Download, Inbox, Wallet } from 'lucide-react';
import { Alert, PageSpinner } from '../../../components/ui';
import FiltersBar from './FiltersBar';
import ApplicationsTable from './ApplicationsTable';
import Pagination from './Pagination';
import useListFilters from './useListFilters';
import { adminApi } from '../../../api/adminEndpoints';
import { can, useAdminSession } from '../../../hooks/useAdmin';

export default function ApplicationsPage() {
  const { admin } = useAdminSession();
  const { filters, apiFilters, setFilter, reset, activeCount } = useListFilters();
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['admin', 'applications', apiFilters],
    queryFn: () => adminApi.applications(apiFilters),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Başvurular</h1>
          <p className="text-sm text-slate-500">Satıra tıklayarak başvuruyu inceleyin.</p>
        </div>
        <div className="flex flex-wrap gap-2">
        {can(admin, 'export') && can(admin, 'view_full_id') && (
          <a href={adminApi.paymentsExportUrl()} title="Kayıt kesinleşmiş bursiyerler ve onaylı IBAN'ları"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-brand-800 ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
            <Wallet className="size-4" aria-hidden /> Ödeme listesi
          </a>
        )}
        {can(admin, 'export') && (
          <a href={adminApi.exportUrl(apiFilters)}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-brand-800 ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
            <Download className="size-4" aria-hidden /> Excel'e aktar
          </a>
        )}
        </div>
      </div>

      <FiltersBar filters={filters} setFilter={setFilter} reset={reset} activeCount={activeCount} />

      {error && <Alert variant="error">{error.message}</Alert>}
      {isLoading ? <PageSpinner /> : data && (
        <div className={isFetching ? 'opacity-60 transition-opacity' : undefined}>
          {data.items.length ? (
            <div className="space-y-4">
              <ApplicationsTable items={data.items} />
              <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize}
                onChange={(p) => { setFilter({ page: p }); window.scrollTo({ top: 0 }); }} />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-white px-4 py-14 text-center ring-1 ring-slate-200">
              <Inbox className="size-8 text-slate-400" aria-hidden />
              <p className="font-semibold text-slate-700">Bu filtrelere uyan başvuru yok</p>
              {(activeCount > 0 || filters.q) && <button type="button" onClick={reset} className="text-sm font-semibold text-brand-700 hover:underline">Filtreleri temizle</button>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
