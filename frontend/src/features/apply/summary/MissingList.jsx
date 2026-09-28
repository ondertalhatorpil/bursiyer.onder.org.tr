import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { Alert } from '../../../components/ui';
import { STEP_ROUTES } from '../../../config';

/** Gönderim öncesi eksikler; her biri ilgili adıma bağlantı */
export default function MissingList({ missing }) {
  if (!missing?.length) return null;
  return (
    <Alert variant="warning" title="Başvurunuzu göndermeden önce tamamlamanız gerekenler">
      <ul className="mt-1 space-y-1.5">
        {missing.map((m) => (
          <li key={m.field}>
            <Link to={STEP_ROUTES[m.step] || '/basvuru'} className="inline-flex items-center gap-1.5 font-semibold underline-offset-2 hover:underline">
              Adım {m.step}: {m.message} <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </Alert>
  );
}
