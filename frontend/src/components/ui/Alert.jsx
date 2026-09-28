import clsx from 'clsx';
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';

const STYLES = {
  info: ['bg-brand-50 text-brand-900 ring-brand-200', Info, 'text-brand-600'],
  success: ['bg-emerald-50 text-emerald-900 ring-emerald-200', CircleCheck, 'text-emerald-600'],
  warning: ['bg-amber-50 text-amber-900 ring-amber-200', TriangleAlert, 'text-amber-600'],
  error: ['bg-accent-50 text-accent-700 ring-accent-100', CircleAlert, 'text-accent-600'],
};

export default function Alert({ variant = 'info', title, children, className, action }) {
  const [cls, Icon, iconCls] = STYLES[variant];
  return (
    <div role={variant === 'error' ? 'alert' : 'status'} className={clsx('flex gap-3 rounded-xl p-4 text-sm ring-1 ring-inset', cls, className)}>
      <Icon className={clsx('mt-0.5 size-5 shrink-0', iconCls)} aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={clsx(title && 'mt-1', 'leading-relaxed')}>{children}</div>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}
