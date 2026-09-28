/** Her adımın ortak çerçevesi: adım + başlık + açıklama + içerik + alt butonlar (kutusuz) */
export default function StepPage({ step, title, description, children, footer, aside }) {
  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Adım {step} / 7</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h2>
        {description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 sm:text-base">{description}</p>}
      </header>

      <div className="space-y-6">{children}</div>

      {footer}
      {aside}
    </div>
  );
}