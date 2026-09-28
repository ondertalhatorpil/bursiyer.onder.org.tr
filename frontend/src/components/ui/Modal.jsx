import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Erişilebilir modal (native <dialog>): Esc ile kapanır, odak içeride kalır.
 */
export default function Modal({ open, onClose, title, children, footer, size = 'lg' }) {
  const ref = useRef(null);

  useEffect(() => {
    const dlg = ref.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    if (!open && dlg.open) dlg.close();
  }, [open]);

  const width = size === 'sm' ? 'max-w-md' : size === 'md' ? 'max-w-xl' : 'max-w-3xl';

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose?.(); }}
      className={`m-auto w-[calc(100%-2rem)] ${width} rounded-2xl bg-white p-0 shadow-2xl backdrop:bg-slate-900/50`}
      aria-labelledby="modal-title"
    >
      <div className="flex max-h-[85vh] flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
          <h2 id="modal-title" className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Kapat">
            <X className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && <div className="flex justify-end gap-3 border-t border-slate-100 px-5 py-4 sm:px-6">{footer}</div>}
      </div>
    </dialog>
  );
}
