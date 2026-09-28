import clsx from 'clsx';
import { CircleCheck } from 'lucide-react';

/**
 * Büyük tıklanabilir seçenek kartları (kategori, kanal, bölge seçimi).
 * options: [{ value, label, description?, icon? }]
 */
export default function RadioCardGroup({ name, options, value, onChange, columns = 2, invalid, size = 'md', disabled }) {
  return (
    <div role="radiogroup" className={clsx('grid gap-3', columns === 2 && 'sm:grid-cols-2', columns === 3 && 'sm:grid-cols-3', columns === 4 && 'sm:grid-cols-2 lg:grid-cols-4')}>
      {options.map((o) => {
        const checked = String(o.value) === String(value);
        const Icon = o.icon;
        return (
          <label
            key={o.value}
            className={clsx(
              'relative flex gap-3 rounded-xl bg-white ring-1 ring-inset transition',
              disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
              size === 'sm' ? 'p-3' : 'p-4',
              checked ? 'ring-2 ring-brand-600 bg-brand-50/60' : invalid ? 'ring-accent-400' : 'ring-slate-200 hover:ring-slate-300',
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={checked}
              onChange={() => onChange(o.value)}
              disabled={disabled}
              className="sr-only"
            />
            {Icon && (
              <span className={clsx('grid size-10 shrink-0 place-items-center rounded-lg', checked ? 'bg-brand-700 text-white' : 'bg-brand-50 text-brand-700')}>
                <Icon className="size-5" aria-hidden />
              </span>
            )}
            <span className="min-w-0 flex-1 pr-6">
              <span className="block font-semibold text-slate-900">{o.label}</span>
              {o.description && <span className="mt-0.5 block text-sm text-slate-600">{o.description}</span>}
            </span>
            <CircleCheck className={clsx('absolute right-3 top-3 size-5 text-brand-600 transition', !checked && 'opacity-0')} aria-hidden />
          </label>
        );
      })}
    </div>
  );
}
