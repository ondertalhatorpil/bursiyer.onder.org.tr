import { useState } from 'react';
import { ArrowRight, Calendar, Clock, LogIn, ShieldCheck } from 'lucide-react';
import Logo from '../../components/layout/Logo';
import { Alert, Button } from '../../components/ui';
import { formatLongDateTime } from '../../lib/format';
import { SITE } from '../../config';

/** Gecikmeli giriş animasyonu için */
const d = (ms) => ({ '--delay': `${ms}ms` });

/** "Son Başvuru Tarihi: 31 Ekim 2026 | Saat: 23.59" */
function DateLine({ label, iso }) {
  const { date, time } = formatLongDateTime(iso);
  return (
    <span>
      {label}: <strong className="font-semibold text-slate-900">{date}</strong>
      <span className="mx-1.5 text-slate-300" aria-hidden>|</span>
      Saat: <strong className="font-semibold text-slate-900 tabular-nums">{time}</strong>
    </span>
  );
}

/** Anasayfa: tam ekran, solda kurumsal kırmızı alan (görselli), sağda başvuru butonları */
export default function Hero({ program }) {
  const open = program?.open;
  const [imageOk, setImageOk] = useState(true);
  const showOpensAt = !open && program?.opensAt && new Date(program.opensAt) > new Date();

  return (
    <section className="grid flex-1 md:grid-cols-2">
      {/* Sol: kırmızı alan + yarı saydam görsel */}
      <aside className="relative flex items-center overflow-hidden bg-brand-700 px-6 py-12 text-white sm:px-10 md:py-16 lg:px-16">
        {imageOk && SITE.heroImage && (
          <img
            src={SITE.heroImage}
            alt=""
            aria-hidden
            onError={() => setImageOk(false)}
            className="absolute inset-0 size-full scale-125 object-cover object-center opacity-20 mix-blend-luminosity"
          />
        )}
        {/* Metnin okunması için görselin üstüne koyu geçiş */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-700/60 via-brand-700/40 to-brand-900/80" aria-hidden />

        <div className="relative ml-auto w-full max-w-lg">
          {program?.name && (
            <p className="anim-rise text-xs font-semibold uppercase tracking-[0.25em] text-white/70" style={d(100)}>
              {program.name}
            </p>
          )}
          <h1 className="anim-rise mt-4 text-4xl font-bold leading-[1.1] !text-white sm:text-5xl lg:text-6xl" style={d(250)}>
            {SITE.shortName}
            <span className="block">{SITE.programTitle}</span>
          </h1>
          <div className="anim-rise mt-8 h-px w-16 bg-white/50" style={d(400)} aria-hidden />
          <p className="anim-rise mt-8 max-w-md text-base leading-relaxed text-white/80 lg:text-lg" style={d(500)}>
            Lise, lisans ve lisansüstü kademelerinde öğrenim gören öğrencilere yönelik burs ve eğitim desteği programı.
          </p>
        </div>
      </aside>

      {/* Sağ: beyaz alan */}
      <div className="flex flex-col bg-white px-6 py-8 sm:px-10 lg:px-16">
        <div className="w-full max-w-md md:mr-auto">
          <Logo />
        </div>

        <div className="flex flex-1 items-center py-10">
          <div className="w-full max-w-md md:mr-auto">
            <p className="anim-rise text-xs font-semibold uppercase tracking-[0.2em] text-brand-700" style={d(300)}>
              {open ? `${program?.name ? `${program.name} Dönemi ` : ''}Başvuruları Başladı` : 'Başvurular kapalı'}
            </p>
            <h2 className="anim-rise mt-3 text-3xl font-bold tracking-tight text-slate-900" style={d(400)}>
              Online Burs Başvuru Portalı
            </h2>
            <p className="anim-rise mt-3 text-sm leading-relaxed text-slate-500" style={d(500)}>
              Başvurunuzu adımları takip ederek güvenli bir şekilde tamamlayabilir; taslak bilgilerinizi kaydederek dilediğiniz zaman kaldığınız yerden devam edebilirsiniz.
            </p>

            {(open && program?.closesAt) || showOpensAt ? (
              <p className="anim-rise mt-6 flex items-center gap-2 text-sm text-slate-600" style={d(600)}>
                <Calendar className="size-4 shrink-0 text-slate-400" aria-hidden />
                <DateLine label={open ? 'Son Başvuru Tarihi' : 'Başlangıç Tarihi'} iso={open ? program.closesAt : program.opensAt} />
              </p>
            ) : null}

            <div className="anim-rise mt-8 flex flex-col gap-3" style={d(700)}>
              {open && (
                <Button to="/kayit" size="lg" iconRight={ArrowRight} className="w-full justify-center">
                  Yeni Başvuru Başlat
                </Button>
              )}
              <Button to="/giris" size="lg" variant="secondary" icon={LogIn} className="w-full justify-center">
                Mevcut Başvuruya Devam Et
              </Button>
            </div>

            {!open && program?.message && (
              <div className="anim-rise mt-6" style={d(800)}>
                <Alert variant="warning">{program.message}</Alert>
              </div>
            )}

          
          </div>
        </div>
      </div>
    </section>
  );
}