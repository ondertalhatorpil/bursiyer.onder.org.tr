import clsx from 'clsx';
import { Link } from 'react-router';
import Spinner from './Spinner';

const VARIANTS = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900 shadow-sm',
  secondary: 'bg-white text-brand-800 ring-1 ring-inset ring-slate-300 hover:bg-slate-50',
  ghost: 'text-brand-700 hover:bg-brand-50',
  danger: 'bg-accent-600 text-white hover:bg-accent-700',
};
const SIZES = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-5 text-[15px] gap-2',
  lg: 'h-13 px-7 text-base gap-2.5',
};

/**
 * Buton. `to` verilirse router linki olur. `loading` iken tıklanamaz ve spinner gösterir.
 */
export default function Button({
  variant = 'primary', size = 'md', loading = false, disabled, to, className, children, icon: Icon, iconRight: IconRight, type = 'button', ...rest
}) {
  const classes = clsx(
    'inline-flex items-center justify-center rounded-xl font-semibold transition-colors select-none',
    'disabled:cursor-not-allowed disabled:opacity-60',
    VARIANTS[variant], SIZES[size], className,
  );
  const content = (
    <>
      {loading ? <Spinner className="size-4" /> : Icon && <Icon className="size-[1.1em] shrink-0" aria-hidden />}
      <span>{children}</span>
      {IconRight && !loading && <IconRight className="size-[1.1em] shrink-0" aria-hidden />}
    </>
  );
  if (to) return <Link to={to} className={classes} {...rest}>{content}</Link>;
  return (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {content}
    </button>
  );
}
