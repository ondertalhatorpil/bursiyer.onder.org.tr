import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, MapPinned, Pencil, UserPlus } from 'lucide-react';
import clsx from 'clsx';
import { Alert, Badge, Button, Modal, PageSpinner } from '../../../components/ui';
import { usersApi } from '../../../api/adminEndpoints';
import { useAdminSession } from '../../../hooks/useAdmin';
import { formatDateTime } from '../../../lib/format';
import UserFormModal from './UserFormModal';
import ScopesModal from './ScopesModal';
import TempPasswordModal from './TempPasswordModal';

const KEY = ['admin', 'users'];

export default function UsersPage() {
  const qc = useQueryClient();
  const { admin: me } = useAdminSession();
  const { data, isLoading, error } = useQuery({ queryKey: KEY, queryFn: usersApi.list });
  const [form, setForm] = useState(null); // { user|null }
  const [scopeUser, setScopeUser] = useState(null);
  const [temp, setTemp] = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState(null);

  if (isLoading) return <PageSpinner />;
  if (error) return <Alert variant="error">{error.message}</Alert>;

  const scopeRoles = data.roles.filter((r) => r.usesScopes).map((r) => r.code);
  const refresh = () => qc.invalidateQueries({ queryKey: KEY });

  const doReset = async () => {
    setResetting(true); setResetError(null);
    try {
      const res = await usersApi.resetPassword(resetUser.id);
      setResetUser(null);
      setTemp(res);
      refresh();
    } catch (err) {
      setResetError(err.message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Kullanıcılar</h1>
          <p className="text-sm text-slate-500">Panel kullanıcıları, rolleri ve koordinatörlerin yetki alanları.</p>
        </div>
        <Button icon={UserPlus} onClick={() => setForm({ user: null })}>Yeni kullanıcı</Button>
      </div>

      <ul className="grid gap-3 xl:grid-cols-2">
        {data.items.map((u) => {
          const needsScope = scopeRoles.includes(u.role);
          return (
            <li key={u.id} className={clsx('rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:p-5', !u.isActive && 'opacity-70')}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{u.fullName} {u.id === me?.id && <span className="text-xs font-normal text-slate-500">(siz)</span>}</p>
                  <p className="truncate text-sm text-slate-600">{u.email} · {u.phone}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone="brand">{u.roleName}</Badge>
                  {!u.isActive && <Badge tone="neutral">Pasif</Badge>}
                  {u.lockedUntil && <Badge tone="danger">Kilitli</Badge>}
                  {u.mustChangePassword && u.isActive && <Badge tone="warning">Şifre değiştirmedi</Badge>}
                </div>
              </div>

              {needsScope && (
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Yetki alanı</p>
                  {u.scopes.length ? (
                    <ul className="mt-1 flex flex-wrap gap-1.5">
                      {u.scopes.map((s) => <li key={s.id} className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700">{s.label}</li>)}
                    </ul>
                  ) : <p className="mt-1 text-sm font-medium text-amber-700">Tanımlı değil, hiçbir başvuruyu göremez.</p>}
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <p className="text-xs text-slate-500">Son giriş: {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'hiç'}</p>
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setForm({ user: u })}>Düzenle</Button>
                  {needsScope && <Button size="sm" variant="ghost" icon={MapPinned} onClick={() => setScopeUser(u)}>Yetki alanı</Button>}
                  {u.id !== me?.id && <Button size="sm" variant="ghost" icon={KeyRound} onClick={() => { setResetError(null); setResetUser(u); }}>Şifre sıfırla</Button>}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <UserFormModal open={!!form} user={form?.user} roles={data.roles} isSelf={form?.user?.id === me?.id}
        onClose={() => setForm(null)}
        onSaved={(res) => {
          setForm(null);
          refresh();
          if (res.tempPassword) setTemp(res);
          else if (res.user && scopeRoles.includes(res.user.role) && !res.user.scopes.length) setScopeUser(res.user);
        }} />
      <ScopesModal user={scopeUser} onClose={() => setScopeUser(null)} onSaved={() => { setScopeUser(null); refresh(); }} />
      <TempPasswordModal data={temp} onClose={() => {
        const created = temp?.user;
        setTemp(null);
        if (created && scopeRoles.includes(created.role) && !created.scopes.length) setScopeUser(created);
      }} />
      <Modal open={!!resetUser} onClose={() => setResetUser(null)} title="Şifre sıfırlansın mı?" size="sm"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setResetUser(null)}>Vazgeç</Button>
            <Button variant="danger" loading={resetting} onClick={doReset}>Sıfırla</Button>
          </>
        )}>
        {resetUser && (
          <div className="space-y-3 text-sm text-slate-600">
            <p><strong>{resetUser.fullName}</strong> için yeni geçici şifre oluşturulacak. Eski şifresi geçersiz olur, açık oturumları kapanır ve hesap kilidi açılır.</p>
            {resetError && <Alert variant="error">{resetError}</Alert>}
          </div>
        )}
      </Modal>
    </div>
  );
}
