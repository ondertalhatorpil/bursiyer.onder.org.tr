/** Yatay çubuk listesi (kategori / kanal dağılımı). Değer çubuğun ucunda, metin koyu renkte. */
export default function BarList({ items = [], empty = 'Henüz veri yok' }) {
  if (!items.length) return <p className="text-sm text-slate-500">{empty}</p>;
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <ul className="space-y-3">
      {items.map((i) => (
        <li key={i.label}>
          <div className="mb-1 flex justify-between gap-3 text-sm">
            <span className="truncate text-slate-700">{i.label}</span>
            <span className="font-semibold tabular-nums text-slate-900">{i.count.toLocaleString('tr-TR')}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-brand-500" style={{ width: `${(i.count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
