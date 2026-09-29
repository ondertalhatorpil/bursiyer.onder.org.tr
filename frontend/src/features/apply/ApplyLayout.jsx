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
    if (onStatusPage) {
  return (
    <section className="flex flex-1 flex-col pb-12">
      <Container size="md" className="my-auto w-full"><Outlet /></Container>
    </section>
  );
}
  }

  const onStatusPage = pathname.startsWith('/basvuru/durum');
  if (application.status !== 'draft' && !onStatusPage) return <Navigate to="/basvuru/durum" replace />;
  if (application.status === 'draft' && onStatusPage) return <Navigate to="/basvuru" replace />;
  if (onStatusPage) return <Container size="md"><Outlet /></Container>;
  return (
    <section className="flex flex-1 flex-col">
      <Container size="xl" className="my-auto w-full">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-14">
          <aside className="min-w-0 lg:sticky lg:top-28 lg:self-start">
            <StepNav application={application} />
          </aside>
          <div className="min-w-0">
            <Outlet />
          </div>
        </div>
      </Container>
    </section>
  );
}
