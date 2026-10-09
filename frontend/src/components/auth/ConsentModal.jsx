import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Modal, PageSpinner } from '../ui';
import { useConsentText } from '../../hooks/useLookups';

// Sonuna bu kadar (px) yaklaşınca okunmuş sayılır (yuvarlama farkları için pay)
const END_TOLERANCE = 16;

/**
 * KVKK / rıza / şart metnini modalda gösterir (backend'deki yayındaki versiyon).
 * Metin uzunsa pencere içinde kayar; onAccept verilmişse "Okudum, onaylıyorum" butonu
 * metnin sonuna kadar inilmeden çalışmaz (metin pencereye sığıyorsa hemen aktiftir).
 */
export default function ConsentModal({ type, open, onClose, onAccept }) {
  const { data, isLoading, error } = useConsentText(type, open);
  const bodyRef = useRef(null);
  const [readToEnd, setReadToEnd] = useState(false);

  const check = useCallback(() => {
    const el = bodyRef.current;
    if (el && el.scrollTop + el.clientHeight >= el.scrollHeight - END_TOLERANCE) setReadToEnd(true);
  }, []);

  // Her açılışta baştan: en üste dön, metin kısaysa (kaydırma yoksa) hemen okunmuş say
  useEffect(() => {
    if (!open) return undefined;
    setReadToEnd(false);
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
    const id = requestAnimationFrame(check);
    return () => cancelAnimationFrame(id);
  }, [open, data, check]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={data?.title || 'Metin'}
      bodyRef={bodyRef}
      onBodyScroll={check}
      footer={(
        <div className="flex w-full flex-wrap items-center justify-end gap-3">
          {onAccept && data && !readToEnd && (
            <p className="mr-auto text-xs text-slate-500">Onaylamak için metni sonuna kadar okuyunuz.</p>
          )}
          <Button variant="secondary" onClick={onClose}>Kapat</Button>
          {onAccept && data && (
            <Button disabled={!readToEnd} onClick={() => { onAccept(); onClose(); }}>Okudum, onaylıyorum</Button>
          )}
        </div>
      )}
    >
      {isLoading && <PageSpinner />}
      {error && <Alert variant="error">{error.message}</Alert>}
      {data && <div className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{data.body}</div>}
    </Modal>
  );
}
