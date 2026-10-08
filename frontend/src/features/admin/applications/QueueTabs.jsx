import clsx from 'clsx';

/** Sekmenin şu anki filtrelerle eşleşip eşleşmediği (statü + yurt öneri aşaması) */
const matches = (queue, filters) => ['status', 'yurtStage'].every((k) => (queue.filter[k] || '') === (filters[k] || ''));

/**
 * Hızlı sekmeler (sayılarıyla). Kullanıcının sırasındaki işler ("mine") vurgulu ve başta gösterilir.
 * Sekme seçilince statü ve öneri aşaması filtresi sekmeninkiyle değişir, diğer filtreler korunur.
 */
export default function QueueTabs({ queues = [], filters, setFilter }) {
  if (!queues.length) return null;
  return (
    <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
      <ul className="flex gap-1.5 pb-1" role="tablist" aria-label="Hızlı sekmeler">
        {queues.map((q) => {
          const active = matches(q, filters);
          return (
            <li key={q.key} className="shrink-0">
              <button type="button" role="tab" aria-selected={active}
                onClick={() => setFilter({ status: q.filter.status || '', yurtStage: q.filter.yurtStage || '' })}
                className={clsx(
                  'inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-sm font-semibold ring-1 ring-inset transition-colors',
                  active ? 'bg-brand-700 text-white ring-brand-700'
                    : q.mine ? 'bg-brand-50 text-brand-800 ring-brand-200 hover:bg-brand-100'
                      : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50',
                )}>
                {q.label}
                <span className={clsx(
                  'min-w-6 rounded-full px-1.5 text-center text-xs tabular-nums',
                  active ? 'bg-white/20 text-white' : q.mine && q.count ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-600',
                )}>
                  {q.count}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
