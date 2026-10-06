import { Controller, useWatch } from 'react-hook-form';
import { Field, RadioCardGroup, SearchSelect, Select, TextInput } from '../../../components/ui';
import { CitySelect, CountrySelect, DistrictSelect, DormitorySelect, SchoolPicker } from '../../../components/lookups';

const SCHOOL_FILTERS = { is_sports: 'sports', is_international: 'international' };

/**
 * Kanal / alt birim ek alanlarını backend'deki tanıma göre çizer.
 * Admin panelinden yeni alan eklenirse burada kod değişikliği gerekmez.
 *
 * Tanım: { key, type: text|radio|select|country|city|district|school|dormitory, label, required, options?,
 *          showIf?: { alan: değer }, cityId?, excludeCityIds?, cityField?, filter?, maxLength? }
 * Değerler react-hook-form'da "fields.<key>" altında tutulur.
 * cityField'lı okul, o il alanında seçilen ilin okullarından seçilir; il değişince okul temizlenir.
 */
export default function DynamicFields({ definitions = [], control, setValue, errors = {} }) {
  const values = useWatch({ control, name: 'fields' }) || {};
  const visible = definitions.filter((d) => !d.showIf || Object.entries(d.showIf).every(([k, v]) => values[k] === v));
  if (!visible.length) return null;

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {visible.map((def) => {
        const name = `fields.${def.key}`;
        const id = `field-${def.key}`;
        const error = errors[def.key]?.message;
        const wide = def.type === 'radio' || def.type === 'school';
        return (
          <Field key={def.key} label={def.label} htmlFor={id} required={def.required} error={error} className={wide ? 'sm:col-span-2' : undefined}>
            <Controller
              control={control}
              name={name}
              render={({ field }) => renderInput(def, id, field, !!error, {
                values,
                // Bu ile bağlı okul alanları il değişince temizlenir
                onCityChange: () => definitions.filter((d) => d.cityField === def.key)
                  .forEach((d) => setValue?.(`fields.${d.key}`, '')),
              })}
            />
          </Field>
        );
      })}
    </div>
  );
}

function renderInput(def, id, field, invalid, { values, onCityChange }) {
  const common = { id, value: field.value ?? '', onChange: field.onChange, invalid };
  switch (def.type) {
    case 'text':
      return <TextInput {...common} onChange={(e) => field.onChange(e.target.value)} onBlur={field.onBlur} maxLength={def.maxLength} ref={field.ref} />;
    case 'radio':
      return (
        <RadioCardGroup name={id} size="sm" value={field.value} onChange={field.onChange} invalid={invalid}
          options={(def.options || []).map((o) => (typeof o === 'object' ? o : { value: o, label: o }))} />
      );
    case 'select': {
      const options = (def.options || []).map((o) => (typeof o === 'object' ? o : { value: o, label: o }));
      // Uzun listeler (ör. spor branşları) aranabilir
      if (def.searchable || options.length > 12) {
        return <SearchSelect {...common} options={options} searchPlaceholder={`${def.label} arayınız…`} />;
      }
      return <Select {...common} onChange={(e) => field.onChange(e.target.value)} options={options} />;
    }
    case 'country':
      return <CountrySelect {...common} />;
    case 'city':
      return <CitySelect {...common} excludeIds={def.excludeCityIds} onChange={(v) => { field.onChange(v); onCityChange(); }} />;
    case 'district':
      return <DistrictSelect {...common} cityId={def.cityId} />;
    case 'school': {
      if (def.cityField) return <SchoolPicker {...common} byCity cityId={values[def.cityField]} />;
      const filterKey = Object.keys(def.filter || {})[0];
      return <SchoolPicker {...common} filter={SCHOOL_FILTERS[filterKey]} />;
    }
    case 'dormitory':
      return <DormitorySelect {...common} />;
    default:
      return <TextInput {...common} onChange={(e) => field.onChange(e.target.value)} />;
  }
}
