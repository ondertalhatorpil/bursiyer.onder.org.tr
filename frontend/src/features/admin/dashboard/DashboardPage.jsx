import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router';
import { MessageSquareText, TriangleAlert } from 'lucide-react';
import { Alert, Card, CardBody, CardHeader, PageSpinner } from '../../../components/ui';
import StatTile from './StatTile';
import DailyChart from './DailyChart';
import BarList from './BarList';
import { adminApi } from '../../../api/adminEndpoints';
import ProgramSelect from '../shared/ProgramSelect';

/** Genel bakış: statü sayıları, günlük başvuru, kategori/kanal dağılımı, işaretler */
export default function DashboardPage() {
  // Dönem seçimi adres çubuğunda (boş = en son dönem); listeye giden bağlantılar da dönemi taşır
  const [params, setParams] = useSearchParams();
  const programId = params.get('programId') || '';
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'dashboard', programId],
    queryFn: () => adminApi.dashboard(programId || undefined),
    refetchInterval: 60_000,
  });
  if (isLoading) return <PageSpinner />;
  if (error) return <Alert variant="error">{error.message}</Alert>;

  const s = Object.fromEntries(data.status.map((x) => [x.code, x.count]));
  const list = (query = {}) => `/admin/basvurular?${new URLSearchParams({ ...(programId ? { programId } : {}), ...query })}`;
  const link = (status) => list({ status });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Genel Bakış</h1>
          <p className="text-sm text-slate-500">Veriler dakikada bir yenilenir.</p>
        </div>
        <ProgramSelect value={programId} onChange={(v) => setParams(v ? { programId: v } : {}, { replace: true })} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Gönderilen başvuru" value={data.totalSubmitted} to={list()} emphasis />
        <StatTile label="Yeni (incelenmedi)" value={s.submitted} to={link('submitted')} />
        <StatTile label="İncelemede" value={s.in_review} to={link('in_review')} />
        <StatTile label="Revize istendi" value={s.revision_requested} to={link('revision_requested')} />
        <StatTile label="Onaylandı, IBAN bekleniyor" value={s.approved} to={link('approved')} />
        <StatTile label="IBAN kontrolünde" value={s.iban_pending} to={link('iban_pending')} />
        <StatTile label="Kesinleşti (aktif bursiyer)" value={s.finalized} to={link('finalized')} />
        <StatTile label="Reddedildi" value={s.rejected} to={link('rejected')} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Günlük başvuru" description="Son 30 günde gönderilen başvurular" />
          <CardBody><DailyChart data={data.daily} /></CardBody>
        </Card>
        <Card>
          <CardHeader title="Kategoriler" description="Gönderilmiş başvurular" />
          <CardBody><BarList items={data.byCategory} /></CardBody>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Kanal / birim dağılımı" description="En çok başvuru alan 15" />
          <CardBody>
            <BarList items={data.byChannel.map((c) => ({ label: c.subUnit ? `${c.channel} · ${c.subUnit}` : c.channel, count: c.count }))} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="İşaretli başvurular" />
          <CardBody className="space-y-3">
            {!data.flags.length && <p className="text-sm text-slate-500">İşaretli başvuru yok.</p>}
            {data.flags.map((f) => (
              <Link key={f.code} to={list({ flag: f.code })} className="flex items-center justify-between rounded-xl bg-amber-50 px-4 py-3 text-sm ring-1 ring-amber-200">
                <span className="flex items-center gap-2 text-amber-900"><TriangleAlert className="size-4" aria-hidden />{f.label}</span>
                <span className="font-bold tabular-nums text-amber-900">{f.count}</span>
              </Link>
            ))}
            <p className="text-sm text-slate-500">Taslak (gönderilmemiş): <strong className="tabular-nums text-slate-700">{s.draft}</strong></p>
            {data.smsCredit != null && (
              <p className="flex items-center gap-2 text-sm text-slate-600"><MessageSquareText className="size-4" aria-hidden /> SMS kredisi: <strong className="tabular-nums">{data.smsCredit.toLocaleString('tr-TR')}</strong></p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
