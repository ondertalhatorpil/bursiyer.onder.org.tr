/** Form listeleri (il, ilçe, okul, üniversite, yurt, kanal, metin). Uzun süre önbellekte kalır. */
import { useQuery } from '@tanstack/react-query';
import { publicApi } from '../api/endpoints';

const LONG = { staleTime: 30 * 60_000, gcTime: 60 * 60_000 };

export const useCities = () => useQuery({ queryKey: ['public', 'cities'], queryFn: publicApi.cities, ...LONG });

export const useDistricts = (cityId) => useQuery({
  queryKey: ['public', 'districts', cityId],
  queryFn: () => publicApi.districts(cityId),
  enabled: !!cityId,
  ...LONG,
});

export const useSchools = (params, enabled = true) => useQuery({
  queryKey: ['public', 'schools', params],
  queryFn: () => publicApi.schools(params),
  enabled,
  ...LONG,
});

export const useUniversities = () => useQuery({ queryKey: ['public', 'universities'], queryFn: () => publicApi.universities({}), ...LONG });
export const useDormitories = () => useQuery({ queryKey: ['public', 'dormitories'], queryFn: publicApi.dormitories, ...LONG });

export const useChannels = (category) => useQuery({
  queryKey: ['public', 'channels', category],
  queryFn: () => publicApi.channels(category),
  enabled: !!category,
  ...LONG,
});

export const useConsentText = (type, enabled = true) => useQuery({
  queryKey: ['public', 'consent', type],
  queryFn: () => publicApi.consent(type),
  enabled: !!type && enabled,
  ...LONG,
});
