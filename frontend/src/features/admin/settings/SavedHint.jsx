import { CircleCheck } from 'lucide-react';

export default function SavedHint({ show, text = 'Kaydedildi' }) {
  if (!show) return null;
  return (
    <span role="status" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
      <CircleCheck className="size-4" aria-hidden />{text}
    </span>
  );
}
