import { useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { KeyRound } from 'lucide-react';
import { Alert, Button, Card, CardBody, CardHeader, Field, TextInput } from '../../../components/ui';
import { adminAuthApi } from '../../../api/adminEndpoints';
import { useAdminSession, useSetAdmin } from '../../../hooks/useAdmin';
import { applyApiErrors } from '../../../lib/form-errors';

/** Şifre değiştirme (ilk girişte zorunlu) */
export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { admin } = useAdminSession();
  const setAdmin = useSetAdmin();
  const { register, handleSubmit, setError, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { currentPassword: '', newPassword: '', confirm: '' },
  });

  const submit = handleSubmit(async ({ currentPassword, newPassword, confirm }) => {
    if (newPassword !== confirm) return setError('confirm', { message: 'Şifreler eşleşmiyor' });
    try {
      const res = await adminAuthApi.changePassword(currentPassword, newPassword);
      setAdmin(res.admin);
      navigate('/admin', { replace: true });
    } catch (err) {
      applyApiErrors(err, setError, ['currentPassword', 'newPassword']);
    }
    return undefined;
  });

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader title="Şifre Değiştir" description={admin?.mustChangePassword ? 'Devam etmeden önce geçici şifrenizi değiştirin.' : undefined} />
        <CardBody>
          <form onSubmit={submit} noValidate className="space-y-5">
            {errors.root && <Alert variant="error">{errors.root.message}</Alert>}
            <Field label="Mevcut şifre" htmlFor="currentPassword" required error={errors.currentPassword?.message}>
              <TextInput id="currentPassword" type="password" autoComplete="current-password" invalid={!!errors.currentPassword} {...register('currentPassword')} />
            </Field>
            <Field label="Yeni şifre" htmlFor="newPassword" required error={errors.newPassword?.message} hint="En az 10 karakter; harf ve rakam içermeli">
              <TextInput id="newPassword" type="password" autoComplete="new-password" invalid={!!errors.newPassword} {...register('newPassword')} />
            </Field>
            <Field label="Yeni şifre (tekrar)" htmlFor="confirm" required error={errors.confirm?.message}>
              <TextInput id="confirm" type="password" autoComplete="new-password" invalid={!!errors.confirm} {...register('confirm')} />
            </Field>
            <Button type="submit" icon={KeyRound} loading={isSubmitting} disabled={!watch('newPassword')}>Şifreyi Kaydet</Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
