import { Link, useNavigate } from 'react-router';
import { FileWarning, ShieldCheck, TriangleAlert, UserRound } from 'lucide-react';
import StatusBadge from '../shared/StatusBadge';
import { formatDateTime } from '../../../lib/format';

/**
 * Başvuru tablosu. Masaüstünde tablo, mobilde kart listesi.
 * Satıra tıklayınca detaya gider (klavye için takip no bir link).
 */
export default function ApplicationsTable({ items }) {
  const navigate = useNavigate();
  const go = (id) => navigate(`/admin/basvurular/${id}`);

  return (
    <>
      <div className="hidden overflow-x-auto rounded-2xl bg-white ring-1 ring-slate-200 lg:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Takip No</th>
              <th className="px-4 py-3">Aday</th>
              <th className="px-4 py-3">Kategori / Kanal</th>
              <th className="px-4 py-3">Okul / Şehir</th>
              <th className="px-4 py-3">Statü</th>
              <th className="px-4 py-3">Kontrol</th>
              <th className="px-4 py-3">Gönderim</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((a) => (
              <tr key={a.id} onClick={() => go(a.id)} className="cursor-pointer align-top hover:bg-brand-50/50">
                <td className="whitespace-nowrap px-4 py-3">
                  <Link to={`/admin/basvurular/${a.id}`} onClick={(e) => e.stopPropagation()} className="font-mono font-semibold text-brand-700 hover:underline">
                    {a.trackingNo || '—'}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">{a.fullName}</p>
                  <p className="font-mono text-xs text-slate-500">{a.idNumber}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-slate-900">{a.categoryLabel || '—'}</p>
                  <p className="text-xs text-slate-500">{[a.channel, a.subUnit].filter(Boolean).join(' · ')}</p>
                </td>
                <td className="max-w-64 px-4 py-3">
                  <p className="truncate text-slate-900" title={a.institution}>{a.institution || '—'}</p>
                  <p className="text-xs text-slate-500">{a.city}</p>
                </td>
                <td className="px-4 py-3"><StatusBadge status={a.status} label={a.statusLabel} /></td>
                <td className="px-4 py-3"><Signals a={a} /></td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDateTime(a.submittedAt || a.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 lg:hidden">
        {items.map((a) => (
          <li key={a.id}>
            <Link to={`/admin/basvurular/${a.id}`} className="block rounded-2xl bg-white p-4 ring-1 ring-slate-200">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{a.fullName}</p>
                  <p className="font-mono text-xs text-slate-500">{a.trackingNo} · {a.idNumber}</p>
                </div>
                <StatusBadge status={a.status} label={a.statusLabel} />
              </div>
              <p className="mt-2 text-sm text-slate-700">{[a.categoryLabel, a.channel, a.subUnit].filter(Boolean).join(' · ')}</p>
              <p className="truncate text-sm text-slate-500">{[a.institution, a.city].filter(Boolean).join(' · ')}</p>
              <div className="mt-2"><Signals a={a} /></div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

/** İnceleyicinin dikkat etmesi gereken işaretler (ikon + metin, sadece renge dayanmaz) */
function Signals({ a }) {
  const items = [];
  if (a.isMinor) items.push({ icon: UserRound, text: '18 yaş altı', cls: 'text-slate-600' });
  if (a.revisionDocs) items.push({ icon: FileWarning, text: `${a.revisionDocs} belge revizede`, cls: 'text-accent-700' });
  for (const f of a.flags) items.push({ icon: TriangleAlert, text: f.label, cls: 'text-amber-700' });
  if (a.referenceVerified) items.push({ icon: ShieldCheck, text: 'Referans kontrol edildi', cls: 'text-emerald-700' });
  if (!items.length) return <span className="text-xs text-slate-400">—</span>;
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 lg:flex-col">
      {items.map((i) => (
        <li key={i.text} className={`flex items-center gap-1 text-xs font-medium ${i.cls}`}>
          <i.icon className="size-3.5 shrink-0" aria-hidden />{i.text}
        </li>
      ))}
    </ul>
  );
}
