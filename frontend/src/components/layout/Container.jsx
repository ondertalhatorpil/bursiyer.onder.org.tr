import clsx from 'clsx';

const WIDTHS = { sm: 'max-w-xl', md: 'max-w-3xl', lg: 'max-w-5xl', xl: 'max-w-6xl' };

export default function Container({ size = 'xl', className, children }) {
  return <div className={clsx('mx-auto w-full px-4 sm:px-6', WIDTHS[size], className)}>{children}</div>;
}
