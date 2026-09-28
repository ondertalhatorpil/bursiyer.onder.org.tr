import clsx from 'clsx';

/** Aç / kapat düğmesi (role="switch") */
export default function Switch({ checked, onChange, label, description, disabled, id }) {
  return (
    <label htmlFor={id} className={clsx('flex items-start gap-3', disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer')}>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={clsx('relative mt-0.5 inline-flex h-6 w-11 shrink-0 rounded-full transition-colors',
          checked ? 'bg-brand-700' : 'bg-slate-300')}
      >
        <span className={clsx('absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-5.5' : 'translate-x-0.5')} />
      </button>
      {(label || description) && (
        <span className="min-w-0">
          {label && <span className="block text-sm font-semibold text-slate-800">{label}</span>}
          {description && <span className="block text-xs text-slate-500">{description}</span>}
        </span>
      )}
    </label>
  );
}
