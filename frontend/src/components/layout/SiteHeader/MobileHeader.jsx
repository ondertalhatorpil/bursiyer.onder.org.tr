import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { LogOut, Menu, X } from 'lucide-react';
import { useLogout, useSession } from '../../../hooks/useSession';
import { NAV } from '../../../config';

const mobileMenuVariant = {
  hidden: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.2, ease: 'easeOut' },
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: 'easeIn',
      staggerChildren: 0.05,
    },
  },
};

const mobileItemVariant = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0 },
};

const tooltipVariant = {
  hidden: { opacity: 0, y: -5, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1 },
};

export default function MobileHeader({ className }) {
  const { me } = useSession();
  const logout = useLogout();
  const { pathname } = useLocation();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hoveredLabel, setHoveredLabel] = useState(null);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    setHoveredLabel(null);
  };

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : 'auto';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isMenuOpen]);

  const items = [...NAV];
  if (me) items.push({ icon: LogOut, label: 'Çıkış', onClick: () => logout.mutate() });

  const isActive = (to) => to && !/^(https?:|mailto:)/.test(to) && (to === '/' ? pathname === '/' : pathname.startsWith(to));

  return (
    <div className={clsx('fixed top-5 left-0 w-full z-50 px-4 md:hidden', className)}>
      <div className="relative flex flex-col items-center">
        {/* Hamburger Butonu */}
        <button
          className="p-3 text-white flex items-center justify-center rounded-full transition-all duration-300 z-50 shadow-lg bg-brand-700 hover:bg-brand-800 border border-brand-700"
          onClick={toggleMenu}
          aria-label="Menüyü aç/kapat"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={isMenuOpen ? 'x' : 'menu'}
              initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
              transition={{ duration: 0.2 }}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </motion.div>
          </AnimatePresence>
        </button>

        {/* Yatay Kapsül Menü */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              className="absolute top-full mt-3 bg-brand-700/95 backdrop-blur-md rounded-full shadow-2xl border border-brand-700 overflow-visible"
              variants={mobileMenuVariant}
              initial="hidden"
              animate="visible"
              exit="hidden"
              onMouseLeave={() => setHoveredLabel(null)}
            >
              <motion.ul className="flex flex-row p-1.5 space-x-1" variants={mobileMenuVariant}>
                {items.map((item) => (
                  <motion.li key={item.label} variants={mobileItemVariant} className="relative">
                    {/* Tooltip */}
                    <AnimatePresence>
                      {hoveredLabel === item.label && (
                        <motion.div
                          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-0.5 bg-slate-900 text-white text-xs font-semibold rounded-md shadow-md whitespace-nowrap z-20 pointer-events-none"
                          variants={tooltipVariant}
                          initial="hidden"
                          animate="visible"
                          exit="hidden"
                        >
                          {item.label}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <MobileNavItem
                      item={item}
                      active={isActive(item.to)}
                      onMouseEnter={() => setHoveredLabel(item.label)}
                      onClickClose={() => {
                        setIsMenuOpen(false);
                        setHoveredLabel(null);
                      }}
                    />
                  </motion.li>
                ))}
              </motion.ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function MobileNavItem({ item, active, onMouseEnter, onClickClose }) {
  const { icon: Icon, label, to, onClick } = item;

  const cls = clsx(
    'flex items-center justify-center size-11 text-white rounded-full transition-colors duration-200 hover:bg-white/20',
    active && 'bg-white/25 ring-1 ring-white/50'
  );

  const handleClick = (e) => {
    onClickClose();
    if (onClick) onClick(e);
  };

  if (onClick) {
    return (
      <button type="button" onClick={handleClick} onMouseEnter={onMouseEnter} aria-label={label} className={cls}>
        <Icon size={20} />
      </button>
    );
  }

  if (/^(https?:|mailto:)/.test(to)) {
    return (
      <a href={to} onClick={onClickClose} onMouseEnter={onMouseEnter} aria-label={label} className={cls} {...(to.startsWith('http') && { target: '_blank', rel: 'noreferrer' })}>
        <Icon size={20} />
      </a>
    );
  }

  return (
    <Link to={to} onClick={onClickClose} onMouseEnter={onMouseEnter} aria-label={label} aria-current={active ? 'page' : undefined} className={cls}>
      <Icon size={20} />
    </Link>
  );
}