import Container from '../components/layout/Container';
import { Button } from '../components/ui';

export default function NotFound() {
  return (
    <Container size="sm" className="py-16 text-center">
      <p className="text-6xl font-extrabold text-brand-200">404</p>
      <h1 className="mt-4 text-2xl font-extrabold">Sayfa bulunamadı</h1>
      <p className="mt-2 text-slate-600">Aradığınız sayfa taşınmış veya kaldırılmış olabilir.</p>
      <Button to="/" className="mt-8">Ana sayfaya dön</Button>
    </Container>
  );
}
