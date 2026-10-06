import { useState } from 'react';
import { Controller } from 'react-hook-form';
import ConsentModal from './ConsentModal';
import { Checkbox } from '../ui';

/**
 * Onay kutusu + "metni oku" bağlantısı. Metin modalda açılır, "Okudum, onaylıyorum" kutuyu işaretler.
 * react-hook-form ile: <ConsentCheckbox control={control} name="consents.kvkk" type="kvkk" linkText="KVKK Aydınlatma Metni" ... />
 * Metin içinde birden fazla bağlantı gerekirse children fonksiyon verilir: {(link) => <>{link('A')} ve {link('B')} ...</>}
 */
export default function ConsentCheckbox({ control, name, type, linkText, children, error }) {
  const [open, setOpen] = useState(false);
  const link = (text) => (
    <button type="button" onClick={(e) => { e.preventDefault(); setOpen(true); }} className="inline text-left font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-900">
      {text}
    </button>
  );
  return (
    <div>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <>
            <Checkbox
              id={name}
              checked={!!field.value}
              onChange={(e) => field.onChange(e.target.checked)}
              onBlur={field.onBlur}
              ref={field.ref}
              invalid={!!error}
              aria-invalid={!!error}
            >
              {typeof children === 'function' ? children(link) : <>{link(linkText)}{' '}{children}</>}
            </Checkbox>
            <ConsentModal type={type} open={open} onClose={() => setOpen(false)} onAccept={() => field.onChange(true)} />
          </>
        )}
      />
      {error && <p className="mt-1 pl-8 text-xs font-medium text-accent-600">{error}</p>}
    </div>
  );
}
