import Hero from './Hero';
import { PageSpinner } from '../../components/ui';
import { useProgram } from '../../hooks/useSession';

/** Anasayfa: sadece başvuru kartı (Yeni Başvuru / Başvuruma Devam Et) */
export default function LandingPage() {
  const { data, isLoading } = useProgram();
  if (isLoading) return <PageSpinner />;
  return <Hero program={data} />;
}
