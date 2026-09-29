import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom'; // 1. useLocation'ı içe aktarın
import WebHeader from './WebHeader';
import MobileHeader from './MobileHeader';

export default function SiteHeader({ variant = 'plain', className }) {
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation(); // 2. Mevcut konumu alın

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 950);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 3. Eğer mevcut yol "/" ise hiçbir şey render etme (null dön)
  if (location.pathname === '/') {
    return null;
  }

  return isMobile ? (
    <MobileHeader variant={variant} className={className} />
  ) : (
    <WebHeader variant={variant} className={className} />
  );
}