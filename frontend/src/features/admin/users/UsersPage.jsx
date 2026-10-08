import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, KeyRound, MapPinned, Pencil, UserPlus } from 'lucide-react';
import clsx from 'clsx';
import { Alert, Badge, Button, Modal, PageSpinner } from '../../../components/ui';
import { usersApi } from '../../../api/adminEndpoints';
import { useAdminSession } from '../../../hooks/useAdmin';
import { formatDateTime } from '../../../lib/format';
import UserFormModal from './UserFormModal';
import ScopesModal from './ScopesModal';
import GrantsModal from './GrantsModal';
import TempPasswordModal from './TempPasswordModal';

const KEY = ['admin', 'users'];

export default function UsersPage() {
  const qc = useQueryClient();
  const { admin: me } = useAdminSession();
  const { data, isLoading, error } = useQuery({ queryKey: KEY, queryFn: usersApi.list });
  const [form, setForm] = useState(null); // { user|null }
  const [scopeUser, setScopeUser] = useState(null);
  const [grantUser, setGrantUser] = useState(null);
  const [roleFilter, setRoleFilter] = useState('');
  const [temp, setTemp] = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState(null);

  if (isLoading) return <PageSpinner />;
  if (error) return <Alert variant="error">{error.message}</Alert>;

  const scopeRoles = data.roles.filter((r) => r.usesScopes).map((r) => r.code);
  const grantRoles = data.roles.filter((r) => r.usesGrants).map((r) => r.code);
  /** Kayıttan sonra: kapsamlı rolde yetki alanı, Genel Merkez Değerlendiricide yetki ver penceresi açılır */
  const followUp = (u) => {
    if (scopeRoles.includes(u.role) && !u.scopes.length) setScopeUser(u);
    else if (grantRoles.includes(u.role)) setGrantUser(u);
  };
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
          <p className="text-sm text-slate-500">Panel kullanıcıları, rolleri, koordinatörlerin yetki alanları ve ek yetkiler.</p>
        </div>
        <Button icon={UserPlus} onClick={() => setForm({ user: null })}>Yeni kullanıcı</Button>
      </div>

      {/* Rol filtresi (sayılarıyla) */}
      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
        <ul className="flex gap-1.5 pb-1" role="tablist" aria-label="Rol filtresi">
          {[{ code: '', name: 'Tümü' }, ...data.roles].map((r) => {
            const count = r.code ? data.items.filter((u) => u.role === r.code).length : data.items.length;
            const active = roleFilter === r.code;
            return (
              <li key={r.code || 'all'} className="shrink-0">
                <button type="button" role="tab" aria-selected={active} onClick={() => setRoleFilter(r.code)}
                  className={clsx(
                    'inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-sm font-semibold ring-1 ring-inset transition-colors',
                    active ? 'bg-brand-700 text-white ring-brand-700' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50',
                  )}>
                  {r.name}
                  <span className={clsx('min-w-6 rounded-full px-1.5 text-center text-xs tabular-nums', active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600')}>
                    {count}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <ul className="space-y-2">
        {data.items.filter((u) => !roleFilter || u.role === roleFilter).map((u) => {
          const needsScope = scopeRoles.includes(u.role);
          const usesGrants = grantRoles.includes(u.role);
          return (
            <li key={u.id}
              className={clsx(
                'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 rounded-xl bg-white px-4 py-2.5 ring-1 ring-slate-200',
                'lg:grid-cols-[minmax(0,15rem)_11rem_minmax(0,1fr)_8.5rem_auto]',
                !u.isActive && 'opacity-70',
              )}>
              {/* Ad, e-posta, telefon */}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {u.fullName}{u.id === me?.id && <span className="ml-1 text-xs font-normal text-slate-500">(siz)</span>}
                </p>
                <p className="truncate text-xs text-slate-500" title={`${u.email} · ${u.phone}`}>{u.email} · {u.phone}</p>
              </div>

              {/* İşlemler (mobilde sağ üstte) */}
              <div className="flex items-center justify-end gap-0.5 lg:order-last">
                <IconButton icon={Pencil} label="Düzenle" onClick={() => setForm({ user: u })} />
                {needsScope && <IconButton icon={MapPinned} label="Yetki alanı" onClick={() => setScopeUser(u)} />}
                {usesGrants && <IconButton icon={BadgeCheck} label="Yetki ver" onClick={() => setGrantUser(u)} />}
                {u.id !== me?.id && <IconButton icon={KeyRound} label="Şifre sıfırla" onClick={() => { setResetError(null); setResetUser(u); }} />}
              </div>

              {/* Rol ve durum */}
              <div className="col-span-2 flex flex-wrap items-center gap-1 lg:col-span-1">
                <Badge tone="brand">{u.roleName}</Badge>
                {!u.isActive && <Badge tone="neutral">Pasif</Badge>}
                {u.lockedUntil && <Badge tone="danger">Kilitli</Badge>}
                {u.mustChangePassword && u.isActive && <Badge tone="warning">Şifre değiştirmedi</Badge>}
              </div>

              {/* Yetki alanı / ek yetkiler */}
              <div className="col-span-2 min-w-0 lg:col-span-1">
                {needsScope && (u.scopes.length ? (
                  <ul className="flex min-w-0 flex-wrap gap-1" title={u.scopes.map((x) => x.label).join('\n')}>
                    {u.scopes.slice(0, 3).map((x) => (
                      <li key={x.id} className="max-w-full truncate rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">{x.label}</li>
                    ))}
                    {u.scopes.length > 3 && <li className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-600">+{u.scopes.length - 3}</li>}
                  </ul>
                ) : <p className="text-xs font-medium text-amber-700">Yetki alanı tanımlı değil, hiçbir başvuruyu göremez</p>)}
                {usesGrants && (u.yurtHq
                  ? <span className="inline-block rounded-md bg-brand-50 px-1.5 py-0.5 text-xs font-medium text-brand-800">Yurt Konaklama Bursu (Yurtlar Birimi)</span>
                  : <span className="text-xs text-slate-400">Tüm başvurular</span>)}
                {!needsScope && !usesGrants && <span className="text-xs text-slate-400">Tüm başvurular</span>}
              </div>

              {/* Son giriş */}
              <p className="col-span-2 text-xs text-slate-500 lg:col-span-1">
                <span className="lg:hidden">Son giriş: </span>{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : 'Hiç giriş yapmadı'}
              </p>
            </li>
          );
        })}
        {roleFilter && !data.items.some((u) => u.role === roleFilter) && (
          <li className="rounded-xl bg-white px-4 py-6 text-center text-sm text-slate-500 ring-1 ring-slate-200">Bu rolde kullanıcı yok.</li>
        )}
      </ul>

      <UserFormModal open={!!form} user={form?.user} roles={data.roles} isSelf={form?.user?.id === me?.id}
        onClose={() => setForm(null)}
        onSaved={(res) => {
          setForm(null);
          refresh();
          if (res.tempPassword) setTemp(res);
          else if (res.user && scopeRoles.includes(res.user.role) && !res.user.scopes.length) setScopeUser(res.user);
          else if (res.user && grantRoles.includes(res.user.role) && res.user.role !== form?.user?.role) setGrantUser(res.user);
        }} />
      <ScopesModal user={scopeUser} onClose={() => setScopeUser(null)} onSaved={() => { setScopeUser(null); refresh(); }} />
      <GrantsModal user={grantUser} onClose={() => setGrantUser(null)} onSaved={() => { setGrantUser(null); refresh(); }} />
      <TempPasswordModal data={temp} onClose={() => {
        const created = temp?.user;
        setTemp(null);
        if (created) followUp(created);
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

/** Satır içi ikon butonu (etiket fareyle üzerine gelince görünür) */
function IconButton({ icon: Icon, label, onClick }) {
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label}
      className="grid size-8 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-brand-50 hover:text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
      <Icon className="size-4" aria-hidden />
    </button>
  );
}
