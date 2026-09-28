import { Card, CardBody } from '../../../components/ui';

/** Başlık + etiket/değer listesi. Boş değerler gösterilmez. */
export default function InfoSection({ title, rows, children, action }) {
  const visible = (rows || []).filter((r) => r && r.value !== undefined && r.value !== null && r.value !== '');
  return (
    <Card>
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
        <h2 className="text-base font-bold">{title}</h2>
        {action}
      </div>
      <CardBody className="!py-4">
        {visible.length > 0 && (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            {visible.map((r) => (
              <div key={r.label} className={r.wide ? 'min-w-0 sm:col-span-2' : 'min-w-0'}>
                <dt className="text-xs font-medium text-slate-500">{r.label}</dt>
                <dd className="mt-0.5 break-words text-slate-900">{r.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {children}
      </CardBody>
    </Card>
  );
}
