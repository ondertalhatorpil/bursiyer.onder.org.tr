import { useMemo, useState } from 'react';

/**
 * Son 30 günün günlük başvuru sayısı (tek seri sütun grafiği, gezinince değer balonu).
 * Sütunlar en fazla 24px, üst köşeler 4px yuvarlak, ızgara çizgileri ince ve silik.
 */
export default function DailyChart({ data = [] }) {
  const [hover, setHover] = useState(null);

  const days = useMemo(() => {
    const map = new Map(data.map((d) => [d.day, d.count]));
    const out = [];
    const today = new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' }));
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000).toISOString().slice(0, 10);
      out.push({ day: d, count: map.get(d) || 0 });
    }
    return out;
  }, [data]);

  const max = Math.max(1, ...days.map((d) => d.count));
  const step = max <= 5 ? 1 : Math.ceil(max / 4 / 5) * 5;
  const top = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: Math.floor(top / step) + 1 }, (_, i) => i * step);

  const W = 720; const H = 220; const padL = 36; const padB = 26; const padT = 10;
  const plotW = W - padL - 8; const plotH = H - padB - padT;
  const slot = plotW / days.length;
  const barW = Math.min(24, slot - 4);
  const y = (v) => padT + plotH - (v / top) * plotH;
  const fmt = (iso) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Son 30 günde günlük gönderilen başvuru sayısı">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - 8} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeWidth="1" />
            <text x={padL - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" className="fill-slate-400 text-[11px]">{t}</text>
          </g>
        ))}
        {days.map((d, i) => {
          const x = padL + i * slot + (slot - barW) / 2;
          const h = plotH - (y(d.count) - padT);
          const r = Math.min(4, h / 2);
          return (
            <g key={d.day} onMouseEnter={() => setHover({ ...d, x: x + barW / 2, y: y(d.count) })} onMouseLeave={() => setHover(null)}>
              <rect x={padL + i * slot} y={padT} width={slot} height={plotH} fill="transparent" />
              {d.count > 0 && (
                <path
                  d={`M${x},${padT + plotH} V${y(d.count) + r} Q${x},${y(d.count)} ${x + r},${y(d.count)} H${x + barW - r} Q${x + barW},${y(d.count)} ${x + barW},${y(d.count) + r} V${padT + plotH} Z`}
                  className={hover?.day === d.day ? 'fill-brand-800' : 'fill-brand-500'}
                />
              )}
              {i % 5 === 4 && <text x={x + barW / 2} y={H - 8} textAnchor="middle" className="fill-slate-400 text-[11px]">{fmt(d.day)}</text>}
            </g>
          );
        })}
      </svg>
      {hover && (
        <div className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow"
          style={{ left: `${(hover.x / W) * 100}%`, top: `${(hover.y / H) * 100}%` }}>
          <span className="font-semibold">{fmt(hover.day)}</span> · {hover.count} başvuru
        </div>
      )}
    </div>
  );
}
