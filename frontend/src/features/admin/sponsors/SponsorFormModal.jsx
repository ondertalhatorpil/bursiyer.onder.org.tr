import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ImagePlus, Trash2 } from 'lucide-react';
import { Alert, Button, Field, Modal, Switch, Textarea, TextInput } from '../../../components/ui';
import { sponsorsApi } from '../../../api/adminEndpoints';
import { applyApiErrors } from '../../../lib/form-errors';
import SponsorLogo from './SponsorLogo';

const FIELDS = ['name', 'startedAt', 'endedAt', 'isActive', 'contactName', 'contactPhone', 'contactEmail', 'website', 'notes'];
const empty = { name: '', startedAt: '', endedAt: '', isActive: true, contactName: '', contactPhone: '', contactEmail: '', website: '', notes: '' };

/** Firma ekleme / düzenleme. sponsor null ise yeni firma. Logo, firma kaydedildikten sonra yüklenir. */
export default function SponsorFormModal({ open, sponsor, onClose, onSaved }) {
  const editing = !!sponsor;
  const fileRef = useRef(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const { register, handleSubmit, control, setError, reset, formState: { errors, isSubmitting } } = useForm();

  useEffect(() => {
    if (!open) return;
    setLogoFile(null);
    reset(editing ? Object.fromEntries(FIELDS.map((k) => [k, sponsor[k] ?? empty[k]])) : empty);
  }, [open, sponsor?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- logo değişince form sıfırlanmasın

  const submit = handleSubmit(async (v) => {
    try {
      let res = editing ? await sponsorsApi.update(sponsor.id, v) : await sponsorsApi.create(v);
      const id = editing ? sponsor.id : res.id;
      if (logoFile) {
        try {
          res = await sponsorsApi.uploadLogo(id, logoFile);
        } catch (err) {
          onSaved(res);
          setError('root', { message: `Firma kaydedildi ama logo yüklenemedi: ${err.message}` });
          return;
        }
      }
      onSaved(res);
      onClose();
    } catch (err) {
      applyApiErrors(err, setError, FIELDS);
    }
  });

  const dropLogo = async () => {
    setLogoBusy(true);
    try { onSaved(await sponsorsApi.removeLogo(sponsor.id)); } finally { setLogoBusy(false); }
  };

  const preview = logoFile ? URL.createObjectURL(logoFile) : null;

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Firmayı düzenle' : 'Yeni firma'} size="lg"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Vazgeç</Button>
          <Button type="submit" form="sponsor-form" loading={isSubmitting}>{editing ? 'Kaydet' : 'Ekle'}</Button>
        </>
      )}>
      <form id="sponsor-form" onSubmit={submit} noValidate className="space-y-4">
        {errors.root && <Alert variant="error">{errors.root.message}</Alert>}

        <div className="flex items-center gap-4">
          {preview
            ? <img src={preview} alt="" className="size-16 rounded-xl object-contain p-1 ring-1 ring-slate-200" />
            : <SponsorLogo sponsor={sponsor || { hasLogo: false }} className="size-16" />}
          <div className="flex flex-wrap gap-2">
            <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="hidden"
              onChange={(e) => setLogoFile(e.target.files?.[0] || null)} />
            <Button size="sm" variant="secondary" icon={ImagePlus} onClick={() => fileRef.current?.click()}>
              {sponsor?.hasLogo || logoFile ? 'Logoyu değiştir' : 'Logo seç'}
            </Button>
            {editing && sponsor.hasLogo && !logoFile && (
              <Button size="sm" variant="ghost" icon={Trash2} loading={logoBusy} onClick={dropLogo}>Kaldır</Button>
            )}
            <p className="w-full text-xs text-slate-500">PNG veya JPG, en fazla 2 MB.</p>
          </div>
        </div>

        <Field label="Firma adı" htmlFor="sp-name" required error={errors.name?.message}>
          <TextInput id="sp-name" autoComplete="off" invalid={!!errors.name} {...register('name')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Burs vermeye başlama" htmlFor="sp-start" error={errors.startedAt?.message}>
            <TextInput id="sp-start" type="date" invalid={!!errors.startedAt} {...register('startedAt')} />
          </Field>
          <Field label="Bitiş tarihi" htmlFor="sp-end" error={errors.endedAt?.message} hint="Burs vermeyi bıraktıysa">
            <TextInput id="sp-end" type="date" invalid={!!errors.endedAt} {...register('endedAt')} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Yetkili kişi" htmlFor="sp-contact" error={errors.contactName?.message}>
            <TextInput id="sp-contact" autoComplete="off" {...register('contactName')} />
          </Field>
          <Field label="Telefon" htmlFor="sp-phone" error={errors.contactPhone?.message}>
            <TextInput id="sp-phone" type="tel" autoComplete="off" {...register('contactPhone')} />
          </Field>
          <Field label="E-posta" htmlFor="sp-email" error={errors.contactEmail?.message}>
            <TextInput id="sp-email" type="email" autoComplete="off" invalid={!!errors.contactEmail} {...register('contactEmail')} />
          </Field>
        </div>
        <Field label="Web sitesi" htmlFor="sp-web" error={errors.website?.message}>
          <TextInput id="sp-web" placeholder="https://" autoComplete="off" {...register('website')} />
        </Field>
        <Field label="Not" htmlFor="sp-notes" error={errors.notes?.message}>
          <Textarea id="sp-notes" rows={3} {...register('notes')} />
        </Field>
        <Controller name="isActive" control={control} render={({ field }) => (
          <Switch id="sp-active" checked={!!field.value} onChange={field.onChange} label="Aktif"
            description="Pasif firma bursiyerlere yeni atanamaz; mevcut atamalar korunur." />
        )} />
      </form>
    </Modal>
  );
}
