/**
 * Başvuru verisi (GET /application) ve güncelleme yardımcıları.
 * Her kayıt işleminden sonra backend güncel başvuruyu döndürür; önbelleğe yazılır.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { applicationApi } from '../api/endpoints';
import { SESSION_KEY } from './useSession';

export const APPLICATION_KEY = ['application'];

export function useApplication() {
  const query = useQuery({
    queryKey: APPLICATION_KEY,
    queryFn: async () => (await applicationApi.get()).application,
  });
  return { application: query.data, isLoading: query.isLoading, error: query.error, refetch: query.refetch };
}

/** Backend'in döndürdüğü application nesnesini önbelleğe yazar, oturum özetini tazeler */
export function useApplicationUpdater() {
  const qc = useQueryClient();
  return (application) => {
    if (application) qc.setQueryData(APPLICATION_KEY, application);
    qc.invalidateQueries({ queryKey: SESSION_KEY });
    qc.invalidateQueries({ queryKey: ['documents'] });
    qc.invalidateQueries({ queryKey: ['summary'] });
  };
}
