import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { FileCheck2, Send } from 'lucide-react';
import { Alert, Button, Checkbox, Field, MaskedInput, MASKS, TextInput } from '../../../components/ui';
import UploadDropzone from '../documents/UploadDropzone';
import { ibanApi } from '../../../api/endpoints';
import { checkTrIban } from '../../../lib/iban';
import { formatBytes } from '../../../lib/format';

/** IBAN + hesap belgesi + "hesap bana ait" beyanı */
export default function IbanForm({ data, onSaved }) {
  const [iban, setIban] = useState('');
  const [file, setFile] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [errors, setErrors] = useState({});

  const check = checkTrIban(iban);

  const m = useMutation({
    mutationFn: () => ibanApi.submit({ iban: check.value, file }),
    onSuccess: onSaved,
    onError: (err) => setErrors({ ...(err.details || {}), root: err.details ? undefined : err.message }),
  });

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!check.complete) errs.iban = 'IBAN\'ı eksiksiz giriniz (26 karakter)';
    else if (!check.valid) errs.iban = 'IBAN hatalı, lütfen kontrol ediniz';
    if (!file) errs.file = 'Hesap belgesini yükleyiniz';
    if (!confirm) errs.confirm = 'Hesabın size ait vadesiz TL hesabı olduğunu onaylayınız';
    setErrors(errs);
    if (!Object.keys(errs).length) m.mutate();
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {errors.root && <Alert variant="error">{errors.root}</Alert>}
      <Field label="Hesap sahibi" htmlFor="holder" hint="Hesap sizin adınıza olmalı; bu alan değiştirilemez.">
        <TextInput id="holder" value={data.holderName} readOnly disabled />
      </Field>
      <Field label="IBAN" htmlFor="iban" required error={errors.iban}
        hint="Banka uygulamanızdan kopyalayıp yapıştırabilirsiniz.">
        <MaskedInput id="iban" mask={MASKS.iban} value={iban} onChange={(v) => { setIban(v); setErrors((x) => ({ ...x, iban: undefined })); }}
          invalid={!!errors.iban || (check.complete && !check.valid)} autoComplete="off" />
      </Field>
      {check.complete && !check.valid && !errors.iban && <p className="-mt-3 text-xs font-medium text-accent-600">IBAN hatalı görünüyor, lütfen kontrol ediniz.</p>}

      <Field label="Hesap belgesi" htmlFor="iban-file" required error={errors.file}
        hint="Banka uygulamasından veya şubeden alınan, adınızın ve IBAN'ın göründüğü belge (PDF, JPG veya PNG, en fazla 5 MB).">
        {file ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <span className="flex min-w-0 items-center gap-2 text-sm">
              <FileCheck2 className="size-5 shrink-0 text-emerald-600" aria-hidden />
              <span className="truncate font-medium text-slate-800">{file.name}</span>
              <span className="shrink-0 text-slate-500">{formatBytes(file.size)}</span>
            </span>
            <Button size="sm" variant="ghost" onClick={() => setFile(null)}>Değiştir</Button>
          </div>
        ) : (
          <UploadDropzone formats={['pdf', 'jpg', 'png']} maxMb={5} onFile={(f) => { setFile(f); setErrors((x) => ({ ...x, file: undefined })); }} />
        )}
      </Field>

      <Checkbox id="iban-confirm" checked={confirm} invalid={!!errors.confirm}
        onChange={(e) => { setConfirm(e.target.checked); setErrors((x) => ({ ...x, confirm: undefined })); }}>
        Girdiğim IBAN'ın <strong>kendi adıma açılmış vadesiz Türk Lirası</strong> hesabına ait olduğunu beyan ederim.
      </Checkbox>
      {errors.confirm && <p className="-mt-3 text-xs font-medium text-accent-600">{errors.confirm}</p>}

      <div className="flex justify-end">
        <Button type="submit" icon={Send} loading={m.isPending}>IBAN Bilgilerini Gönder</Button>
      </div>
    </form>
  );
}
