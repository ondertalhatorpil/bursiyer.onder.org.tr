import { useNavigate } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, PageSpinner } from '../../../components/ui';
import StepPage from '../shared/StepPage';
import StepActions from '../shared/StepActions';
import DocumentCard from './DocumentCard';
import { documentsApi } from '../../../api/endpoints';
import { APPLICATION_KEY } from '../../../hooks/useApplication';

export const DOCUMENTS_KEY = ['documents'];

/** Adım 6: istenen belgelerin yüklenmesi */
export default function DocumentsStep() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({ queryKey: DOCUMENTS_KEY, queryFn: documentsApi.list });

  const onChange = (list) => {
    qc.setQueryData(DOCUMENTS_KEY, list);
    qc.invalidateQueries({ queryKey: APPLICATION_KEY });
  };

  const required = data?.items.filter((i) => i.required) || [];
  const uploaded = required.filter((i) => i.upload).length;

  return (
    <StepPage
      step={6}
      title="Belge Yükleme"
      description="Lütfen istenen belgeleri e-Devlet Kapısı üzerinden oluşturulmuş, karekodlu ve resmi PDF formatında yükleyiniz. Ekran görüntüsü, fotoğraf çekimi veya okunaksız taranmış belgeler kesinlikle değerlendirmeye alınmayacaktır."
      footer={(
        <StepActions step={6} onNext={() => navigate('/basvuru/ozet')} nextLabel="Devam Et" nextDisabled={!data?.complete}
          hint={data && !data.complete ? `Yüklenen Zorunlu Belgeler: ${uploaded} / ${required.length}` : undefined} />
      )}
    >
      {isLoading && <PageSpinner />}
      {error && <Alert variant="error" action={<Button onClick={() => refetch()}>Tekrar dene</Button>}>{error.message}</Alert>}
      {data && !data.canUpload && data.reason && (
        <Alert variant="warning" action={<Button to="/basvuru/egitim" variant="secondary" size="sm">Eğitim bilgilerine git</Button>}>{data.reason}</Alert>
      )}
      {data?.items.length > 0 && (
        <div className="space-y-4">
          {data.items.map((item) => <DocumentCard key={item.code} item={item} onChange={onChange} />)}
        </div>
      )}
    </StepPage>
  );
}
