import { useEffect, useId, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { Check, ChevronDown, Search } from 'lucide-react';
import { inputClass } from './Field';

const norm = (s) => String(s).toLocaleLowerCase('tr-TR')
  .replace(/[çğıöşü]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' }[c]));

/**
 * Aranabilir seçim kutusu (okul, üniversite gibi uzun listeler için).
 * Türkçe karakterden bağımsız arar ("uskudar" -> "Üsküdar").
 *
 * options: [{ value, label, sublabel? }]
 * footer:  listenin altına sabit öğe (ör. "Listede yok, elle yazacağım")
 */
export default function SearchSelect({
  id, options = [], value, onChange, placeholder = 'Seçin', searchPlaceholder = 'Aramak için yazın…',
  invalid, disabled, loading, emptyText = 'Sonuç bulunamadı', footer,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const listId = useId();

  const selected = options.find((o) => String(o.value) === String(value));
  const filtered = useMemo(() => {
    const q = norm(query.trim());
    const list = q ? options.filter((o) => norm(`${o.label} ${o.sublabel || ''}`).includes(q)) : options;
    return list.slice(0, 200);
  }, [options, query]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => { if (open) { setActive(0); inputRef.current?.focus(); } }, [open]);

  const choose = (o) => { onChange(o.value); setOpen(false); setQuery(''); };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    if (e.key === 'Enter' && filtered[active]) { e.preventDefault(); choose(filtered[active]); }
    if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={invalid || undefined}
        className={clsx(inputClass(invalid), 'flex items-center justify-between gap-2 text-left')}
      >
        <span className={clsx('min-w-0 truncate', !selected && 'text-slate-400')}>
          {selected ? selected.label : loading ? 'Yükleniyor…' : placeholder}
        </span>
        <ChevronDown className="size-5 shrink-0 text-slate-400" aria-hidden />
      </button>

      {open && (
        <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-slate-200">
          <div className="flex items-center gap-2 border-b border-slate-100 px-3">
            <Search className="size-4 text-slate-400" aria-hidden />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActive(0); }}
              onKeyDown={onKeyDown}
              placeholder={searchPlaceholder}
              role="combobox"
              aria-controls={listId}
              aria-expanded
              className="h-11 w-full bg-transparent text-[15px] focus:outline-none"
            />
          </div>
          <ul id={listId} role="listbox" className="max-h-72 overflow-y-auto py-1">
            {filtered.length === 0 && <li className="px-4 py-3 text-sm text-slate-500">{emptyText}</li>}
            {filtered.map((o, i) => {
              const isSel = String(o.value) === String(value);
              return (
                <li
                  key={o.value}
                  role="option"
                  aria-selected={isSel}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => { e.preventDefault(); choose(o); }}
                  className={clsx('flex cursor-pointer items-start gap-2 px-4 py-2.5 text-sm', i === active && 'bg-brand-50')}
                >
                  <Check className={clsx('mt-0.5 size-4 shrink-0 text-brand-600', !isSel && 'invisible')} aria-hidden />
                  <span>
                    <span className="block text-slate-900">{o.label}</span>
                    {o.sublabel && <span className="block text-xs text-slate-500">{o.sublabel}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
          {footer && <div className="border-t border-slate-100 p-2">{typeof footer === 'function' ? footer(() => setOpen(false)) : footer}</div>}
        </div>
      )}
    </div>
  );
}
