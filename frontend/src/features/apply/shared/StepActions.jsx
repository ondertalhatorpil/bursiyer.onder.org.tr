import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '../../../components/ui';
import { stepRoutesFor } from '../../../config';
import { useApplication } from '../../../hooks/useApplication';

/**
 * Adım alt çubuğu: Geri + ileri/kaydet.
 * Mobilde ekranın altına sabitlenir; geniş ekranda içeriğin altında durur.
 * onNext verilirse buton onu çalıştırır; yoksa `form` id'li formu gönderir.
 */
export default function StepActions({ step, nextDisabled, loading, nextLabel = 'Kaydet ve Devam Et', onNext, form, hint }) {
  const { application } = useApplication();
  const back = stepRoutesFor(application?.category)[step - 1];
  return (
    <div className="sticky bottom-0 z-10 -mx-4 border-t border-slate-200 bg-white/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:pb-0 lg:pt-6 lg:backdrop-blur-none">
      {hint && <p className="mb-3 text-center text-sm text-slate-500 lg:text-right">{hint}</p>}
      <div className="flex items-center gap-4">
        {back && (
          <Link
            to={back}
            className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-slate-600 transition-colors hover:text-brand-700"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Geri
          </Link>
        )}
        <Button
          type={onNext ? 'button' : 'submit'}
          form={form}
          onClick={onNext}
          loading={loading}
          disabled={nextDisabled}
          iconRight={ArrowRight}
          size="lg"
          className="ml-auto w-full sm:w-auto"
        >
          {nextLabel}
        </Button>
      </div>
    </div>
  );
}