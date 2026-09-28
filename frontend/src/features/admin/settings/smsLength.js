/** Backend'deki hesabın aynısı: GSM-7 dışı karakter (ı, ş, ğ, İ …) varsa SMS 70 karakter */
const GSM = /^[\n\r -_a-zA-Z0-9@£$¥èéùìòÇØøÅåΔΦΓΛΩΠΨΣΘΞÆæßÉ!"#¤%&'()*+,\-./:;<=>?¡ÄÖÑÜ§¿äöñüà^{}\\[~\]|€]*$/;
const SAMPLE = { code: '123456', applicant_name: 'Ahmet Yılmaz', tracking_no: 'OND-2026-12345' };

export const renderSample = (body) => body.replace(/\{(\w+)\}/g, (m, k) => SAMPLE[k] ?? m);

export function smsParts(text) {
  const gsm = GSM.test(text);
  const [single, multi] = gsm ? [160, 153] : [70, 67];
  return { length: text.length, unicode: !gsm, parts: text.length <= single ? 1 : Math.ceil(text.length / multi) };
}
