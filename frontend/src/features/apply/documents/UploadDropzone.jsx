import { useRef, useState } from 'react';
import clsx from 'clsx';
import { UploadCloud } from 'lucide-react';
import Spinner from '../../../components/ui/Spinner';

const MIME = { pdf: 'application/pdf', jpg: 'image/jpeg', png: 'image/png' };

/**
 * Sürükle-bırak veya tıklayarak dosya seçme. Format ve boyut, yüklemeden önce tarayıcıda kontrol edilir.
 */
export default function UploadDropzone({ formats = ['pdf'], maxMb = 5, onFile, uploading, disabled }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState(null);

  const accept = formats.map((f) => `${MIME[f]},.${f}${f === 'jpg' ? ',.jpeg' : ''}`).join(',');

  const handle = (file) => {
    setError(null);
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase().replace('jpeg', 'jpg');
    if (!formats.includes(ext)) {
      setError(`Bu belge için sadece ${formats.map((f) => f.toUpperCase()).join(', ')} yükleyebilirsiniz.`);
      return;
    }
    if (file.size > maxMb * 1024 * 1024) {
      setError(`Dosya en fazla ${maxMb} MB olabilir.`);
      return;
    }
    onFile(file);
  };

  return (
    <div>
      <button
        type="button"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files?.[0]); }}
        className={clsx(
          'flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition',
          drag ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-slate-50 hover:border-brand-400 hover:bg-brand-50/50',
          (disabled || uploading) && 'cursor-not-allowed opacity-60',
        )}
      >
        {uploading ? <Spinner className="size-6 text-brand-600" /> : <UploadCloud className="size-7 text-brand-600" aria-hidden />}
        <span className="text-sm font-semibold text-brand-800">{uploading ? 'Yükleniyor…' : 'Dosya Seçiniz veya Buraya Sürükleyiniz'}</span>
        <span className="text-xs text-slate-500">{formats.map((f) => f.toUpperCase()).join(', ')} · en fazla {maxMb} MB</span>
      </button>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => { handle(e.target.files?.[0]); e.target.value = ''; }} />
      {error && <p className="mt-2 text-xs font-medium text-accent-600">{error}</p>}
    </div>
  );
}
