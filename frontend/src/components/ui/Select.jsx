import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';
import { inputClass } from './Field';

/**
 * Native select (mobilde işletim sisteminin seçicisini açar).
 * options: [{ value, label }]
 */
export default function Select({ options = [], placeholder = 'Seçin', invalid, className, ref, value, ...rest }) {
  return (
    <div className="relative">
      <select
        ref={ref}
        value={value ?? ''}
        className={clsx(inputClass(invalid), 'appearance-none pr-10', !value && 'text-slate-400', className)}
        {...rest}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value} className="text-slate-900">{o.label}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" aria-hidden />
    </div>
  );
}
