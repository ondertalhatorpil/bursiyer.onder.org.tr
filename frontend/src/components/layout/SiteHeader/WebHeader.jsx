import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { LogOut } from 'lucide-react';
import { useLogout, useSession } from '../../../hooks/useSession';
import { NAV } from '../../../config';

export default function WebHeader({ variant = 'plain', className }) {
  const { me } = useSession();
  const logout = useLogout();
  const { pathname } = useLocation();

  const [isScrolled, setIsScrolled] = useState(false);
  const [hoveredLabel, setHoveredLabel] = useState(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const items = [...NAV];
  if (me) items.push({ icon: LogOut, label: 'Çıkış', onClick: () => logout.mutate() });

  const isActive = (to) => to && !/^(https?:|mailto:)/.test(to) && (to === '/' ? pathname === '/' : pathname.startsWith(to));

  return (
    <motion.header
      className={clsx('fixed top-0 left-0 w-full z-40 transition-all duration-300', className)}
      animate={{
        paddingTop: isScrolled ? '1rem' : '1.5rem',
        paddingBottom: isScrolled ? '1rem' : '1.5rem',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 flex justify-center items-center">
        <nav aria-label="Ana menü">
          <ul
            className="flex items-center space-x-2 relative"
            onMouseLeave={() => setHoveredLabel(null)}
          >
            {items.map((item) => {
              const active = isActive(item.to);
              return (
                <li key={item.label} className="relative">
                  <NavItem
                    item={item}
                    variant={variant}
                    active={active}
                    isScrolled={isScrolled}
                    isHovered={hoveredLabel === item.label}
                    onMouseEnter={() => setHoveredLabel(item.label)}
                  />
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </motion.header>
  );
}

function NavItem({ item, variant, active, isScrolled, isHovered, onMouseEnter }) {
  const { icon: Icon, label, to, onClick } = item;

  const cls = clsx(
    'relative group grid place-items-center p-3 rounded-xl transition-all duration-300 z-10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600',
    variant === 'solid'
      ? clsx(
          'size-12 sm:size-14 bg-brand-700 text-white shadow-lg shadow-brand-900/20 hover:-translate-y-0.5',
          active && 'ring-2 ring-white/80 ring-offset-2 ring-offset-transparent'
        )
      : clsx(
          'size-10 sm:size-12 text-brand-700',
          isScrolled
            ? 'bg-brand-700 text-white shadow-lg border border-brand-700'
            : 'bg-transparent',
          active && !isScrolled && 'bg-brand-50'
        )
  );

  const content = (
    <>
      {/* Magic Ink Arka Plan Animasyonu */}
      {isHovered && (
        <motion.div
          layoutId="magic-ink"
          className="absolute inset-0 bg-brand-700 rounded-xl z-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        />
      )}

      {/* İkon */}
      <span className={clsx('relative z-10 transition-colors', isHovered ? 'text-white' : '')}>
        <Icon className={variant === 'solid' ? 'size-6' : 'size-7'} strokeWidth={1.75} aria-hidden />
      </span>

      {/* Tooltip Etiket */}
      <span className="pointer-events-none absolute top-full mt-2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 z-20">
        {label}
      </span>
    </>
  );

  if (onClick) {
    return <button type="button" onClick={onClick} onMouseEnter={onMouseEnter} aria-label={label} className={cls}>{content}</button>;
  }
  if (/^(https?:|mailto:)/.test(to)) {
    return (
      <a href={to} onMouseEnter={onMouseEnter} aria-label={label} className={cls} {...(to.startsWith('http') && { target: '_blank', rel: 'noreferrer' })}>
        {content}
      </a>
    );
  }
  return <Link to={to} onMouseEnter={onMouseEnter} aria-label={label} aria-current={active ? 'page' : undefined} className={cls}>{content}</Link>;
}