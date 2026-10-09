import { Controller } from 'react-hook-form';
import ConsentCheck from './ConsentCheck';

/**
 * react-hook-form ile onay kutusu (davranış: ConsentCheck).
 *   <ConsentCheckbox control={control} name="consents.kvkk" type="kvkk" error={...} />
 *   <ConsentCheckbox ... withText={false} />   metin açılmaz, kutu doğrudan işaretlenir
 */
export default function ConsentCheckbox({ control, name, type, error, withText = true }) {
  return (
    <div>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <ConsentCheck id={name} type={type} withText={withText} checked={field.value} onChange={field.onChange}
            onBlur={field.onBlur} inputRef={field.ref} invalid={!!error} />
        )}
      />
      {error && <p className="mt-1 pl-8 text-xs font-medium text-accent-600">{error}</p>}
    </div>
  );
}
