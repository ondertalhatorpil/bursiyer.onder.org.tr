/**
 * Oturum: /auth/me sorgusu. Oturum yoksa (401) `me` null olur.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { authApi, publicApi } from '../api/endpoints';

export const SESSION_KEY = ['me'];

export function useSession() {
  const query = useQuery({
    queryKey: SESSION_KEY,
    queryFn: async () => {
      try {
        return await authApi.me();
      } catch (err) {
        if (err.status === 401) return null;
        throw err;
      }
    },
    staleTime: 60_000,
  });
  return { me: query.data ?? null, isLoading: query.isLoading, error: query.error, refetch: query.refetch };
}

/** Giriş/kayıt doğrulanınca dönen { applicant, application } ile oturumu günceller */
export function useSetSession() {
  const qc = useQueryClient();
  return (data) => qc.setQueryData(SESSION_KEY, data);
}

export function useLogout() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      qc.setQueryData(SESSION_KEY, null);
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' && q.queryKey[0] !== 'public' });
      navigate('/', { replace: true });
    },
  });
}

export function useProgram() {
  return useQuery({ queryKey: ['public', 'program'], queryFn: publicApi.program, staleTime: 60_000 });
}
