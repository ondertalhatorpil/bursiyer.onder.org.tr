import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Modal, PageSpinner } from '../ui';
import { publicApi } from '../../api/endpoints';

/** KVKK / rıza / şart metnini modalda gösterir (backend'deki yayındaki versiyon) */
export default function ConsentModal({ type, open, onClose, onAccept }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['public', 'consent', type],
    queryFn: () => publicApi.consent(type),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={data?.title || 'Metin'}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Kapat</Button>
          {onAccept && data && <Button onClick={() => { onAccept(); onClose(); }}>Okudum, onaylıyorum</Button>}
        </>
      )}
    >
      {isLoading && <PageSpinner />}
      {error && <Alert variant="error">{error.message}</Alert>}
      {data && <div className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{data.body}</div>}
    </Modal>
  );
}
