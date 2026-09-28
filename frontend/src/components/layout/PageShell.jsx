import { Outlet, ScrollRestoration, useLocation } from 'react-router';
import clsx from 'clsx';
import SiteHeader from './SiteHeader';

/** Ekranın ortasına yerleşen (dikeyde ortalanan) sayfalar */
const CENTERED = ['/', '/giris'];
/** Header gösterilmeyen sayfalar */
const NO_HEADER = ['/'];

/** Tüm sayfaların ortak düzeni: üst menü + içerik */
export default function PageShell() {
  const { pathname } = useLocation();
  const centered = CENTERED.includes(pathname);
  const showHeader = !NO_HEADER.includes(pathname);

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#icerik" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">
        İçeriğe geç
      </a>
      {showHeader && <SiteHeader />}
      <main
        id="icerik"
        className={clsx('flex-1', centered ? 'flex flex-col' : 'pb-12 pt-8 sm:pt-12')}
      >
        <Outlet />
      </main>
      <ScrollRestoration />
    </div>
  );
}