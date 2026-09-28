import { Link } from 'react-router';
import { LogIn, LogOut, User } from 'lucide-react';
import Logo from './Logo';
import Button from '../../components/ui/Button'; 
import { useLogout, useSession } from '../../hooks/useSession';

export default function SiteHeader() {
  const { me } = useSession();
  const logout = useLogout();

  // Premium mikro-etkileşimli sosyal medya buton stili
  const iconBtnClass =
    "group relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/70 bg-slate-50/50 text-slate-600 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:bg-white hover:text-brand-700 hover:shadow-xs active:translate-y-0";

  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-xl border-b border-slate-200/50 transition-colors duration-200">
      {/* Üst Kırmızı Vurgu Çizgisi */}
      <div className="h-[3px] w-full bg-gradient-to-r from-brand-800 via-brand-600 to-brand-800" />

      <div className="mx-auto flex h-16 sm:h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Sol: Logo */}
        <div className="flex shrink-0 items-center">
          <Link 
            to="/" 
            className="flex items-center transition-transform duration-200 hover:scale-[1.01] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 rounded-lg"
          >
            <Logo className="h-8 sm:h-11 w-auto object-contain" />
          </Link>
        </div>

        {/* Sağ: Sosyal Medya & Giriş / Profil Alanı */}
        <div className="flex items-center gap-3 sm:gap-6">
          
          {/* Sosyal Medya İkonları */}
          <nav aria-label="Sosyal Medya" className="hidden sm:flex items-center gap-2">
            
            {/* Instagram */}
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className={iconBtnClass}
            >
              <svg className="size-4 fill-currentColor transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zm0 10.162a3.999 3.999 0 1 1 0-7.998 3.999 3.999 0 0 1 0 7.998zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
              </svg>
            </a>

            {/* X / Twitter */}
            <a
              href="https://x.com"
              target="_blank"
              rel="noreferrer"
              aria-label="X (Twitter)"
              className={iconBtnClass}
            >
              <svg className="size-3.5 fill-currentColor transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>

            {/* Facebook */}
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noreferrer"
              aria-label="Facebook"
              className={iconBtnClass}
            >
              <svg className="size-4 fill-currentColor transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95C18.05 21.45 22 17.19 22 12z" />
              </svg>
            </a>

            {/* YouTube */}
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noreferrer"
              aria-label="YouTube"
              className={iconBtnClass}
            >
              <svg className="size-4 fill-currentColor transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </a>

            {/* WhatsApp */}
            <a
              href="https://wa.me/"
              target="_blank"
              rel="noreferrer"
              aria-label="WhatsApp"
              className={iconBtnClass}
            >
              <svg className="size-4 fill-currentColor transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.03-1.25-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.12-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1s.9 2.44 1.03 2.61c.12.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.44.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.07-.12-.22-.19-.47-.32z" />
              </svg>
            </a>
          </nav>

          {/* Dikey Ayırıcı Çizgi */}
          <span className="hidden sm:block h-6 w-px bg-slate-200/80" aria-hidden="true" />

          {/* Kullanıcı / Giriş Alanı */}
          <div>
            {me ? (
              <div className="flex items-center gap-2 rounded-full border border-slate-200/90 bg-slate-50/70 p-1 pl-3 shadow-xs transition-colors hover:border-brand-200 hover:bg-white">
                <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-slate-800">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-700 text-white shadow-xs">
                    <User className="size-4" />
                  </div>
                  <span className="max-w-[120px] sm:max-w-[170px] truncate font-semibold text-slate-700">
                    {me.applicant.firstName} {me.applicant.lastName}
                  </span>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => logout.mutate()}
                  loading={logout.isPending}
                  icon={LogOut}
                  title="Çıkış Yap"
                  aria-label="Çıkış Yap"
                  className="!h-8 !w-8 !p-0 !rounded-full text-slate-400 hover:text-accent-600 hover:bg-accent-50"
                />
              </div>
            ) : (
              <Button
                to="/giris"
                variant="primary"
                size="md"
                icon={LogIn}
                className="tracking-wider uppercase sm:text-xs"
              >
                Giriş Yap
              </Button>
            )}
          </div>

        </div>

      </div>

      {/* Alt Yumuşak Geçiş (Gradient & Gölge Maskesi) */}
      <div 
        className="pointer-events-none absolute -bottom-5 left-0 right-0 h-5 bg-gradient-to-b from-slate-900/[0.04] to-transparent" 
        aria-hidden="true" 
      />
    </header>
  );
}