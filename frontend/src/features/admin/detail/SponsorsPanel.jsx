import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import { Button, Card, Checkbox } from '../../../components/ui';
import { adminApi } from '../../../api/adminEndpoints';
import { useSponsors } from '../sponsors/useSponsors';
import SponsorLogo from '../sponsors/SponsorLogo';

/**
 * Kesinleşmiş bursiyere burs veren firmalar. Hiçbiri seçilmezse Genel Merkez.
 * Listede aktif firmalar + bu bursiyere önceden atanmış (sonradan pasife alınmış) firmalar görünür.
 */
export default function SponsorsPanel({ app, canWrite }) {
  const qc = useQueryClient();
  const { data: all = [], isLoading } = useSponsors();
  const assigned = app.sponsors.items;
  const assignedIds = assigned.map((s) => s.id);
  const [selected, setSelected] = useState(assignedIds);
  useEffect(() => { setSelected(assignedIds); }, [assignedIds.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const m = useMutation({
    mutationFn: (ids) => adminApi.setSponsors(app.id, ids),
    onSuccess: (res) => {
      qc.setQueryData(['admin', 'application', app.id], res);
      qc.invalidateQueries({ queryKey: ['admin', 'applications'] });
      qc.invalidateQueries({ queryKey: ['admin', 'sponsors'] });
    },
  });

  const options = [
    ...all.filter((s) => s.isActive || assignedIds.includes(s.id)),
    ...assigned.filter((a) => !all.some((s) => s.id === a.id)),
  ];
  const dirty = [...selected].sort().join(',') !== [...assignedIds].sort().join(',');
  const toggle = (id) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  return (
    <Card className="px-5 py-4">
      <div className="flex items-center gap-2">
        <Building2 className="size-5 text-brand-700" aria-hidden />
        <p className="font-semibold text-slate-900">Burs veren</p>
      </div>
      <p className="mt-1 text-sm text-slate-700">{app.sponsors.label}</p>

      {canWrite && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          {isLoading && <p className="text-sm text-slate-500">Firmalar yükleniyor…</p>}
          {!isLoading && !options.length && <p className="text-sm text-slate-500">Henüz firma eklenmedi. Firmaları süper admin ekler.</p>}
          <ul className="max-h-72 space-y-2 overflow-y-auto">
            {options.map((s) => (
              <li key={s.id}>
                <Checkbox id={`sp-${s.id}`} checked={selected.includes(s.id)} onChange={() => toggle(s.id)} disabled={m.isPending}>
                  <span className="inline-flex items-center gap-2">
                    <SponsorLogo sponsor={s} className="size-7" />
                    {s.name}{!s.isActive && <span className="text-xs text-slate-400">(pasif)</span>}
                  </span>
                </Checkbox>
              </li>
            ))}
          </ul>
          {options.length > 0 && (
            <p className="mt-2 text-xs text-slate-500">Hiçbiri seçilmezse bursu Genel Merkez verir.</p>
          )}
          {m.error && <p className="mt-2 text-xs text-accent-700">{m.error.message}</p>}
          {dirty && (
            <div className="mt-3 flex gap-2">
              <Button size="sm" loading={m.isPending} onClick={() => m.mutate(selected)}>Kaydet</Button>
              <Button size="sm" variant="ghost" disabled={m.isPending} onClick={() => setSelected(assignedIds)}>Vazgeç</Button>
            </div>
          )}
        </div>
      )}

      {!canWrite && assigned.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {assigned.map((s) => (
            <li key={s.id} className="flex items-center gap-2 text-sm text-slate-700"><SponsorLogo sponsor={s} className="size-7" />{s.name}</li>
          ))}
        </ul>
      )}
    </Card>
  );
}
