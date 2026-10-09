/**
 * Cloudflare Turnstile (bot doğrulaması). SMS gönderen kayıt / giriş isteklerinden önce token alınır.
 * Site anahtarı backend'den gelir (/api/public/config); tanımlı değilse captcha kapalıdır, getToken() null döner.
 *
 * Görünüm "interaction-only": kullanıcıların çoğu hiçbir şey görmez, doğrulama arka planda geçer;
 * Cloudflare şüphelenirse tek tıklamalık kutu çıkar. Token tek kullanımlıktır: her istekte yeniden alınır.
 *
 *   const captcha = useTurnstile();
 *   const token = await captcha.getToken();   // isteğe { captchaToken: token } eklenir
 *   {captcha.element}                          // sayfada kutunun çıkacağı yer
 */
import { useCallback, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { publicApi } from '../api/endpoints';

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let scriptPromise = null;

function loadScript() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SCRIPT_URL;
      s.async = true;
      s.onload = () => resolve(window.turnstile);
      s.onerror = () => { scriptPromise = null; reject(new Error('Güvenlik doğrulaması yüklenemedi. İnternet bağlantınızı kontrol edip sayfayı yenileyiniz.')); };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

const FAILED = 'Güvenlik doğrulaması tamamlanamadı, lütfen tekrar deneyiniz.';

export function useTurnstile() {
  const { data: config } = useQuery({ queryKey: ['public', 'config'], queryFn: publicApi.config, staleTime: Infinity });
  const siteKey = config?.turnstileSiteKey || null;
  const boxRef = useRef(null);
  const widgetRef = useRef(null);
  const pendingRef = useRef(null); // { resolve, reject } bekleyen token isteği

  // Site anahtarı varsa betik önceden yüklensin (ilk istekte beklenmesin)
  useEffect(() => { if (siteKey) loadScript().catch(() => {}); }, [siteKey]);

  // Sayfadan çıkınca kutu kaldırılır
  useEffect(() => () => {
    if (widgetRef.current != null && window.turnstile) window.turnstile.remove(widgetRef.current);
    widgetRef.current = null;
  }, []);

  const getToken = useCallback(async () => {
    if (!siteKey) return null;
    const turnstile = await loadScript();
    const settle = (fn, value) => { const p = pendingRef.current; pendingRef.current = null; p?.[fn](value); };

    if (widgetRef.current == null) {
      widgetRef.current = turnstile.render(boxRef.current, {
        sitekey: siteKey,
        execution: 'execute',
        appearance: 'interaction-only',
        language: 'tr',
        callback: (token) => settle('resolve', token),
        'error-callback': () => settle('reject', new Error(FAILED)),
        'timeout-callback': () => settle('reject', new Error(FAILED)),
      });
    } else {
      turnstile.reset(widgetRef.current);
    }

    pendingRef.current?.reject(new Error(FAILED));
    const token = new Promise((resolve, reject) => { pendingRef.current = { resolve, reject }; });
    turnstile.execute(widgetRef.current);
    return token;
  }, [siteKey]);

  const element = siteKey ? <div ref={boxRef} className="flex justify-center empty:hidden" /> : null;
  return { enabled: !!siteKey, getToken, element };
}
