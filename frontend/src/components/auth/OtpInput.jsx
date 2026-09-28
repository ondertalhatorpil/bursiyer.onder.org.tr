import { useRef } from 'react';
import clsx from 'clsx';

/**
 * 6 kutulu doğrulama kodu girişi. Yapıştırma, geri silme ve ok tuşları desteklenir.
 * Telefonlarda SMS'ten otomatik doldurma için autocomplete="one-time-code" kullanılır.
 */
export default function OtpInput({ value = '', onChange, length = 6, disabled, invalid, autoFocus }) {
  const refs = useRef([]);
  const chars = Array.from({ length }, (_, i) => value[i] || '');

  const setAt = (index, char) => {
    const next = chars.slice();
    next[index] = char;
    onChange(next.join('').slice(0, length));
  };

  const focus = (i) => refs.current[Math.max(0, Math.min(length - 1, i))]?.focus();

  const handleChange = (i, e) => {
    const digitsOnly = e.target.value.replace(/\D/g, '');
    if (!digitsOnly) return setAt(i, '');
    if (digitsOnly.length > 1) {
      // Otomatik doldurma / yapıştırma: kalan kutulara dağıt
      const merged = (chars.slice(0, i).join('') + digitsOnly).slice(0, length);
      onChange(merged);
      focus(merged.length);
      return undefined;
    }
    setAt(i, digitsOnly);
    focus(i + 1);
    return undefined;
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !chars[i]) { focus(i - 1); setAt(i - 1, ''); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { focus(i - 1); e.preventDefault(); }
    if (e.key === 'ArrowRight') { focus(i + 1); e.preventDefault(); }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;
    e.preventDefault();
    onChange(pasted);
    focus(pasted.length);
  };

  return (
    <div className="flex justify-center gap-2 sm:gap-3" role="group" aria-label="Doğrulama kodu">
      {chars.map((c, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          value={c}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={i === 0 ? length : 1}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          aria-label={`${i + 1}. hane`}
          className={clsx(
            'size-12 rounded-xl bg-white text-center text-xl font-bold tabular-nums text-brand-900 ring-1 ring-inset sm:size-14 sm:text-2xl',
            'focus:outline-none focus:ring-2 disabled:bg-slate-100',
            invalid ? 'ring-accent-500 focus:ring-accent-500' : 'ring-slate-300 focus:ring-brand-500',
          )}
        />
      ))}
    </div>
  );
}
