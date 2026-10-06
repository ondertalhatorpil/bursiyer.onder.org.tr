import { useState } from 'react';
import clsx from 'clsx';
import { Eye, FileText, Image, RefreshCw, Trash2 } from 'lucide-react';
import { Alert, Badge, Button, Checkbox } from '../../../components/ui';
import { ConsentModal } from '../../../components/auth';
import UploadDropzone from './UploadDropzone';
import { documentsApi } from '../../../api/endpoints';
import { formatBytes, formatDateTime } from '../../../lib/format';

/**
 * Tek belge kartı: açıklama, (gerekirse) ek rıza, yükleme alanı, yüklenen dosya ve uyarılar.
 * onChange(listResponse): backend'in döndürdüğü güncel belge listesi
 */
export default function DocumentCard({ item, onChange, canRemove = true }) {
  const [replacing, setReplacing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState(null);
  const [consent, setConsent] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);

  const up = item.upload;
  const needsConsent = item.consentType && !item.consentGiven;
  const revision = up?.reviewStatus === 'revision_requested';
  const showDropzone = item.editable && (!up || replacing || revision);

  const upload = async (file) => {
    if (needsConsent && !consent) {
      setError('Bu belgeyi yüklemeden önce açık rıza onayını işaretleyiniz.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      onChange(await documentsApi.upload(item.code, file, { consent: needsConsent }));
      setReplacing(false);
    } catch (err) {
      setError(err.details?.file || err.details?.consent || err.message);
    } finally {
      setUploading(false);
    }
  };

  const remove = async () => {
    setRemoving(true);
    setError(null);
    try {
      onChange(await documentsApi.remove(up.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setRemoving(false);
    }
  };

  const FileIcon = up?.mime?.startsWith('image/') ? Image : FileText;

  return (
    <article className={clsx('rounded-xl bg-white p-4 ring-1 ring-inset sm:p-5', revision ? 'ring-accent-300' : up ? 'ring-emerald-200' : 'ring-slate-200')}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-bold text-brand-900">{item.name}</h3>
          {item.description && <p className="mt-1 text-sm text-slate-600">{item.description}</p>}
        </div>
        {up && !revision ? <Badge tone="success" dot>Yüklendi</Badge>
          : item.required ? <Badge tone="danger">Zorunlu</Badge> : <Badge>Varsa yükleyiniz</Badge>}
      </div>

      {revision && (
        <Alert variant="error" title="Bu belgenin yeniden yüklenmesi istendi" className="mt-4">
          {up.reviewNote || 'Lütfen belgeyi güncelleyip tekrar yükleyiniz.'}
        </Alert>
      )}

      {up && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 p-3">
          <div className="flex min-w-0 items-center gap-3">
            <FileIcon className="size-8 shrink-0 text-brand-600" aria-hidden />
            <div className="min-w-0 text-sm">
              <p className="truncate font-medium text-slate-900">{up.originalName}</p>
              <p className="text-xs text-slate-500">{formatBytes(up.size)} · {formatDateTime(up.uploadedAt)}</p>
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" icon={Eye}
              onClick={() => window.open(documentsApi.fileUrl(up.id), '_blank', 'noopener')}>Görüntüle</Button>
            {item.editable && !replacing && !revision && (
              <Button variant="ghost" size="sm" icon={RefreshCw} onClick={() => setReplacing(true)}>Değiştir</Button>
            )}
            {item.editable && canRemove && !revision && (
              <Button variant="ghost" size="sm" icon={Trash2} loading={removing} onClick={remove} aria-label="Belgeyi kaldır" className="!text-accent-600">
                Kaldır
              </Button>
            )}
          </div>
        </div>
      )}

      {showDropzone && (
        <div className="mt-4 space-y-3">
          {needsConsent && (
            <div className="rounded-lg bg-amber-50 p-3 ring-1 ring-inset ring-amber-200">
              <Checkbox id={`consent-${item.code}`} checked={consent} onChange={(e) => { setConsent(e.target.checked); setError(null); }}>
                <button type="button" onClick={(e) => { e.preventDefault(); setConsentOpen(true); }} className="font-semibold text-brand-700 underline underline-offset-2">
                  Özel nitelikli kişisel veri açık rıza metnini
                </button>{' '}
                okudum; bu belgenin burs değerlendirmesi amacıyla işlenmesine açık rıza veriyorum.
              </Checkbox>
              <ConsentModal type={item.consentType} open={consentOpen} onClose={() => setConsentOpen(false)} onAccept={() => setConsent(true)} />
            </div>
          )}
          <UploadDropzone formats={item.formats} maxMb={item.maxMb} onFile={upload} uploading={uploading} />
          {replacing && <Button variant="ghost" size="sm" onClick={() => setReplacing(false)}>Vazgeç</Button>}
        </div>
      )}

      {error && <Alert variant="error" className="mt-3">{error}</Alert>}
    </article>
  );
}
