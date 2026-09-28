import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button, CardFooter } from '../../../components/ui';
import { STEP_ROUTES } from '../../../config';

/**
 * Adım alt çubuğu: Geri + ileri/kaydet.
 * onNext verilirse buton onu çalıştırır; yoksa `form` id'li formu gönderir.
 */
export default function StepActions({ step, nextDisabled, loading, nextLabel = 'Kaydet ve Devam Et', onNext, form, hint }) {
  const back = STEP_ROUTES[step - 1];
  return (
    <CardFooter>
      {back ? <Button to={back} variant="ghost" icon={ArrowLeft}>Geri</Button> : <span />}
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        {hint && <span className="text-center text-sm text-slate-500 sm:text-right">{hint}</span>}
        <Button
          type={onNext ? 'button' : 'submit'}
          form={form}
          onClick={onNext}
          loading={loading}
          disabled={nextDisabled}
          iconRight={ArrowRight}
          size="lg"
        >
          {nextLabel}
        </Button>
      </div>
    </CardFooter>
  );
}
