import { Link, useLocation } from 'react-router';
import clsx from 'clsx';
import { LogOut } from 'lucide-react';
import { useLogout, useSession } from '../../hooks/useSession';
import { NAV } from '../../config';

/**
 * Ortada, arka plansız ikon menüsü.
 *   variant="plain"  düz sayfalarda: kırmızı çizgi ikonlar
 *   variant="solid"  görsel üstünde: kırmızı dolgulu kareler
 */
export default function SiteHeader({ variant = 'plain', className }) {
  const { me } = useSession();
  const logout = useLogout();
  const { pathname } = useLocation();

  const items = [...NAV];
  if (me) items.push({ icon: LogOut, label: 'Çıkış', onClick: () => logout.mutate() });

  const isActive = (to) => to && !/^(https?:|mailto:)/.test(to) && (to === '/' ? pathname === '/' : pathname.startsWith(to));

  return (
    <header className={clsx('z-40 flex justify-center px-4 py-5 sm:py-6', className)}>
      <nav aria-label="Ana menü">
        <ul className={clsx('flex items-center', variant === 'solid' ? 'gap-3 sm:gap-4' : 'gap-6 sm:gap-12')}>
          {items.map((item) => (
            <li key={item.label}>
              <NavItem item={item} variant={variant} active={isActive(item.to)} />
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

function NavItem({ item, variant, active }) {
  const { icon: Icon, label, to, onClick } = item;

  const cls = clsx(
    'group relative grid place-items-center transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600',
    variant === 'solid'
      ? clsx(
        'size-12 rounded-xl bg-brand-700 text-white shadow-lg shadow-brand-900/20 hover:-translate-y-0.5 hover:bg-brand-800 sm:size-14',
        active && 'ring-2 ring-white/80 ring-offset-2 ring-offset-transparent',
      )
      : clsx(
        'size-10 rounded-xl text-brand-700 hover:-translate-y-0.5 hover:bg-brand-50',
        active && 'bg-brand-50',
      ),
  );

  const content = (
    <>
      <Icon className={variant === 'solid' ? 'size-6' : 'size-7'} strokeWidth={1.75} aria-hidden />
      {/* Üzerine gelince etiket */}
      <span className="pointer-events-none absolute top-full mt-2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
        {label}
      </span>
    </>
  );

  if (onClick) {
    return <button type="button" onClick={onClick} aria-label={label} className={cls}>{content}</button>;
  }
  if (/^(https?:|mailto:)/.test(to)) {
    return (
      <a href={to} aria-label={label} className={cls} {...(to.startsWith('http') && { target: '_blank', rel: 'noreferrer' })}>
        {content}
      </a>
    );
  }
  return <Link to={to} aria-label={label} aria-current={active ? 'page' : undefined} className={cls}>{content}</Link>;
}