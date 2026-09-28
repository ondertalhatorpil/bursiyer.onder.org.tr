import { Navigate } from 'react-router';
import { PageSpinner } from '../../components/ui';
import { useApplication } from '../../hooks/useApplication';
import { STEP_ROUTES } from '../../config';

/** /basvuru -> adayın kaldığı adıma yönlendirir */
export default function ApplyIndex() {
  const { application, isLoading } = useApplication();
  if (isLoading || !application) return <PageSpinner />;
  if (application.status !== 'draft') return <Navigate to="/basvuru/durum" replace />;
  const step = Math.min(Math.max(application.currentStep, 3), 7);
  return <Navigate to={STEP_ROUTES[step]} replace />;
}
