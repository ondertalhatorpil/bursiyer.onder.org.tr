import { useState } from 'react';
import { Copy, KeyRound } from 'lucide-react';
import { Alert, Button, Modal } from '../../../components/ui';

/** Geçici şifre sadece bir kez gösterilir */
export default function TempPasswordModal({ data, onClose }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(data.tempPassword); setCopied(true); } catch { setCopied(false); }
  };
  return (
    <Modal open={!!data} onClose={onClose} title="Geçici şifre" size="sm" footer={<Button onClick={onClose}>Tamam</Button>}>
      {data && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600"><strong>{data.user.fullName}</strong> ({data.user.email}) için geçici şifre:</p>
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <KeyRound className="size-5 shrink-0 text-brand-600" aria-hidden />
            <code className="flex-1 select-all font-mono text-lg font-bold tracking-wider text-slate-900" data-testid="temp-password">{data.tempPassword}</code>
            <Button size="sm" variant="secondary" icon={Copy} onClick={copy}>{copied ? 'Kopyalandı' : 'Kopyala'}</Button>
          </div>
          <Alert variant="warning">
            Bu şifre bir daha gösterilmez. Kişiye güvenli bir kanaldan iletin; ilk girişte değiştirmesi istenecek. Giriş için telefonuna SMS kodu da gelir.
          </Alert>
        </div>
      )}
    </Modal>
  );
}
