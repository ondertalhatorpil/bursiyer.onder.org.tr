import { ArrowRight, LogIn, Calendar, Clock, ShieldCheck } from 'lucide-react';
import Container from '../../components/layout/Container';
import { Alert, Badge, Button } from '../../components/ui';
import { formatDateTime } from '../../lib/format';
import { SITE } from '../../config';

export default function Hero({ program }) {
  const open = program?.open;

  return (
    <section className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden border-b border-slate-200/80 bg-slate-50/60 pb-12 pt-20 sm:pb-16 sm:pt-24">
      {/* Kurumsal hafif ızgara deseni */}
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_70%_50%_at_50%_0%,#000_60%,transparent_100%)] opacity-35 sm:bg-[size:4rem_4rem]"
        aria-hidden
      />

      <Container>
        <div className="relative mx-auto max-w-3xl px-2 text-center sm:px-0">
          
          {/* Program Alt Başlığı */}
          {program?.name && (
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 sm:text-sm">
              {program.name}
            </p>
          )}

          {/* Ana Başlık */}
          <h1 className="mt-2.5 text-3xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            {SITE.shortName} <span className="block sm:inline">{SITE.programTitle}</span>
          </h1>

          {/* Açıklama */}
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-600 sm:mt-5 sm:text-base lg:text-lg">
            Lise, lisans ve lisansüstü öğrencilerine yönelik burs destek programı.
            Başvurunuzu sistem üzerinden güvenle tamamlayabilirsiniz.
          </p>

          {/* Tarih Kartı */}
          {((open && program?.closesAt) || (!open && program?.opensAt)) && (
            <div className="mt-5 inline-flex max-w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-600 shadow-sm sm:mt-6 sm:text-sm">
              <Calendar className="size-4 shrink-0 text-slate-400" />
              <span className="truncate">
                {open && program?.closesAt && (
                  <>Son Başvuru: <strong className="font-semibold text-slate-900">{formatDateTime(program.closesAt)}</strong></>
                )}
                {!open && program?.opensAt && new Date(program.opensAt) > new Date() && (
                  <>Başlangıç: <strong className="font-semibold text-slate-900">{formatDateTime(program.opensAt)}</strong></>
                )}
              </span>
            </div>
          )}

          {/* Aksiyon Butonları */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {open && (
              <Button
                to="/kayit"
                size="lg"
                iconRight={ArrowRight}
                className="w-full justify-center py-3.5 text-base font-medium shadow-sm active:scale-[0.99] sm:w-auto sm:text-sm"
              >
                Yeni Başvuru Yap
              </Button>
            )}
            <Button
              to="/giris"
              size="lg"
              variant="secondary"
              icon={LogIn}
              className="w-full justify-center border-slate-300 bg-white py-3.5 text-base font-medium text-slate-700 shadow-sm hover:bg-slate-50 active:scale-[0.99] sm:w-auto sm:text-sm"
            >
              Başvuruma Devam Et
            </Button>
          </div>

          {/* Bilgi / Güven Rozetleri */}
          <div className="mt-10 flex items-center justify-center divide-x divide-slate-200 text-xs text-slate-500 sm:gap-x-6 sm:divide-x-0">
            <div className="flex items-center gap-1.5 px-3 sm:px-0">
              <ShieldCheck className="size-4 shrink-0 text-emerald-600" />
              <span>KVKK Uyumlu</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 sm:px-0">
              <Clock className="size-4 shrink-0 text-slate-400" />
              <span>~10 Dk Süre</span>
            </div>
          </div>

          {/* Uyarı Mesajı */}
          {!open && program?.message && (
            <div className="mt-6 text-left sm:mt-8">
              <Alert variant="warning">{program.message}</Alert>
            </div>
          )}

        </div>
      </Container>
    </section>
  );
}