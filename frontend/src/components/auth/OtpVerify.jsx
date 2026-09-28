import { useEffect, useState } from 'react';
import { ArrowLeft, MessageSquareText, RotateCw } from 'lucide-react';
import OtpInput from './OtpInput';
import { Alert, Button } from '../ui';
import { useCountdown } from '../../hooks/useCountdown';
import { mmss } from '../../lib/format';

/**
 * SMS kodu doğrulama bloğu (kayıt, giriş ve veli onayında ortak).
 *
 * @param {object} p
 *   info       { maskedPhone, expiresIn, resendIn } - backend'in kod gönderince döndüğü bilgi
 *   onVerify   async (code) => void   hata fırlatırsa mesajı gösterilir
 *   onResend   async () => info       yeni kod bilgisi
 *   onBack     bilgileri düzenlemeye dön (opsiyonel)
 *   children   kodun üstünde gösterilecek ek içerik (ör. veli rızası)
 *   canSubmit  ek koşul (ör. rıza işaretlendi mi)
 */
export default function OtpVerify({ info, onVerify, onResend, onBack, submitLabel = 'Doğrula', children, canSubmit = true }) {
  const [code, setCode] = useState('');
  const [current, setCurrent] = useState(info);
  const [sentAt, setSentAt] = useState(0);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  const expiresLeft = useCountdown(current.expiresIn, sentAt);
  const resendLeft = useCountdown(current.resendIn, sentAt);
  const expired = expiresLeft === 0;

  const verify = async (value = code) => {
    if (value.length !== 6 || verifying || !canSubmit) return;
    setVerifying(true);
    setError(null);
    try {
      await onVerify(value);
    } catch (err) {
      setError(err.message);
      setCode('');
    } finally {
      setVerifying(false);
    }
  };

  // 6 hane girilince otomatik doğrula
  useEffect(() => {
    if (code.length === 6 && canSubmit) verify(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const resend = async () => {
    setResending(true);
    setError(null);
    setNotice(null);
    try {
      const next = await onResend();
      setCurrent({ ...current, ...next });
      setSentAt((n) => n + 1);
      setCode('');
      setNotice('Yeni doğrulama kodu gönderildi.');
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-xl bg-brand-50 p-4 text-sm text-brand-900">
        <MessageSquareText className="mt-0.5 size-5 shrink-0 text-brand-600" aria-hidden />
        <p>
          <strong className="tabular-nums">{current.maskedPhone}</strong> numaralı telefona 6 haneli bir doğrulama kodu gönderdik.
        </p>
      </div>

      {children}

      <OtpInput value={code} onChange={setCode} disabled={verifying || expired} invalid={!!error} autoFocus />

      <p className="text-center text-sm text-slate-600" aria-live="polite">
        {expired ? (
          <span className="font-semibold text-accent-600">Kodun süresi doldu. Lütfen yeni kod isteyin.</span>
        ) : (
          <>Kalan süre: <span className="font-bold tabular-nums text-brand-800">{mmss(expiresLeft)}</span></>
        )}
      </p>

      {error && <Alert variant="error">{error}</Alert>}
      {notice && !error && <Alert variant="success">{notice}</Alert>}

      <div className="flex flex-col gap-3">
        <Button size="lg" loading={verifying} disabled={code.length !== 6 || expired || !canSubmit} onClick={() => verify()}>
          {submitLabel}
        </Button>
        <div className="flex flex-col-reverse items-center justify-between gap-2 sm:flex-row">
          {onBack ? (
            <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={onBack}>Bilgileri düzenle</Button>
          ) : <span />}
          <Button variant="ghost" size="sm" icon={RotateCw} loading={resending} disabled={resendLeft > 0} onClick={resend}>
            {resendLeft > 0 ? `Tekrar gönder (${resendLeft} sn)` : 'Kodu tekrar gönder'}
          </Button>
        </div>
      </div>
    </div>
  );
}
