import { useState } from 'react';
import { useNavigate } from 'react-router';
import Container from '../../components/layout/Container';
import { Alert, Button, Card, CardBody, CardHeader, PageSpinner } from '../../components/ui';
import { OtpVerify } from '../../components/auth';
import PersonalInfoForm from './PersonalInfoForm';
import StepHeading from '../../components/layout/StepHeading';
import { authApi } from '../../api/endpoints';
import { useProgram, useSetSession } from '../../hooks/useSession';

/**
 * Yeni başvuru: Adım 1 (kişisel bilgiler) -> Adım 2 (SMS doğrulama).
 * Bilgiler backend'de doğrulanmadan kaydedilmez; token ile taşınır.
 */
export default function RegisterPage() {
  const navigate = useNavigate();
  const setSession = useSetSession();
  const program = useProgram();
  const [values, setValues] = useState(null);
  const [flow, setFlow] = useState(null); // { registrationToken, maskedPhone, expiresIn, resendIn }

  if (program.isLoading) return <PageSpinner />;

  if (program.data && !program.data.open) {
    return (
      <Container size="md">
        <Alert variant="warning" title="Başvurular şu an kapalı" action={<Button to="/" variant="secondary">Ana sayfaya dön</Button>}>
          {program.data.message}
        </Alert>
      </Container>
    );
  }

  const start = async (formValues) => {
    const res = await authApi.registerStart(formValues);
    setValues(formValues);
    setFlow(res);
  };

  const verify = async (code) => {
    const me = await authApi.registerVerify(flow.registrationToken, code);
    setSession(me);
    navigate('/basvuru', { replace: true });
  };

  const resend = () => authApi.registerResend(flow.registrationToken);

  return (
    <Container size="xl">
      <div className={flow ? 'mx-auto max-w-xl' : 'mx-auto max-w-6xl'}>
        <StepHeading step={flow ? 2 : 1} title={flow ? 'Telefon Doğrulama' : 'Kişisel Bilgiler'} />

        {flow ? (
          <Card>
            <CardHeader title="SMS ile doğrulayın" description="Telefonunuza gelen 6 haneli kodu girin." />
            <CardBody>
              <OtpVerify
                info={flow}
                onVerify={verify}
                onResend={resend}
                onBack={() => setFlow(null)}
                submitLabel="Doğrula ve Başvuruya Devam Et"
              />
            </CardBody>
          </Card>
        ) : (
          <PersonalInfoForm defaultValues={values} onSubmit={start} />
        )}
      </div>
    </Container>
  );
}