import clsx from 'clsx';

export default function Spinner({ className, label }) {
  return (
    <span role={label ? 'status' : undefined} className="inline-flex items-center gap-2">
      <svg className={clsx('animate-spin', className || 'size-5')} viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
        <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {label && <span className="text-sm text-slate-600">{label}</span>}
    </span>
  );
}

/** Sayfa yüklenirken ortada gösterilen spinner */
export function PageSpinner({ label = 'Yükleniyor…' }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-brand-600">
      <Spinner className="size-7" label={label} />
    </div>
  );
}
