import { Link } from 'react-router';
import { SITE } from '../../config';

export default function Logo({ className = 'h-9 sm:h-11' }) {
  return (
    <Link 
      to="/" 
      className="group flex items-center gap-3 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2" 
      aria-label={`${SITE?.orgName || 'ÖNDER'} - Ana sayfa`}
    >
      <img
        src="/onder-logo.svg"
        alt={SITE?.orgName || 'ÖNDER İmam Hatipliler Derneği'}
        className={`${className} w-auto object-contain transition-transform duration-200 group-hover:scale-[1.01]`}
        loading="eager"
        decoding="async"
      />
    </Link>
  );
}