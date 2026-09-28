import { Link } from 'react-router';
import clsx from 'clsx';

/** Tek bir sayı + etiket. `to` verilirse ilgili filtreli listeye gider. */
export default function StatTile({ label, value, to, hint, emphasis }) {
  const body = (
    <>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={clsx('mt-1 text-3xl font-extrabold tabular-nums', emphasis ? 'text-brand-800' : 'text-slate-900')}>
        {value?.toLocaleString('tr-TR') ?? '—'}
      </p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </>
  );
  const cls = 'block rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:p-5';
  return to ? <Link to={to} className={clsx(cls, 'transition hover:ring-brand-300')}>{body}</Link> : <div className={cls}>{body}</div>;
}
