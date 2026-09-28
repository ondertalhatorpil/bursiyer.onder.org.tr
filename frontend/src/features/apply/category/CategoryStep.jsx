import { useState } from 'react';
import { useNavigate } from 'react-router';
import { BookOpen, GraduationCap, Library, School } from 'lucide-react';
import { Alert, Button, Modal, RadioCardGroup } from '../../../components/ui';
import StepPage from '../shared/StepPage';
import StepActions from '../shared/StepActions';
import { applicationApi } from '../../../api/endpoints';
import { useApplication, useApplicationUpdater } from '../../../hooks/useApplication';
import { CATEGORIES } from '../../../config';

const ICONS = { lise: School, universite: GraduationCap, yuksek_lisans: BookOpen, doktora: Library };
const OPTIONS = CATEGORIES.map((c) => ({ ...c, icon: ICONS[c.value] }));

/** Adım 3: burs kategorisi. Değiştirilirse sonraki adımlardaki bilgiler silinir (onay istenir). */
export default function CategoryStep() {
  const navigate = useNavigate();
  const { application } = useApplication();
  const update = useApplicationUpdater();
  const [value, setValue] = useState(application.category || '');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const changing = application.category && value && value !== application.category;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await applicationApi.setCategory(value);
      update(res.application);
      navigate('/basvuru/kanal');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  };

  const next = () => {
    if (!value) return setError('Lütfen bir burs kategorisi seçin');
    if (changing) return setConfirmOpen(true);
    if (value === application.category) return navigate('/basvuru/kanal');
    return save();
  };

  return (
    <StepPage
      step={3}
      title="Burs Kategorisi"
      description="Başvurmak istediğiniz burs kategorisini seçin. Sadece bir kategoriye başvurabilirsiniz."
      footer={<StepActions step={3} onNext={next} loading={saving} />}
    >
      {error && <Alert variant="error">{error}</Alert>}
      <RadioCardGroup name="category" options={OPTIONS} value={value} onChange={(v) => { setValue(v); setError(null); }} />

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Kategori değiştirilsin mi?"
        size="sm"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>Vazgeç</Button>
            <Button variant="danger" loading={saving} onClick={save}>Evet, değiştir</Button>
          </>
        )}
      >
        <p className="text-sm leading-relaxed text-slate-700">
          Kategoriyi değiştirirseniz başvuru kanalı, eğitim bilgileri ve yüklediğiniz belgeler silinir;
          bu adımları yeni kategoriye göre tekrar doldurmanız gerekir. Veli bilgileriniz korunur.
        </p>
      </Modal>
    </StepPage>
  );
}
