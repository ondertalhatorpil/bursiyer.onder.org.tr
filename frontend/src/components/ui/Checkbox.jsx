import clsx from 'clsx';

/** Onay kutusu. children = etiket metni (link içerebilir). */
export default function Checkbox({ id, invalid, children, className, ref, ...rest }) {
  return (
    <label htmlFor={id} className={clsx('flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-slate-700', className)}>
      <input
        id={id}
        ref={ref}
        type="checkbox"
        className={clsx(
          'mt-0.5 size-5 shrink-0 cursor-pointer rounded-md border-slate-300 accent-brand-700',
          invalid && 'outline-2 outline-accent-500',
        )}
        {...rest}
      />
      <span>{children}</span>
    </label>
  );
}
