import { useState } from 'react';
import { CircleCheck } from 'lucide-react';
import { Alert, Checkbox, PageSpinner } from '../../../components/ui';
import { useConsentText } from '../../../hooks/useLookups';

/** YL / Doktora: başvuru şartları metni + "okudum, sağlıyorum" onayı */
export default function RequirementsPanel({ category, acceptedAt, checked, onCheckedChange, warning }) {
  const type = category === 'doktora' ? 'requirements_dr' : 'requirements_yl';
  const { data, isLoading, error } = useConsentText(type);
  const [expanded, setExpanded] = useState(!acceptedAt);

  if (isLoading) return <PageSpinner />;
  if (error) return <Alert variant="error">{error.message}</Alert>;

  return (
    <div className="space-y-4">
      {acceptedAt && (
        <Alert variant="success" title="Başvuru şartlarını onayladınız">
          {!expanded && <button type="button" onClick={() => setExpanded(true)} className="font-semibold underline">Şartları tekrar görüntüle</button>}
        </Alert>
      )}
      {expanded && (
        <div className="max-h-80 overflow-y-auto whitespace-pre-line rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 ring-1 ring-inset ring-slate-200 sm:p-5">
          <p className="mb-3 font-bold text-brand-900">{data.title}</p>
          {data.body}
        </div>
      )}
      {warning && <Alert variant="warning" title="Doğum yılı şartı">{warning}</Alert>}
      {!acceptedAt && (
        <Checkbox id="requirements" checked={checked} onChange={(e) => onCheckedChange(e.target.checked)}>
          {data.label}
        </Checkbox>
      )}
      {acceptedAt && !warning && (
        <p className="flex items-center gap-2 text-sm text-emerald-700"><CircleCheck className="size-4" aria-hidden /> Devam edebilirsiniz.</p>
      )}
    </div>
  );
}
