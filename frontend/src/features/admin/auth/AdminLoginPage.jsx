import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { LockKeyhole } from 'lucide-react';
import { Alert, Button, Card, CardBody, CardHeader, Field, TextInput } from '../../../components/ui';
import { OtpVerify } from '../../../components/auth';
import Logo from '../../../components/layout/Logo';
import { adminAuthApi } from '../../../api/adminEndpoints';
import { useSetAdmin } from '../../../hooks/useAdmin';

/** Admin girişi: e-posta + şifre -> SMS kodu */
export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const setAdmin = useSetAdmin();
  const [flow, setFlow] = useState(null);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({ defaultValues: { email: '', password: '' } });

  const login = handleSubmit(async ({ email, password }) => {
    try {
      setFlow(await adminAuthApi.login(email, password));
    } catch (err) {
      setError('root', { message: err.message });
    }
  });

  const verify = async (code) => {
    const { admin } = await adminAuthApi.verify(flow.loginToken, code);
    setAdmin(admin);
    navigate(admin.mustChangePassword ? '/admin/sifre' : (state?.from || '/admin'), { replace: true });
  };

  return (
    <div className="grid min-h-dvh place-items-center bg-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <Card>
          <CardHeader eyebrow="Burs Yönetim Paneli" title={flow ? 'SMS doğrulama' : 'Giriş yapın'}
            description={flow ? 'Telefonunuza gelen kodu girin.' : 'Yetkili personel girişi'} />
          <CardBody>
            {flow ? (
              <OtpVerify info={flow} onVerify={verify} onResend={() => adminAuthApi.resend(flow.loginToken)} onBack={() => setFlow(null)} submitLabel="Giriş Yap" />
            ) : (
              <form onSubmit={login} noValidate className="space-y-5">
                {errors.root && <Alert variant="error">{errors.root.message}</Alert>}
                <Field label="E-posta" htmlFor="email" required>
                  <TextInput id="email" type="email" autoComplete="username" autoFocus {...register('email', { required: true })} />
                </Field>
                <Field label="Şifre" htmlFor="password" required>
                  <TextInput id="password" type="password" autoComplete="current-password" {...register('password', { required: true })} />
                </Field>
                <Button type="submit" size="lg" icon={LockKeyhole} loading={isSubmitting} className="w-full">Devam Et</Button>
              </form>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
