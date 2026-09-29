import { createBrowserRouter } from 'react-router';
import PageShell from './components/layout/PageShell';
import { RedirectIfSession, RequireSession } from './components/routing/SessionGuards';
import LandingPage from './features/landing/LandingPage';
import RegisterPage from './features/register/RegisterPage';
import LoginPage from './features/login/LoginPage';
import ApplyLayout from './features/apply/ApplyLayout';
import ApplyIndex from './features/apply/ApplyIndex';
import RequireStep from './features/apply/shared/RequireStep';
import CategoryStep from './features/apply/category/CategoryStep';
import ChannelStep from './features/apply/channel/ChannelStep';
import EducationStep from './features/apply/education/EducationStep';
import DocumentsStep from './features/apply/documents/DocumentsStep';
import SummaryStep from './features/apply/summary/SummaryStep';
import StatusPage from './features/apply/status/StatusPage';
import { RedirectIfAdmin, RequireAdmin, RequirePermission } from './features/admin/layout/AdminGuards';
import NotFound from './pages/NotFound';
import ErrorPage from './pages/ErrorPage';

/**
 * Sayfalar:
 *   /          açılış (dönem durumu, kategoriler, adımlar)
 *   /kayit     yeni başvuru: Adım 1-2
 *   /giris     başvuruya devam: kimlik no + SMS
 *   /basvuru            kaldığı adıma yönlendirir (oturum gerekli)
 *   /basvuru/kategori   Adım 3
 *   /basvuru/kanal      Adım 4 (+ veli onayı)
 *   /basvuru/egitim     Adım 5
 *   /basvuru/belgeler   Adım 6
 *   /basvuru/ozet       Adım 7
 *   /basvuru/durum      gönderilmiş başvurunun durumu
 *
 * Admin paneli (ayrı düzen):
 *   /admin/giris                e-posta + şifre + SMS
 *   /admin/sifre                şifre değiştirme (ilk girişte zorunlu)
 *   /admin                      genel bakış
 *   /admin/basvurular           liste (filtreler adres çubuğunda)
 *   /admin/basvurular/:id       detay ve değerlendirme
 *   /admin/ayarlar/...          dönem, onay metinleri, ekran metinleri, SMS (manage_settings)
 *   /admin/firmalar             burs veren firmalar (manage_settings)
 *   /admin/kullanicilar         kullanıcılar ve yetki alanları (manage_users)
 *   /admin/islem-kayitlari      işlem kayıtları (manage_users)
 */
export const router = createBrowserRouter([
  {
    path: 'admin',
    errorElement: <ErrorPage />,
    children: [
      { element: <RedirectIfAdmin />, children: [{ path: 'giris', lazy: () => import('./features/admin/auth/AdminLoginPage').then((m) => ({ Component: m.default })) }] },
      {
        element: <RequireAdmin />,
        children: [
          {
            lazy: () => import('./features/admin/layout/AdminShell').then((m) => ({ Component: m.default })),
            children: [
              { index: true, lazy: () => import('./features/admin/dashboard/DashboardPage').then((m) => ({ Component: m.default })) },
              { path: 'basvurular', lazy: () => import('./features/admin/applications/ApplicationsPage').then((m) => ({ Component: m.default })) },
              { path: 'basvurular/:id', lazy: () => import('./features/admin/detail/ApplicationDetailPage').then((m) => ({ Component: m.default })) },
              { path: 'sifre', lazy: () => import('./features/admin/auth/ChangePasswordPage').then((m) => ({ Component: m.default })) },
              {
                element: <RequirePermission permission="manage_settings" />,
                children: [
                  { path: 'firmalar', lazy: () => import('./features/admin/sponsors/SponsorsPage').then((m) => ({ Component: m.default })) },
                  {
                    path: 'ayarlar',
                    lazy: () => import('./features/admin/settings/SettingsLayout').then((m) => ({ Component: m.default })),
                    children: [
                      { index: true, lazy: () => import('./features/admin/settings/ProgramSettings').then((m) => ({ Component: m.default })) },
                      { path: 'onay-metinleri', lazy: () => import('./features/admin/settings/ConsentSettings').then((m) => ({ Component: m.default })) },
                      { path: 'ekran-metinleri', lazy: () => import('./features/admin/settings/ContentSettings').then((m) => ({ Component: m.default })) },
                      { path: 'sms', lazy: () => import('./features/admin/settings/SmsSettings').then((m) => ({ Component: m.default })) },
                    ],
                  },
                ],
              },
              {
                element: <RequirePermission permission="manage_users" />,
                children: [
                  { path: 'kullanicilar', lazy: () => import('./features/admin/users/UsersPage').then((m) => ({ Component: m.default })) },
                  { path: 'islem-kayitlari', lazy: () => import('./features/admin/users/AuditLogPage').then((m) => ({ Component: m.default })) },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    element: <PageShell />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <LandingPage /> },
      {
        element: <RedirectIfSession />,
        children: [
          { path: 'kayit', element: <RegisterPage /> },
          { path: 'giris', element: <LoginPage /> },
        ],
      },
      {
        element: <RequireSession />,
        children: [
          {
            path: 'basvuru',
            element: <ApplyLayout />,
            children: [
              { index: true, element: <ApplyIndex /> },
              { path: 'kategori', element: <CategoryStep /> },
              { path: 'kanal', element: <RequireStep step={4}><ChannelStep /></RequireStep> },
              { path: 'egitim', element: <RequireStep step={5}><EducationStep /></RequireStep> },
              { path: 'belgeler', element: <RequireStep step={6}><DocumentsStep /></RequireStep> },
              { path: 'ozet', element: <RequireStep step={7}><SummaryStep /></RequireStep> },
              { path: 'durum', element: <StatusPage /> },
            ],
          },
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
