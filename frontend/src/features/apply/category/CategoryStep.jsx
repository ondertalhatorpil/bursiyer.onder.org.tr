import { useState } from 'react';
import { useNavigate } from 'react-router';
import clsx from 'clsx';
import { Alert, Button, Modal } from '../../../components/ui';
import StepPage from '../shared/StepPage';
import StepActions from '../shared/StepActions';
import { applicationApi } from '../../../api/endpoints';
import { useApplication, useApplicationUpdater } from '../../../hooks/useApplication';
import { CATEGORIES, stepRoutesFor } from '../../../config';

/** Numaralı, çizgilerle ayrılmış seçim listesi (kutusuz) */
function CategoryList({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Burs kategorisi" className="divide-y divide-slate-200 border-y border-slate-200">
      {CATEGORIES.map((c, i) => {
        const checked = value === c.value;
        return (
          <label
            key={c.value}
            className={clsx(
              'relative flex cursor-pointer items-center gap-4 py-5 pl-5 pr-2 transition-colors sm:gap-6 sm:pl-6',
              checked ? 'bg-brand-50/60' : 'hover:bg-slate-50',
            )}
          >
            <input
              type="radio"
              name="category"
              value={c.value}
              checked={checked}
              onChange={() => onChange(c.value)}
              className="peer sr-only"
            />
            {/* Seçili satırın solunda kırmızı çubuk */}
            <span className={clsx('absolute inset-y-0 left-0 w-[3px] transition-colors', checked ? 'bg-brand-700' : 'bg-transparent')} aria-hidden />

            <span className={clsx('w-7 shrink-0 text-sm font-semibold tabular-nums', checked ? 'text-brand-700' : 'text-slate-400')}>
              {String(i + 1).padStart(2, '0')}
            </span>

            <span className="min-w-0 flex-1">
              <span className={clsx('block text-base font-semibold sm:text-lg', checked ? 'text-brand-800' : 'text-slate-900')}>
                {c.label}
              </span>
              <span className="mt-0.5 block text-sm text-slate-500">{c.description}</span>
            </span>

            {/* Radyo işareti */}
            <span
              className={clsx(
                'grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-600',
                checked ? 'border-brand-700' : 'border-slate-300',
              )}
              aria-hidden
            >
              <span className={clsx('size-2.5 rounded-full transition-transform', checked ? 'scale-100 bg-brand-700' : 'scale-0')} />
            </span>
          </label>
        );
      })}
    </div>
  );
}

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
      navigate(stepRoutesFor(value)[4]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  };

  const next = () => {
    if (!value) return setError('Lütfen bir burs kategorisi seçiniz');
    if (changing) return setConfirmOpen(true);
    if (value === application.category) return navigate(stepRoutesFor(value)[4]);
    return save();
  };

  return (
    <StepPage
      step={3}
      title="Burs Kategorisi Seçimi"
      description="Lütfen öğrenim durumunuza uygun burs kategorisini seçiniz. Başvuru süreci boyunca yalnızca tek bir kategori için müracaat yapılabilir."
      footer={<StepActions step={3} onNext={next} loading={saving} />}
    >
      {error && <Alert variant="error">{error}</Alert>}

      <CategoryList value={value} onChange={(v) => { setValue(v); setError(null); }} />

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Kategori Değişikliği Onayı"
        size="sm"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>İptal</Button>
            <Button variant="danger" loading={saving} onClick={save}>Evet, Değiştir</Button>
          </>
        )}
      >
        <p className="text-sm leading-relaxed text-slate-700">
          Burs kategorisini değiştirmeniz durumunda; seçmiş olduğunuz başvuru kanalı, eğitim bilgileriniz ve
          yüklediğiniz belgeler sıfırlanacaktır. Bu adımları yeni kategoriye uygun olarak yeniden doldurmanız
          gerekecektir. Varsa kaydedilen veli/iletişim bilgileriniz muhafaza edilecektir.
        </p>
      </Modal>
    </StepPage>
  );
}