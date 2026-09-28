import { useEffect, useState } from 'react';

/**
 * Geri sayım. `resetKey` değişince baştan başlar (ör. yeni kod gönderildiğinde).
 * Sekme arka planda kalsa da doğru kalması için bitiş zamanına göre hesaplar.
 */
export function useCountdown(seconds, resetKey) {
  const [endAt, setEndAt] = useState(() => Date.now() + seconds * 1000);
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    const end = Date.now() + seconds * 1000;
    setEndAt(end);
    setRemaining(seconds);
  }, [seconds, resetKey]);

  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, Math.ceil((endAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endAt]);

  return remaining;
}
