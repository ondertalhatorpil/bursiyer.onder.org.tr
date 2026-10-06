import { useChannels, useCities, useDistricts, useDormitories, useSchools } from '../../../hooks/useLookups';

/**
 * Kanal ek alanlarını okunur hale getirir (id -> ad). Etiketler kanal tanımından gelir.
 * @returns [[etiket, değer], ...]
 */
export function useChannelFieldRows(application) {
  const { data: channels = [] } = useChannels(application.category);
  const { data: cities = [] } = useCities();
  const { data: dorms = [] } = useDormitories();
  const ch = channels.find((c) => c.id === application.channel?.id);
  const sub = ch?.subUnits.find((u) => u.id === application.channel?.subUnit?.id);
  const defs = [...(ch?.extraFields || []), ...(sub?.extraFields || [])];
  const values = application.channel?.fields || {};

  const districtDef = defs.find((d) => d.type === 'district');
  const { data: districts = [] } = useDistricts(districtDef?.cityId);
  // Okul adı: il alanına bağlıysa o ilin, değilse spor/uluslararası listesinden bulunur
  const schoolDef = defs.find((d) => d.type === 'school' && values[d.key] !== undefined);
  const schoolParams = !schoolDef ? null
    : schoolDef.cityField ? { cityId: values[schoolDef.cityField] }
      : { type: schoolDef.filter?.is_sports ? 'sports' : 'international' };
  const { data: schools = [] } = useSchools(schoolParams || {}, !!schoolParams);

  return defs
    .filter((d) => values[d.key] !== undefined)
    .map((d) => {
      const v = values[d.key];
      const byId = (list) => list.find((x) => String(x.id) === String(v))?.name;
      const option = (d.options || []).find((o) => (typeof o === 'object' ? o.value : o) === v);
      const display = {
        city: byId(cities),
        district: byId(districts),
        school: byId(schools),
        dormitory: byId(dorms),
        radio: typeof option === 'object' ? option.label : option,
        select: typeof option === 'object' ? option.label : option,
      }[d.type] ?? v;
      return [d.label, display];
    });
}
