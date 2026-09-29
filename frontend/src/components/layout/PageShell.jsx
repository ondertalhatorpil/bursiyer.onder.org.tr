import { Outlet, ScrollRestoration, useLocation } from 'react-router';
import clsx from 'clsx';
import SiteHeader from './SiteHeader';

/** Dikeyde ortalanan sayfalar (içerik sığmazsa üstten başlar) */
const isCentered = (path) => ['/', '/giris', '/kayit'].includes(path) || path.startsWith('/basvuru');

export default function PageShell() {
  const { pathname } = useLocation();
  const isHome = pathname === '/';
  const centered = isCentered(pathname);

  return (
    <div className="relative flex min-h-dvh flex-col">
      <a href="#icerik" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">
        İçeriğe geç
      </a>

      <SiteHeader />

      <main
        id="icerik"
        className={clsx(
          'flex-1',
          // Üstte yüzen menü için boşluk (anasayfa hariç, her ekran boyutunda)
          !isHome && 'pt-20 sm:pt-24',
          centered ? 'flex flex-col' : 'pb-12',
        )}
      >
        <Outlet />
      </main>
      <ScrollRestoration />
    </div>
  );
}