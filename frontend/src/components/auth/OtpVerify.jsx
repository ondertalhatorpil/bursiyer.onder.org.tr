import { useEffect, useState } from 'react';
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

  const textBtn = 'text-sm font-semibold text-brand-700 underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline';

  return (
    <div className="space-y-7">
      <p className="text-sm leading-relaxed text-slate-600">
        <strong className="font-semibold tabular-nums text-slate-900">{current.maskedPhone}</strong> numaralı
        telefona 6 haneli bir doğrulama kodu gönderdik.
      </p>

      {children}

      <div className="space-y-3">
        <OtpInput value={code} onChange={setCode} disabled={verifying || expired} invalid={!!error} autoFocus />
        <p className="text-center text-sm" aria-live="polite">
          {expired ? (
            <span className="font-semibold text-accent-600">Kodun süresi doldu, yeni kod isteyin.</span>
          ) : (
            <span className="text-slate-500">
              Kod <span className="font-semibold tabular-nums text-slate-900">{mmss(expiresLeft)}</span> içinde geçerliliğini yitirecek
            </span>
          )}
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {notice && !error && <Alert variant="success">{notice}</Alert>}

      <Button
        size="lg"
        className="w-full"
        loading={verifying}
        disabled={code.length !== 6 || expired || !canSubmit}
        onClick={() => verify()}
      >
        {submitLabel}
      </Button>

      <div className="flex flex-col-reverse items-center gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:justify-between">
        {onBack ? (
          <button type="button" onClick={onBack} className={textBtn}>
            Bilgileri düzenle
          </button>
        ) : <span />}
        <button type="button" onClick={resend} disabled={resendLeft > 0 || resending} className={textBtn}>
          {resending
            ? 'Gönderiliyor…'
            : resendLeft > 0
              ? <>Tekrar gönder <span className="tabular-nums">({resendLeft} sn)</span></>
              : 'Kodu tekrar gönder'}
        </button>
      </div>
    </div>
  );
}