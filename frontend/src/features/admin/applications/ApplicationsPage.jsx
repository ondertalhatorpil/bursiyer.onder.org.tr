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
    <div className="space-y-6">
      {/* Sayfa Başlığı ve Aksiyonlar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Başvurular</h1>
          <p className="mt-1 text-sm text-slate-500">
            Sistemdeki tüm başvuruları filtreleyebilir ve detay için satıra tıklayabilirsiniz.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {can(admin, 'export') && can(admin, 'view_full_id') && (
            <a
              href={adminApi.paymentsExportUrl()}
              title="Kayıt kesinleşmiş bursiyerler ve onaylı IBAN'ları"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-300 transition-colors hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <Wallet className="size-4 text-slate-500" aria-hidden />
              <span>Ödeme Listesi</span>
            </a>
          )}

          {can(admin, 'export') && (
            <a
              href={adminApi.exportUrl(apiFilters)}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-300 transition-colors hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <Download className="size-4 text-slate-500" aria-hidden />
              <span>Excel'e Aktar</span>
            </a>
          )}
        </div>
      </div>

      {/* Filtre Barı */}
      <FiltersBar filters={filters} setFilter={setFilter} reset={reset} activeCount={activeCount} />

      {/* Hata Durumu */}
      {error && (
        <Alert variant="error" className="rounded-xl">
          {error.message}
        </Alert>
      )}

      {/* Yüklenme ve İçerik Alanı */}
      {isLoading ? (
        <PageSpinner />
      ) : (
        data && (
          <div className={isFetching ? 'opacity-60 transition-opacity duration-200' : undefined}>
            {data.items.length ? (
              <div className="space-y-4">
                <ApplicationsTable items={data.items} />
                <Pagination
                  page={data.page}
                  totalPages={data.totalPages}
                  total={data.total}
                  pageSize={data.pageSize}
                  onChange={(p) => {
                    setFilter({ page: p });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              </div>
            ) : (
              /* Boş Sonuç Ekranı */
              <div className="flex flex-col items-center justify-center rounded-2xl bg-white px-4 py-16 text-center shadow-sm ring-1 ring-slate-200/80">
                <div className="flex size-12 items-center justify-center rounded-full bg-slate-100">
                  <Inbox className="size-6 text-slate-400" aria-hidden />
                </div>
                <h3 className="mt-3 text-base font-semibold text-slate-800">Başvuru bulunamadı</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Seçtiğiniz filtrelere uyan herhangi bir kayıt mevcut değil.
                </p>
                {(activeCount > 0 || filters.q) && (
                  <button
                    type="button"
                    onClick={reset}
                    className="mt-4 rounded-lg bg-brand-50 px-3.5 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition-colors"
                  >
                    Filtreleri Temizle
                  </button>
                )}
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}