import clsx from 'clsx';
import { Check, Lock } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router';
import { APPLICATION_STEPS, STEP_ROUTES } from '../../../config';

/**
 * Adım listesi. Tamamlanan adımlar tik alır; henüz ulaşılmamış adımlar kilitlidir.
 * Masaüstünde sol sütunda dikey, mobilde üstte yatay kaydırılabilir.
 */
export default function StepNav({ application }) {
  const { steps = {}, currentStep = 3 } = application;
  const listRef = useRef(null);
  const { pathname } = useLocation();

  // Mobilde yatay listede aktif adımı görünür alana kaydır
  useEffect(() => {
    const list = listRef.current;
    const active = list?.querySelector('[aria-current="page"]');
    if (list && active && list.scrollWidth > list.clientWidth) {
      list.scrollTo({ left: active.offsetLeft - list.clientWidth / 2 + active.clientWidth / 2, behavior: 'smooth' });
    }
  }, [pathname]);

  return (
    <nav aria-label="Başvuru adımları">
      <ol ref={listRef} className="flex gap-1 overflow-x-auto pb-2 [scrollbar-width:none] lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
        {APPLICATION_STEPS.map(({ step, title }) => {
          const done = !!steps[step];
          const reachable = step >= 3 && step <= Math.max(currentStep, 3);
          const route = STEP_ROUTES[step];
          const inner = (isActive) => (
            <>
              <span
                className={clsx(
                  'grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold transition',
                  isActive ? 'bg-brand-700 text-white ring-4 ring-brand-100'
                    : done ? 'bg-emerald-100 text-emerald-700'
                      : reachable ? 'bg-white text-brand-700 ring-1 ring-brand-200' : 'bg-slate-100 text-slate-400',
                )}
              >
                {done && !isActive ? <Check className="size-4" aria-hidden /> : !reachable && step > 2 ? <Lock className="size-3.5" aria-hidden /> : step}
              </span>
              <span className={clsx('whitespace-nowrap text-sm font-semibold lg:whitespace-normal', isActive ? 'text-brand-900' : reachable || done ? 'text-slate-700' : 'text-slate-400')}>
                {title}
              </span>
            </>
          );
          const base = 'flex items-center gap-3 rounded-xl px-3 py-2';

          if (!route || !reachable) {
            return (
              <li key={step} className={clsx(base, 'shrink-0')} aria-disabled>
                {inner(false)}
              </li>
            );
          }
          return (
            <li key={step} className="shrink-0">
              <NavLink to={route} className={({ isActive }) => clsx(base, isActive ? 'bg-white shadow-sm ring-1 ring-slate-200' : 'hover:bg-white/70')}>
                {({ isActive }) => inner(isActive)}
              </NavLink>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
