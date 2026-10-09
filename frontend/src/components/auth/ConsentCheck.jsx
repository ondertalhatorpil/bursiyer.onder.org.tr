import { useState } from 'react';
import ConsentModal from './ConsentModal';
import { Checkbox } from '../ui';
import { useConsentText } from '../../hooks/useLookups';

/**
 * Onay kutusu. Cümle admin panelindeki yayındaki sürümden gelir ("Onay kutusundaki cümle").
 *   withText (varsayılan): kutuya / cümleye basınca metin açılır, "Okudum, onaylıyorum" ile kutu işaretlenir.
 *                          İşaretli kutuya basınca işaret kalkar.
 *   withText={false}:      metin gösterilmez, kutu doğrudan işaretlenir (ör. paylaşım rızası).
 */
export default function ConsentCheck({ id, type, checked, onChange, onBlur, invalid, withText = true, inputRef }) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useConsentText(type);

  const toggle = (e) => {
    if (e.target.checked && withText) {
      setOpen(true); // işaret, metin onaylanınca konur
      return;
    }
    onChange(e.target.checked);
  };

  return (
    <>
      <Checkbox id={id} checked={!!checked} onChange={toggle} onBlur={onBlur} ref={inputRef} invalid={invalid} aria-invalid={invalid}>
        <span className="text-slate-900">{isLoading ? 'Yükleniyor…' : data?.label}</span>
      </Checkbox>
      {withText && <ConsentModal type={type} open={open} onClose={() => setOpen(false)} onAccept={() => onChange(true)} />}
    </>
  );
}
