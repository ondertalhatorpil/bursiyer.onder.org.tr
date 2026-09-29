import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { Building2, FileStack, History, KeyRound, LayoutDashboard, LogOut, Menu, Settings, Users, X } from 'lucide-react';
import Logo from '../../../components/layout/Logo';
import { Button } from '../../../components/ui';
import { adminAuthApi } from '../../../api/adminEndpoints';
import { ADMIN_KEY, can, useAdminSession } from '../../../hooks/useAdmin';

const NAV = [
  { to: '/admin', label: 'Genel Bakış', icon: LayoutDashboard, end: true },
  { to: '/admin/basvurular', label: 'Başvurular', icon: FileStack },
  { to: '/admin/firmalar', label: 'Burs Veren Firmalar', icon: Building2, permission: 'manage_settings' },
  { to: '/admin/ayarlar', label: 'Ayarlar', icon: Settings, permission: 'manage_settings' },
  { to: '/admin/kullanicilar', label: 'Kullanıcılar', icon: Users, permission: 'manage_users' },
  { to: '/admin/islem-kayitlari', label: 'İşlem kayıtları', icon: History, permission: 'manage_users' },
];

/** Admin paneli düzeni: solda menü, üstte kullanıcı bilgisi */
export default function AdminShell() {
  const { admin } = useAdminSession();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  // Oturum düşerse girişe
  useEffect(() => {
    const onUnauthorized = () => {
      qc.setQueryData(ADMIN_KEY, null);
      navigate('/admin/giris', { replace: true });
    };
    window.addEventListener('admin-unauthorized', onUnauthorized);
    return () => window.removeEventListener('admin-unauthorized', onUnauthorized);
  }, [qc, navigate]);

  const logout = async () => {
    await adminAuthApi.logout().catch(() => {});
    qc.setQueryData(ADMIN_KEY, null);
    qc.removeQueries({ queryKey: ['admin'] });
    navigate('/admin/giris', { replace: true });
  };

  const nav = (
    <nav className="space-y-1" aria-label="Admin menüsü">
      {NAV.filter((n) => !n.permission || can(admin, n.permission)).map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
          className={({ isActive }) => clsx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
            isActive ? 'bg-white/10 text-white' : 'text-brand-200 hover:bg-white/5 hover:text-white')}>
          <Icon className="size-5" aria-hidden /> {label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-dvh bg-slate-100 lg:grid lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className={clsx('fixed inset-y-0 left-0 z-40 w-64 flex-col bg-brand-900 p-4 lg:static lg:flex lg:w-auto', open ? 'flex' : 'hidden')}>
        <div className="mb-6 flex items-center justify-between rounded-xl bg-white px-3 py-2">
          <Logo className="h-9" />
          <button type="button" className="lg:hidden" onClick={() => setOpen(false)} aria-label="Menüyü kapat"><X className="size-5" /></button>
        </div>
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-brand-400">Burs Yönetimi</p>
        {nav}
        <div className="mt-auto rounded-xl bg-white/5 p-3 text-sm">
          <p className="font-semibold text-white">{admin?.fullName}</p>
          <p className="text-xs text-brand-300">{admin?.roleName}</p>
          <div className="mt-2 flex flex-wrap gap-x-4">
            <Link to="/admin/sifre" onClick={() => setOpen(false)} className="inline-flex h-9 items-center gap-1.5 text-sm font-semibold text-brand-200 hover:text-white">
              <KeyRound className="size-4" aria-hidden />Şifre değiştir
            </Link>
            <Button variant="ghost" size="sm" icon={LogOut} onClick={logout} className="!px-0 !text-brand-200 hover:!bg-transparent hover:!text-white">Çıkış</Button>
          </div>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={() => setOpen(false)} aria-hidden />}

      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:hidden">
          <button type="button" onClick={() => setOpen(true)} aria-label="Menüyü aç"><Menu className="size-6 text-brand-800" /></button>
          <span className="font-bold text-brand-900">Burs Yönetimi</span>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
