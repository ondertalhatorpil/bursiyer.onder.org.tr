import { PencilLine } from 'lucide-react';
import { Button } from '../../../components/ui';

/** Özet ekranında bir bölüm: başlık, düzenle bağlantısı ve etiket/değer satırları */
export default function SummarySection({ title, editTo, rows = [], children }) {
  const visible = rows.filter(([, v]) => v !== undefined && v !== null && v !== '');
  return (
    <section className="rounded-xl ring-1 ring-inset ring-slate-200">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
        <h3 className="font-bold text-brand-900">{title}</h3>
        {editTo && <Button to={editTo} variant="ghost" size="sm" icon={PencilLine}>Düzenle</Button>}
      </div>
      <div className="px-4 py-3 sm:px-5">
        {visible.length > 0 && (
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            {visible.map(([label, value]) => (
              <div key={label}>
                <dt className="text-slate-500">{label}</dt>
                <dd className="mt-0.5 font-medium text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
        )}
        {children}
      </div>
    </section>
  );
}
