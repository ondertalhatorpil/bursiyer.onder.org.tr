import clsx from 'clsx';

/** Çok satırlı metin. react-hook-form register() ile kullanılır. */
export default function Textarea({ invalid, className, ref, rows = 4, ...rest }) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={clsx(
        'w-full rounded-xl bg-white px-3.5 py-2.5 text-[15px] leading-relaxed text-slate-900 ring-1 ring-inset transition',
        'placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:bg-slate-100',
        invalid ? 'ring-accent-500 focus:ring-accent-500' : 'ring-slate-300 focus:ring-brand-500',
        className,
      )}
      {...rest}
    />
  );
}
