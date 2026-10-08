import { Navigate, useLocation } from 'react-router';
import { useApplication } from '../../../hooks/useApplication';
import { stepRoutesFor } from '../../../config';

/**
 * Henüz ulaşılmamış bir adımın adresine doğrudan gidilirse kaldığı adıma döndürür.
 * Adımın numarası adresten, kategorinin adım listesine göre bulunur; kategoride olmayan bir adımın
 * adresi açılırsa (ör. Yurt Konaklama Bursu'nda kanal / belgeler) yine kaldığı adıma döndürür.
 */
export default function RequireStep({ children }) {
  const { application } = useApplication();
  const { pathname } = useLocation();
  if (!application) return children;

  const routes = stepRoutesFor(application.category);
  const current = Math.min(Math.max(application.currentStep, 3), 7);
  const path = pathname.replace(/\/+$/, '');
  const step = Number(Object.keys(routes).find((s) => routes[s] === path));
  if (!step || step > current) return <Navigate to={routes[current]} replace />;
  return children;
}
