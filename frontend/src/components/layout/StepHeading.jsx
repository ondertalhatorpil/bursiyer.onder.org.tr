import { APPLICATION_STEPS } from '../../config';

/** Sayfa başlığı + "Adım X / 7" ilerleme çubuğu */
export default function StepHeading({ step, title, subtitle }) {
  const total = APPLICATION_STEPS.length;
  return (
    <div className="mb-6 sm:mb-8">
      <p className="text-sm font-semibold text-accent-600">
        Adım {step} / {total}
      </p>
      <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{title}</h1>
      {subtitle && <p className="mt-2 max-w-2xl text-slate-600">{subtitle}</p>}
      <div className="mt-4 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-slate-200" aria-hidden>
        <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${(step / total) * 100}%` }} />
      </div>
    </div>
  );
}
