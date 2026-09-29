import { Link, useNavigate } from 'react-router';
import { Award, Building2, FileWarning, ShieldCheck, TriangleAlert, UserRound } from 'lucide-react';
import StatusBadge from '../shared/StatusBadge';
import { formatDateTime } from '../../../lib/format';

/**
 * Başvuru tablosu. Masaüstünde tablo (sabit yükseklik, tek satır), mobilde kart listesi.
 */
export default function ApplicationsTable({ items }) {
  const navigate = useNavigate();
  const go = (id) => navigate(`/admin/basvurular/${id}`);

  return (
    <>
      {/* Masaüstü Tablo Görünümü */}
      <div className="hidden overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80 lg:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold tracking-wider text-slate-500 uppercase">
            <tr>
              <th scope="col" className="whitespace-nowrap px-4 py-3.5">Takip No</th>
              <th scope="col" className="whitespace-nowrap px-4 py-3.5">Aday</th>
              <th scope="col" className="whitespace-nowrap px-4 py-3.5">Kategori / Kanal</th>
              <th scope="col" className="whitespace-nowrap px-4 py-3.5">Okul / Şehir</th>
              <th scope="col" className="whitespace-nowrap px-4 py-3.5">Statü</th>
              <th scope="col" className="whitespace-nowrap px-4 py-3.5">Kontrol / İşaretler</th>
              <th scope="col" className="whitespace-nowrap px-4 py-3.5 text-right">Gönderim Tarihi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((a) => (
              <tr
                key={a.id}
                onClick={() => go(a.id)}
                className="group h-14 cursor-pointer transition-colors duration-150 hover:bg-brand-50/40"
              >
                {/* Takip No */}
                <td className="whitespace-nowrap px-4 py-3 align-middle">
                  <Link
                    to={`/admin/basvurular/${a.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="font-mono text-xs font-bold text-brand-700 hover:text-brand-800 hover:underline"
                  >
                    {a.trackingNo || '—'}
                  </Link>
                </td>

                {/* Aday */}
                <td className="whitespace-nowrap px-4 py-3 align-middle">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 group-hover:text-brand-950">{a.fullName}</span>
                    <span className="font-mono text-xs text-slate-400">({a.idNumber})</span>
                  </div>
                </td>

                {/* Kategori / Kanal */}
                <td className="whitespace-nowrap px-4 py-3 align-middle">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-medium text-slate-800">{a.categoryLabel || '—'}</span>
                    {[a.channel, a.subUnit].filter(Boolean).length > 0 && (
                      <span className="text-slate-400">
                        · {[a.channel, a.subUnit].filter(Boolean).join(' / ')}
                      </span>
                    )}
                  </div>
                </td>

                {/* Okul / Şehir */}
                <td className="max-w-xs whitespace-nowrap px-4 py-3 align-middle">
                  <div className="flex items-center gap-1.5 truncate text-xs" title={`${a.institution || ''} ${a.city ? `(${a.city})` : ''}`}>
                    <span className="truncate font-medium text-slate-800">{a.institution || '—'}</span>
                    {a.city && <span className="shrink-0 text-slate-400">· {a.city}</span>}
                  </div>
                </td>

                {/* Statü */}
                <td className="whitespace-nowrap px-4 py-3 align-middle">
                  <StatusBadge status={a.status} label={a.statusLabel} />
                </td>

                {/* Kontrol / İşaretler */}
                <td className="whitespace-nowrap px-4 py-3 align-middle">
                  <Signals a={a} />
                </td>

                {/* Gönderim Tarihi */}
                <td className="whitespace-nowrap px-4 py-3 text-right text-xs font-medium text-slate-500 align-middle">
                  {formatDateTime(a.submittedAt || a.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobil Kart Görünümü */}
      <ul className="space-y-3 lg:hidden">
        {items.map((a) => (
          <li key={a.id}>
            <Link
              to={`/admin/basvurular/${a.id}`}
              className="block rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition-all hover:border-brand-300 hover:ring-brand-200 active:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{a.fullName}</p>
                  <p className="mt-0.5 font-mono text-xs text-slate-500">
                    <span className="font-semibold text-brand-700">{a.trackingNo}</span> · {a.idNumber}
                  </p>
                </div>
                <StatusBadge status={a.status} label={a.statusLabel} />
              </div>

              <div className="mt-3 space-y-1 text-xs">
                <div className="flex items-center justify-between text-slate-700">
                  <span className="text-slate-400">Kategori:</span>
                  <span className="font-medium">{[a.categoryLabel, a.channel, a.subUnit].filter(Boolean).join(' · ')}</span>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span className="text-slate-400">Okul / Şehir:</span>
                  <span className="truncate font-medium">{[a.institution, a.city].filter(Boolean).join(' · ')}</span>
                </div>
                <div className="flex items-center justify-between text-slate-700 pt-1">
                  <span className="text-slate-400">Gönderim:</span>
                  <span className="text-slate-500">{formatDateTime(a.submittedAt || a.createdAt)}</span>
                </div>
              </div>

              <div className="mt-3 border-t border-slate-100 pt-3">
                <Signals a={a} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

/** İnceleyicinin dikkat etmesi gereken işaretler (Masaüstünde tek satırda kalır) */
function Signals({ a }) {
  const items = [];

  if (a.status === 'finalized') {
    items.push(
      a.qualified
        ? { icon: Award, text: 'Nitelikli bursiyer', cls: 'text-brand-700 bg-brand-50 ring-brand-200' }
        : { icon: Award, text: 'Normal bursiyer', cls: 'text-slate-600 bg-slate-100 ring-slate-200' }
    );
    if (a.sponsorLabel) {
      items.push({ icon: Building2, text: a.sponsorLabel, cls: 'text-slate-700 bg-slate-100 ring-slate-200' });
    }
  }

  if (a.isMinor) {
    items.push({ icon: UserRound, text: '18 yaş altı', cls: 'text-slate-700 bg-slate-100 ring-slate-200' });
  }

  if (a.revisionDocs) {
    items.push({ icon: FileWarning, text: `${a.revisionDocs} belge revizede`, cls: 'text-accent-700 bg-accent-50 ring-accent-200' });
  }

  if (Array.isArray(a.flags)) {
    a.flags.forEach((f) => {
      items.push({ icon: TriangleAlert, text: f.label, cls: 'text-amber-800 bg-amber-50 ring-amber-200' });
    });
  }

  if (a.referenceVerified) {
    items.push({ icon: ShieldCheck, text: 'Referans onaylı', cls: 'text-emerald-800 bg-emerald-50 ring-emerald-200' });
  }

  if (!items.length) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  return (
    <ul className="flex items-center gap-1.5 whitespace-nowrap">
      {items.map((i, idx) => (
        <li
          key={`${i.text}-${idx}`}
          className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${i.cls}`}
        >
          <i.icon className="size-3.5 shrink-0" aria-hidden />
          <span>{i.text}</span>
        </li>
      ))}
    </ul>
  );
}