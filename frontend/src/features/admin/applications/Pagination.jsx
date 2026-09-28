import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../../components/ui';

export default function Pagination({ page, totalPages, total, pageSize, onChange, unit = 'başvuru' }) {
  if (!total) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
      <p><span className="tabular-nums">{from}–{to}</span> / <span className="tabular-nums">{total.toLocaleString('tr-TR')}</span> {unit}</p>
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => onChange(page - 1)}>Önceki</Button>
          <span className="tabular-nums">{page} / {totalPages}</span>
          <Button variant="secondary" size="sm" iconRight={ChevronRight} disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Sonraki</Button>
        </div>
      )}
    </div>
  );
}
