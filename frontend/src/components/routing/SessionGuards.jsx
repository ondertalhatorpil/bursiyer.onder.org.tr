import { Navigate, Outlet, useLocation } from 'react-router';
import { useSession } from '../../hooks/useSession';
import { PageSpinner } from '../ui';

/** Oturum gerektiren sayfalar: oturum yoksa girişe yönlendirir */
export function RequireSession() {
  const { me, isLoading } = useSession();
  const location = useLocation();
  if (isLoading) return <PageSpinner />;
  if (!me) return <Navigate to="/giris" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

/** Kayıt/giriş sayfaları: zaten oturum varsa başvuruya yönlendirir */
export function RedirectIfSession() {
  const { me, isLoading } = useSession();
  if (isLoading) return <PageSpinner />;
  if (me) return <Navigate to="/basvuru" replace />;
  return <Outlet />;
}
