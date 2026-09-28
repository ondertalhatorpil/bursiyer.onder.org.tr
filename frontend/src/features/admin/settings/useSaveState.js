import { useEffect, useState } from 'react';

/** Kaydet düğmesinin yanında kısa süre "Kaydedildi" göstermek için */
export default function useSaveState() {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!saved) return undefined;
    const t = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(t);
  }, [saved]);
  return [saved, () => setSaved(true)];
}
