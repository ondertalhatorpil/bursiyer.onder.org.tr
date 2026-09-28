import clsx from 'clsx';

/**
 * Form alanı çerçevesi: etiket, zorunlu işareti, açıklama ve hata mesajı.
 * İçine TextInput / MaskedInput / Select vb. konur.
 */
export default function Field({ label, htmlFor, required, hint, error, className, children }) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;
  return (
    <div className={clsx('flex min-w-0 flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-semibold text-slate-800">
          {label}
          {required && <span className="ml-0.5 text-accent-600" aria-hidden>*</span>}
        </label>
      )}
      {typeof children === 'function' ? children({ 'aria-describedby': [hintId, errorId].filter(Boolean).join(' ') || undefined, 'aria-invalid': !!error }) : children}
      {hint && !error && <p id={hintId} className="text-xs text-slate-500">{hint}</p>}
      {error && <p id={errorId} className="text-xs font-medium text-accent-600">{error}</p>}
    </div>
  );
}

/** Input'ların ortak görünümü */
export const inputClass = (invalid) => clsx(
  'h-11 w-full rounded-xl bg-white px-3.5 text-[15px] text-slate-900 ring-1 ring-inset transition',
  'placeholder:text-slate-400 focus:outline-none focus:ring-2',
  'disabled:bg-slate-100 disabled:text-slate-500',
  invalid ? 'ring-accent-500 focus:ring-accent-500' : 'ring-slate-300 focus:ring-brand-500',
);
