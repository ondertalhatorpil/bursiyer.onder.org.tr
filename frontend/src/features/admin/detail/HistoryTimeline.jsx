import { Card } from '../../../components/ui';
import { formatDateTime } from '../../../lib/format';

export default function HistoryTimeline({ history }) {
  return (
    <Card>
      <div className="border-b border-slate-100 px-5 py-3.5"><h2 className="text-base font-bold">Statü geçmişi</h2></div>
      <ol className="px-5 py-4">
        {[...history].reverse().map((h, i) => (
          <li key={`${h.at}-${i}`} className="relative border-l-2 border-slate-200 pb-4 pl-4 last:pb-0">
            <span className={`absolute -left-[7px] top-1 size-3 rounded-full ring-2 ring-white ${i === 0 ? 'bg-brand-600' : 'bg-slate-300'}`} aria-hidden />
            <p className="text-sm font-semibold text-slate-900">{h.toLabel}</p>
            <p className="text-xs text-slate-500">{h.actor} · {formatDateTime(h.at)}</p>
            {h.note && <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{h.note}</p>}
          </li>
        ))}
      </ol>
    </Card>
  );
}
