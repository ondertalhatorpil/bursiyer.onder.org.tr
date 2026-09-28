import { NavLink, Outlet } from 'react-router';
import clsx from 'clsx';

const TABS = [
  { to: '/admin/ayarlar', label: 'Başvuru dönemi', end: true },
  { to: '/admin/ayarlar/onay-metinleri', label: 'Onay metinleri' },
  { to: '/admin/ayarlar/ekran-metinleri', label: 'Ekran metinleri' },
  { to: '/admin/ayarlar/sms', label: 'SMS şablonları' },
];

export default function SettingsLayout() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">Ayarlar</h1>
        <p className="text-sm text-slate-500">Değişiklikler kaydedildiği anda başvuru formuna yansır.</p>
      </div>
      <nav className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label="Ayar bölümleri">
        <ul className="flex w-max gap-1 rounded-xl bg-white p-1 ring-1 ring-slate-200">
          {TABS.map((t) => (
            <li key={t.to}>
              <NavLink to={t.to} end={t.end}
                className={({ isActive }) => clsx('block whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-semibold transition',
                  isActive ? 'bg-brand-700 text-white' : 'text-slate-600 hover:bg-slate-100')}>
                {t.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <Outlet />
    </div>
  );
}
