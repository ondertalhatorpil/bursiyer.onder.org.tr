import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import clsx from 'clsx';
import { OtpVerify } from '../../components/auth';
import LoginForm from './LoginForm';
import { authApi } from '../../api/endpoints';
import { useSetSession } from '../../hooks/useSession';
import { useTurnstile } from '../../hooks/useTurnstile';

/** Başvuruya devam / durum sorgulama: kimlik no + SMS kodu */
export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useSetSession();
  const [flow, setFlow] = useState(null);
  const step = flow ? 2 : 1;
  const captcha = useTurnstile();

  const start = async (idNumber) => setFlow(await authApi.loginStart(idNumber, await captcha.getToken()));

  const verify = async (code) => {
    const me = await authApi.loginVerify(flow.loginToken, code);
    setSession(me);
    navigate(location.state?.from || '/basvuru', { replace: true });
  };

  return (
    <section className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        {/* Adım göstergesi */}
        <div className="flex items-center gap-2" aria-label={`Adım ${step} / 2`}>
          {[1, 2].map((s) => (
            <span
              key={s}
              className={clsx('h-1 flex-1 rounded-full transition-colors duration-300', s <= step ? 'bg-brand-700' : 'bg-slate-200')}
            />
          ))}
        </div>
        <p className="mt-3 text-xs font-medium text-slate-500">
          Adım {step} / 2 · {flow ? 'SMS doğrulama' : 'Kimlik numarası'}
        </p>

        {/* Başlık */}
        <h1 className="mt-8 text-3xl font-bold tracking-tight text-slate-900">
          {flow ? 'Kodu giriniz' : 'Başvuruma devam et'}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          {flow
            ? 'Kayıtlı telefonunuza gönderilen 6 haneli kodu giriniz.'
            : 'Kimlik numaranızı giriniz, başvurunuzda kayıtlı telefona doğrulama kodu gönderelim.'}
        </p>

        {/* Form */}
        <div className="mt-8">
          {flow ? (
            <OtpVerify
              info={flow}
              onVerify={verify}
              onResend={async () => authApi.loginResend(flow.loginToken, await captcha.getToken())}
              onBack={() => setFlow(null)}
              submitLabel="Giriş Yap"
            />
          ) : (
            <LoginForm onSubmit={start} />
          )}
          {/* Bot doğrulaması: gerekirse burada tek tıklamalık kutu çıkar */}
          <div className="mt-6">{captcha.element}</div>
        </div>

        {/* Yeni başvuru */}
        <div className="mt-10 flex items-center gap-4 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200" aria-hidden />
          veya
          <span className="h-px flex-1 bg-slate-200" aria-hidden />
        </div>
        <Link
          to="/kayit"
          className="mt-6 block text-center text-sm font-semibold text-brand-700 underline-offset-4 hover:underline"
        >
          Yeni başvuru oluşturun
        </Link>
      </div>
    </section>
  );
}