import { Navigate } from 'react-router';
import { useApplication } from '../../../hooks/useApplication';
import { STEP_ROUTES } from '../../../config';

/** Henüz ulaşılmamış bir adımın adresine doğrudan gidilirse kaldığı adıma döndürür */
export default function RequireStep({ step, children }) {
  const { application } = useApplication();
  if (application && step > Math.max(application.currentStep, 3)) {
    return <Navigate to={STEP_ROUTES[Math.max(application.currentStep, 3)]} replace />;
  }
  return children;
}
