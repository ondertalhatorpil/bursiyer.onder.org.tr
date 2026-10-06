import { useRouteError } from 'react-router';
import Container from '../components/layout/Container';
import { Alert, Button } from '../components/ui';

/** Beklenmeyen bir hata olursa beyaz ekran yerine bu sayfa gösterilir */
export default function ErrorPage() {
  const error = useRouteError();
  return (
    <Container size="sm" className="py-16">
      <Alert variant="error" title="Bir şeyler ters gitti" action={<Button onClick={() => window.location.assign('/')}>Ana sayfaya dön</Button>}>
        {error?.message || 'Beklenmeyen bir hata oluştu. Sayfayı yenileyip tekrar deneyiniz.'}
      </Alert>
    </Container>
  );
}
