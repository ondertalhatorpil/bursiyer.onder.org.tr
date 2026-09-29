import { useState } from 'react';
import { Link } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Building2, ExternalLink, Pencil, Plus, Trash2, Users } from 'lucide-react';
import clsx from 'clsx';
import { Alert, Badge, Button, Modal, PageSpinner } from '../../../components/ui';
import { sponsorsApi } from '../../../api/adminEndpoints';
import { formatDate } from '../../../lib/format';
import { SPONSORS_KEY, useSponsors } from './useSponsors';
import SponsorFormModal from './SponsorFormModal';
import SponsorLogo from './SponsorLogo';

/** Burs veren firmalar (manage_settings) */
export default function SponsorsPage() {
  const qc = useQueryClient();
  const { data: items, isLoading, error } = useSponsors();
  const [form, setForm] = useState(null); // { id|null }
  const [del, setDel] = useState(null);
  const [delState, setDelState] = useState({ busy: false, error: null });

  if (isLoading) return <PageSpinner />;
  if (error) return <Alert variant="error">{error.message}</Alert>;

  const onSaved = (res) => {
    qc.setQueryData(SPONSORS_KEY, { items: res.items });
    qc.invalidateQueries({ queryKey: ['admin', 'application'] });
  };

  const doDelete = async () => {
    setDelState({ busy: true, error: null });
    try {
      onSaved(await sponsorsApi.remove(del.id));
      setDel(null);
      setDelState({ busy: false, error: null });
    } catch (err) {
      setDelState({ busy: false, error: err.message });
    }
  };

  const active = items.filter((s) => s.isActive).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Burs Veren Firmalar</h1>
          <p className="text-sm text-slate-500">{active} aktif, {items.length - active} pasif firma. Firması seçilmeyen bursiyerlere Genel Merkez burs verir.</p>
        </div>
        <Button icon={Plus} onClick={() => setForm({ id: null })}>Yeni firma</Button>
      </div>

      {!items.length && (
        <div className="rounded-2xl bg-white px-6 py-12 text-center ring-1 ring-slate-200">
          <Building2 className="mx-auto size-10 text-slate-300" aria-hidden />
          <p className="mt-3 font-semibold text-slate-900">Henüz firma eklenmedi</p>
          <p className="text-sm text-slate-500">Eklediğiniz firmalar kesinleşmiş bursiyerlerin detay sayfasında seçilebilir.</p>
        </div>
      )}

      <ul className="grid gap-3 xl:grid-cols-2">
        {items.map((s) => (
          <li key={s.id} className={clsx('rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:p-5', !s.isActive && 'opacity-75')}>
            <div className="flex items-start gap-4">
              <SponsorLogo sponsor={s} className="size-14" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-900">{s.name}</p>
                  {!s.isActive && <Badge>Pasif</Badge>}
                </div>
                <p className="text-sm text-slate-600">
                  {s.startedAt ? `${formatDate(s.startedAt)} tarihinden beri` : 'Başlangıç tarihi girilmedi'}
                  {s.endedAt && ` · ${formatDate(s.endedAt)} tarihinde bitti`}
                </p>
                {(s.contactName || s.contactPhone || s.contactEmail) && (
                  <p className="truncate text-sm text-slate-500">{[s.contactName, s.contactPhone, s.contactEmail].filter(Boolean).join(' · ')}</p>
                )}
                {s.website && (
                  <a href={/^https?:\/\//.test(s.website) ? s.website : `https://${s.website}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
                    {s.website.replace(/^https?:\/\//, '')}<ExternalLink className="size-3.5" aria-hidden />
                  </a>
                )}
                {s.notes && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{s.notes}</p>}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
              <Link to={`/admin/basvurular?status=finalized&sponsor=${s.id}`}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-brand-800 hover:bg-slate-50">
                <Users className="size-4" aria-hidden />{s.studentCount} bursiyer
              </Link>
              <span className="flex-1" />
              <Button size="sm" variant="secondary" icon={Pencil} onClick={() => setForm({ id: s.id })}>Düzenle</Button>
              <Button size="sm" variant="ghost" icon={Trash2} onClick={() => { setDel(s); setDelState({ busy: false, error: null }); }}
                aria-label={`${s.name} sil`} />
            </div>
          </li>
        ))}
      </ul>

      <SponsorFormModal open={!!form} sponsor={form?.id ? items.find((x) => x.id === form.id) || null : null} onClose={() => setForm(null)} onSaved={onSaved} />

      <Modal open={!!del} onClose={() => setDel(null)} title="Firmayı sil" size="sm"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setDel(null)}>Vazgeç</Button>
            <Button variant="danger" loading={delState.busy} onClick={doDelete}>Sil</Button>
          </>
        )}>
        <div className="space-y-3 text-sm text-slate-700">
          <p><strong>{del?.name}</strong> silinecek.</p>
          {delState.error && <Alert variant="error">{delState.error}</Alert>}
          <p className="text-slate-500">Bursiyerlere atanmış firmalar silinemez; bursu bıraktıysa düzenleyip pasife alın.</p>
        </div>
      </Modal>
    </div>
  );
}
