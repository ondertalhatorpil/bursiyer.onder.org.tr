import clsx from 'clsx';

export default function Card({ className, children, as: Tag = 'section', ...rest }) {
  return (
    <Tag className={clsx('rounded-[var(--radius-card)] bg-white ring-1 ring-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.04)]', className)} {...rest}>
      {children}
    </Tag>
  );
}

export function CardHeader({ title, description, eyebrow, actions, className }) {
  return (
    <div className={clsx('flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-7 sm:py-5', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent-600">{eyebrow}</p>}
        <h2 className="text-lg font-bold sm:text-xl">{title}</h2>
        {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

export function CardBody({ className, children }) {
  return <div className={clsx('px-5 py-5 sm:px-7 sm:py-6', className)}>{children}</div>;
}

export function CardFooter({ className, children }) {
  return (
    <div className={clsx('flex flex-col-reverse gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7', className)}>
      {children}
    </div>
  );
}
