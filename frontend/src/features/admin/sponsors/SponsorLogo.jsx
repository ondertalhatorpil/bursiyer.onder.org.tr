import { Building2 } from 'lucide-react';
import clsx from 'clsx';
import { sponsorsApi } from '../../../api/adminEndpoints';

/** Firma logosu; logo yoksa bina ikonu */
export default function SponsorLogo({ sponsor, className = 'size-12' }) {
  return (
    <span className={clsx('grid shrink-0 place-items-center overflow-hidden rounded-xl bg-white ring-1 ring-slate-200', className)}>
      {sponsor.hasLogo
        ? <img src={sponsorsApi.logoUrl(sponsor.id, sponsor.logoVersion)} alt="" className="size-full object-contain p-1" />
        : <Building2 className="size-1/2 text-slate-400" aria-hidden />}
    </span>
  );
}
