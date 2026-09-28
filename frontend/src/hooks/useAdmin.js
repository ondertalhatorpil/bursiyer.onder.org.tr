import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminAuthApi } from '../api/adminEndpoints';

export const ADMIN_KEY = ['admin', 'me'];

/** Admin oturumu. Oturum yoksa admin = null */
export function useAdminSession() {
  const q = useQuery({
    queryKey: ADMIN_KEY,
    queryFn: async () => {
      try {
        return (await adminAuthApi.me()).admin;
      } catch (err) {
        if (err.status === 401) return null;
        throw err;
      }
    },
    staleTime: 60_000,
  });
  return { admin: q.data ?? null, isLoading: q.isLoading };
}

export function useSetAdmin() {
  const qc = useQueryClient();
  return (admin) => qc.setQueryData(ADMIN_KEY, admin);
}

export const can = (admin, permission) => !!admin?.permissions?.includes(permission);
