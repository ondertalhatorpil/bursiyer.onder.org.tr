import { Navigate, Outlet, useLocation } from 'react-router';
import Container from '../../components/layout/Container';
import { Alert, Badge, Button, PageSpinner } from '../../components/ui';
import StepNav from './shared/StepNav';
import { useApplication } from '../../hooks/useApplication';
import { STATUS_TONES } from '../../config';

/**
 * Başvuru ekranlarının ortak düzeni: solda adım listesi, sağda aktif adım.
 * Gönderilmiş başvuru düzenlenemez; durum sayfasına yönlendirilir.
 */
export default function ApplyLayout() {
  const { application, isLoading, error, refetch } = useApplication();
  const { pathname } = useLocation();

  if (isLoading) return <PageSpinner />;
  if (error) {
    return (
      <Container size="md">
        <Alert variant="error" title="Başvuru bilgileri alınamadı" action={<Button onClick={() => refetch()}>Tekrar dene</Button>}>
          {error.message}
        </Alert>
      </Container>
    );
  }

  const onStatusPage = pathname.startsWith('/basvuru/durum');
  if (application.status !== 'draft' && !onStatusPage) return <Navigate to="/basvuru/durum" replace />;
  if (application.status === 'draft' && onStatusPage) return <Navigate to="/basvuru" replace />;
  if (onStatusPage) return <Container size="md"><Outlet /></Container>;

  return (
    <Container size="xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{application.program?.title}</p>
          <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">Burs Başvurusu</h1>
        </div>
        <Badge tone={STATUS_TONES[application.status]} dot>{application.statusLabel}</Badge>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8">
        <aside className="min-w-0 lg:sticky lg:top-28 lg:self-start">
          <StepNav application={application} />
        </aside>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </Container>
  );
}
