import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Button, Field, MaskedInput, MASKS, Modal, RadioCardGroup, Switch, TextInput } from '../../../components/ui';
import { usersApi } from '../../../api/adminEndpoints';
import { applyApiErrors } from '../../../lib/form-errors';

/** Kullanıcı ekleme / düzenleme. user null ise yeni kullanıcı. */
export default function UserFormModal({ open, user, roles, isSelf, onClose, onSaved }) {
  const editing = !!user;
  const { register, handleSubmit, control, setError, reset, formState: { errors, isSubmitting } } = useForm();

  useEffect(() => {
    if (open) {
      reset(editing
        ? { email: user.email, fullName: user.fullName, phone: user.phone || '', role: user.role, isActive: user.isActive }
        : { email: '', fullName: '', phone: '', role: 'coordinator', isActive: true });
    }
  }, [open, user, editing, reset]);

  const submit = handleSubmit(async (v) => {
    try {
      const body = { email: v.email, fullName: v.fullName, phone: v.phone, role: v.role };
      if (editing) {
        if (!isSelf) body.isActive = v.isActive;
        if (isSelf) delete body.role;
        onSaved({ user: await usersApi.update(user.id, body) });
      } else {
        onSaved(await usersApi.create(body));
      }
    } catch (err) {
      applyApiErrors(err, setError, ['email', 'fullName', 'phone', 'role', 'isActive']);
    }
  });

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Kullanıcıyı düzenle' : 'Yeni kullanıcı'} size="md"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Vazgeç</Button>
          <Button type="submit" form="user-form" loading={isSubmitting}>{editing ? 'Kaydet' : 'Ekle'}</Button>
        </>
      )}>
      <form id="user-form" onSubmit={submit} noValidate className="space-y-4">
        {errors.root && <Alert variant="error">{errors.root.message}</Alert>}
        <Field label="Ad soyad" htmlFor="u-name" required error={errors.fullName?.message}>
          <TextInput id="u-name" autoComplete="off" invalid={!!errors.fullName} {...register('fullName')} />
        </Field>
        <Field label="E-posta" htmlFor="u-email" required error={errors.email?.message}>
          <TextInput id="u-email" type="email" autoComplete="off" invalid={!!errors.email} {...register('email')} />
        </Field>
        <Field label="Cep telefonu" htmlFor="u-phone" required error={errors.phone?.message} hint="Girişte SMS kodu bu numaraya gider.">
          <Controller name="phone" control={control} render={({ field }) => (
            <MaskedInput id="u-phone" mask={MASKS.phone} value={field.value} onChange={field.onChange} invalid={!!errors.phone} inputMode="tel" />
          )} />
        </Field>
        <Field label="Rol" htmlFor="u-role" required error={errors.role?.message}
          hint={isSelf ? 'Kendi rolünüzü değiştiremezsiniz.' : undefined}>
          <Controller name="role" control={control} render={({ field }) => (
            <RadioCardGroup name="role" size="sm" value={field.value} onChange={field.onChange} disabled={isSelf}
              options={roles.map((r) => ({ value: r.code, label: r.name, description: r.description }))} />
          )} />
        </Field>
        {editing && !isSelf && (
          <Controller name="isActive" control={control} render={({ field }) => (
            <Switch id="u-active" checked={!!field.value} onChange={field.onChange} label="Hesap aktif"
              description="Pasif hesap giriş yapamaz; açık oturumları hemen kapanır." />
          )} />
        )}
      </form>
    </Modal>
  );
}
