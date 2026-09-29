import { APPLICATION_STEPS } from '../../config';

/** Sayfa başlığı + "Adım X / 7" ilerleme çubuğu (ortalı) */
export default function StepHeading({ step, title, subtitle }) {
  const total = APPLICATION_STEPS.length;
  return (
    <div className="mb-8 text-center sm:mb-10">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
        Adım {step} / {total}
      </p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1>
      {subtitle && <p className="mx-auto mt-2 max-w-2xl text-slate-600">{subtitle}</p>}
      <div className="mx-auto mt-5 h-1 w-full max-w-xs overflow-hidden rounded-full bg-slate-200" aria-hidden>
        <div className="h-full rounded-full bg-brand-700 transition-all duration-500" style={{ width: `${(step / total) * 100}%` }} />
      </div>
    </div>
  );
}