import clsx from 'clsx';
import { inputClass } from './Field';

/** Düz metin input. react-hook-form register() ile kullanılır (React 19: ref prop). */
export default function TextInput({ invalid, className, ref, ...rest }) {
  return <input ref={ref} className={clsx(inputClass(invalid), className)} {...rest} />;
}
