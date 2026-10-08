import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { Alert, Button, Modal } from '../../../components/ui';
import { usersApi } from '../../../api/adminEndpoints';
import { useCities, useDormitories } from '../../../hooks/useLookups';
import { CATEGORIES, isYurt } from '../../../config';

const empty = { category: '', channelId: '', subUnitId: '', dormitoryId: '', cityId: '' };

/**
 * Koordinatör / görüntüleyicinin hangi başvuruları göreceği.
 * Her satır bir kural; satırlar "veya" ile birleşir, satır içindeki seçimler "ve".
 * Yurt Konaklama Bursu'nda kanal / birim / il yerine yurt seçilir (zorunlu); koordinatör bu yurdun müdürü olarak öneri verir.
 */
export default function ScopesModal({ user, onClose, onSaved }) {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const { data: channels = [] } = useQuery({ queryKey: ['admin', 'users', 'channels'], queryFn: usersApi.channels, staleTime: 300_000 });
  const { data: cities = [] } = useCities();
  const { data: dormitories = [] } = useDormitories();

  useEffect(() => {
    if (user) {
      setRows(user.scopes.map((s) => ({
        category: s.category || '', channelId: s.channelId ? String(s.channelId) : '',
        subUnitId: s.subUnitId ? String(s.subUnitId) : '', dormitoryId: s.dormitoryId ? String(s.dormitoryId) : '',
        cityId: s.cityId ? String(s.cityId) : '',
      })));
      setError(null);
    }
  }, [user]);

  const set = (i, patch) => setRows((r) => r.map((row, j) => {
    if (j !== i) return row;
    const next = { ...row, ...patch };
    if ('category' in patch) { next.channelId = ''; next.subUnitId = ''; next.dormitoryId = ''; }
    if (isYurt(next.category)) next.cityId = '';
    if ('channelId' in patch) next.subUnitId = '';
    return next;
  }));

  const save = async () => {
    setSaving(true); setError(null);
    try {
      const scopes = rows.map((r) => ({
        category: r.category || null, channelId: r.channelId ? Number(r.channelId) : null,
        subUnitId: r.subUnitId ? Number(r.subUnitId) : null, dormitoryId: r.dormitoryId ? Number(r.dormitoryId) : null,
        cityId: r.cityId ? Number(r.cityId) : null,
      }));
      onSaved(await usersApi.setScopes(user.id, scopes));
    } catch (err) {
      setError(Object.values(err.details || {})[0] || err.message);
    } finally {
      setSaving(false);
    }
  };

  const sel = 'h-10 w-full min-w-0 rounded-lg bg-white px-2.5 text-sm ring-1 ring-inset ring-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-100';

  return (
    <Modal open={!!user} onClose={onClose} title={user ? `Yetki alanı: ${user.fullName}` : ''}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Vazgeç</Button>
          <Button loading={saving} onClick={save}>Kaydet</Button>
        </>
      )}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Kullanıcı sadece bu kurallara uyan başvuruları görür. Birden fazla kural eklerseniz herhangi birine uyan başvurular görünür.
          Kural yoksa hiçbir başvuru görünmez.
          {' Yurt Konaklama Bursu seçilirse yurt seçilir: kullanıcı o yurdun müdürü olarak sadece orada konaklayan öğrencilerin başvurularını görür ve Genel Merkeze burs önerisi gönderir.'}
        </p>
        {error && <Alert variant="error">{error}</Alert>}
        <ul className="space-y-3">
          {rows.map((r, i) => {
            const chList = channels.filter((c) => c.category === r.category);
            const ch = channels.find((c) => String(c.id) === r.channelId);
            return (
              <li key={i} className="grid grid-cols-1 gap-2 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200 sm:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
                <select className={sel} aria-label="Kategori" value={r.category} onChange={(e) => set(i, { category: e.target.value })}>
                  <option value="">Tüm kategoriler</option>
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                {isYurt(r.category) ? (
                  <select className={`${sel} sm:col-span-3`} aria-label="Yurt" value={r.dormitoryId} onChange={(e) => set(i, { dormitoryId: e.target.value })}>
                    <option value="">Yurt seçin</option>
                    {dormitories.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                ) : (
                  <>
                    <select className={sel} aria-label="Kanal" value={r.channelId} disabled={!r.category} onChange={(e) => set(i, { channelId: e.target.value })}>
                      <option value="">Tüm kanallar</option>
                      {chList.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select className={sel} aria-label="Birim" value={r.subUnitId} disabled={!ch?.subUnits.length} onChange={(e) => set(i, { subUnitId: e.target.value })}>
                      <option value="">Tüm birimler</option>
                      {ch?.subUnits.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                    <select className={sel} aria-label="İl" value={r.cityId} onChange={(e) => set(i, { cityId: e.target.value })}>
                      <option value="">Tüm iller</option>
                      {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </>
                )}
                <Button variant="ghost" size="sm" icon={Trash2} onClick={() => setRows((x) => x.filter((_, j) => j !== i))} aria-label="Kuralı sil">
                  <span className="sm:sr-only">Sil</span>
                </Button>
              </li>
            );
          })}
        </ul>
        <Button variant="secondary" size="sm" icon={Plus} onClick={() => setRows((r) => [...r, { ...empty }])}>Kural ekle</Button>
      </div>
    </Modal>
  );
}
