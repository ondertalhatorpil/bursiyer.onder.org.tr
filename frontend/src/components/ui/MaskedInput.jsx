import clsx from 'clsx';
import { IMaskInput } from 'react-imask';
import { inputClass } from './Field';

/**
 * Maskeli input (telefon, kimlik no, tarih). react-hook-form Controller ile kullanılır:
 *   <Controller name="phone" control={control} render={({ field }) => <MaskedInput mask={MASKS.phone} {...field} />} />
 */
export default function MaskedInput({ mask, value, onChange, onBlur, name, invalid, className, ref, ...rest }) {
  return (
    <IMaskInput
      {...mask}
      value={value ?? ''}
      name={name}
      inputRef={ref}
      onAccept={(v) => onChange?.(v)}
      onBlur={onBlur}
      className={clsx(inputClass(invalid), 'tabular-nums', className)}
      {...rest}
    />
  );
}

/** Hazır maskeler. Telefonda baştaki 0 sabittir (\\0 = sabit karakter); kullanıcı 0 yazsa da yazmasa da aynı sonuç. */
export const MASKS = {
  phone: { mask: '\\0 (000) 000 00 00', lazy: true, inputMode: 'tel', placeholder: '0 (5XX) XXX XX XX' },
  idNumber: { mask: '00000000000', inputMode: 'numeric', placeholder: '11 haneli kimlik numarası' },
  date: { mask: '00/00/0000', inputMode: 'numeric', placeholder: 'GG/AA/YYYY' },
  // TR sabit; kullanıcı TR yazsa da yazmasa da aynı sonuç. Yapıştırılan boşluklu / boşluksuz IBAN kabul edilir.
  iban: { mask: 'TR00 0000 0000 0000 0000 0000 00', inputMode: 'numeric', placeholder: 'TR00 0000 0000 0000 0000 0000 00' },
};
