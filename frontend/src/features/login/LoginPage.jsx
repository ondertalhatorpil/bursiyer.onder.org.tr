import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import Container from '../../components/layout/Container';
import { Card, CardBody, CardHeader } from '../../components/ui';
import { OtpVerify } from '../../components/auth';
import LoginForm from './LoginForm';
import { authApi } from '../../api/endpoints';
import { useSetSession } from '../../hooks/useSession';

/** Başvuruya devam / durum sorgulama: kimlik no + SMS kodu */
export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useSetSession();
  const [flow, setFlow] = useState(null);

  const start = async (idNumber) => setFlow(await authApi.loginStart(idNumber));

  const verify = async (code) => {
    const me = await authApi.loginVerify(flow.loginToken, code);
    setSession(me);
    navigate(location.state?.from || '/basvuru', { replace: true });
  };

  return (
    <Container size="sm">
      <div className="mb-6 text-center sm:mb-8">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Başvuruma Devam Et</h1>
        <p className="mt-2 text-slate-600">Yarım kalan başvurunuza devam edin veya başvurunuzun durumunu görün.</p>
      </div>
      <Card>
        <CardHeader
          title={flow ? 'SMS ile doğrulayın' : 'Giriş yapın'}
          description={flow ? 'Kayıtlı telefonunuza gelen kodu girin.' : 'Kimlik numaranızı girin, kayıtlı telefonunuza kod gönderelim.'}
        />
        <CardBody>
          {flow ? (
            <OtpVerify info={flow} onVerify={verify} onResend={() => authApi.loginResend(flow.loginToken)} onBack={() => setFlow(null)} submitLabel="Giriş Yap" />
          ) : (
            <LoginForm onSubmit={start} />
          )}
        </CardBody>
      </Card>
      <p className="mt-6 text-center text-sm text-slate-600">
        Henüz başvurunuz yok mu?{' '}
        <Link to="/kayit" className="font-semibold text-brand-700 hover:underline">Yeni başvuru oluşturun</Link>
      </p>
    </Container>
  );
}
