import { Outlet, ScrollRestoration } from 'react-router';
import SiteHeader from './SiteHeader';

/** Tüm sayfaların ortak düzeni: üst menü + içerik */
export default function PageShell() {
  return (
    <div className="relative flex min-h-dvh flex-col bg-white">
      <a 
        href="#icerik" 
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2"
      >
        İçeriğe geç
      </a>

      {/* Header sayfa akışında yer kaplamaz, içeriğin üzerinde yüzer */}
      <SiteHeader />

      {/* pt kaldırıldı, içerik doğrudan en tepeden başlar */}
      <main id="icerik" className="flex-1 pb-12">
        <Outlet />
      </main>

      <ScrollRestoration />
    </div>
  );
}