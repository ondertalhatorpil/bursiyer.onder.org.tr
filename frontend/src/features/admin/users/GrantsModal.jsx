import { useEffect, useState } from 'react';
import { Alert, Button, Checkbox, Modal } from '../../../components/ui';
import { usersApi } from '../../../api/adminEndpoints';

/**
 * Genel Merkez Değerlendirici ek yetkileri.
 * Yurt Konaklama Bursu: tüm yurtların başvurularında yurt müdürü önerilerini görür ve
 * Yurtlar Biriminin Önerisi'ni süper admine gönderir (onay / red süper admindedir).
 */
export default function GrantsModal({ user, onClose, onSaved }) {
  const [yurtHq, setYurtHq] = useState(false);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) { setYurtHq(!!user.yurtHq); setError(null); }
  }, [user]);

  const save = async () => {
    setSaving(true); setError(null);
    try {
      onSaved(await usersApi.setGrants(user.id, { yurtHq }));
    } catch (err) {
      setError(Object.values(err.details || {})[0] || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={!!user} onClose={onClose} title={user ? `Yetki ver: ${user.fullName}` : ''} size="md"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Vazgeç</Button>
          <Button loading={saving} onClick={save}>Kaydet</Button>
        </>
      )}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Yetki verilmezse Genel Merkez Değerlendirici tüm başvuruları görür.
          Yurt Konaklama Bursu yetkisi verilirse sadece Yurt Konaklama Bursu başvurularını görür.
        </p>
        {error && <Alert variant="error">{error}</Alert>}
        <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <Checkbox id="grant-yurt" checked={yurtHq} onChange={(e) => setYurtHq(e.target.checked)}>
            <span className="font-semibold text-slate-900">Yurt Konaklama Bursu (Yurtlar Birimi)</span>
            <span className="mt-0.5 block text-slate-600">
              Sadece tüm yurtların Yurt Konaklama Bursu başvurularını görür (diğer kategorileri görmez); yurt müdürlerinin
              önerilerini görür, kendi aylık burs önerisini ve notunu süper admine gönderir.
            </span>
          </Checkbox>
        </div>
      </div>
    </Modal>
  );
}
