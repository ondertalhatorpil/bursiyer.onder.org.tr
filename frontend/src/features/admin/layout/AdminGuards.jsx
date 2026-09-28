import { Navigate, Outlet, useLocation } from 'react-router';
import { PageSpinner } from '../../../components/ui';
import { can, useAdminSession } from '../../../hooks/useAdmin';

/** Admin oturumu zorunlu; şifre değiştirme zorunluysa önce oraya */
export function RequireAdmin() {
  const { admin, isLoading } = useAdminSession();
  const { pathname, search } = useLocation();
  if (isLoading) return <PageSpinner />;
  if (!admin) return <Navigate to="/admin/giris" replace state={{ from: pathname + search }} />;
  if (admin.mustChangePassword && pathname !== '/admin/sifre') return <Navigate to="/admin/sifre" replace />;
  return <Outlet />;
}

export function RedirectIfAdmin() {
  const { admin, isLoading } = useAdminSession();
  const { state } = useLocation();
  if (isLoading) return <PageSpinner />;
  if (admin) return <Navigate to={admin.mustChangePassword ? '/admin/sifre' : (state?.from || '/admin')} replace />;
  return <Outlet />;
}

/** Yetkisi olmayan sayfaya girilirse genel bakışa döner */
export function RequirePermission({ permission }) {
  const { admin } = useAdminSession();
  if (!can(admin, permission)) return <Navigate to="/admin" replace />;
  return <Outlet />;
}
