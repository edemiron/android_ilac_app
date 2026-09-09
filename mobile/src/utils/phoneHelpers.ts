/**
 * phoneHelpers — Telefon Numarası Formatlama, Temizleme ve Doğrulama Yardımcıları
 *
 * Türkiye (+90 5XX XXX XX XX) ve uluslararası (E.164) format desteği.
 * Offline-first ve dialer (tel: URI) uyumluluğu sağlar.
 */

/**
 * Ham telefon numarasını standart temiz rakam dizisine dönüştürür.
 * Örn: "+90 (555) 123-4567" -> "+905551234567" veya "05551234567" -> "05551234567"
 */
export function cleanPhoneNumber(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith('+');
  const digitsOnly = trimmed.replace(/\D/g, '');

  if (hasPlus) {
    return `+${digitsOnly}`;
  }
  return digitsOnly;
}

/**
 * Telefon numarasını kullanıcı dostu okunaklı formata çevirir.
 *
 * Örnekler:
 * - "05551234567" -> "+90 555 123 45 67"
 * - "5551234567" -> "+90 555 123 45 67"
 * - "+905551234567" -> "+90 555 123 45 67"
 * - "02121234567" -> "+90 212 123 45 67"
 * - Uluslararası numaralar için grup formatlaması
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone || typeof phone !== 'string') return '';

  const clean = cleanPhoneNumber(phone);
  if (!clean) return '';

  let digits = clean;
  let isTr = false;

  if (digits.startsWith('+90')) {
    digits = digits.substring(3);
    isTr = true;
  } else if (digits.startsWith('0090')) {
    digits = digits.substring(4);
    isTr = true;
  } else if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.substring(1);
    isTr = true;
  } else if (
    digits.length === 10 &&
    (digits.startsWith('5') ||
      digits.startsWith('2') ||
      digits.startsWith('3') ||
      digits.startsWith('4'))
  ) {
    isTr = true;
  }

  // Türkiye 10 haneli standart numara formatlama
  if (isTr && digits.length === 10) {
    const area = digits.substring(0, 3);
    const mid = digits.substring(3, 6);
    const p1 = digits.substring(6, 8);
    const p2 = digits.substring(8, 10);
    return `+90 ${area} ${mid} ${p1} ${p2}`;
  }

  // Yazım anında kısmi Türkiye formatlama (1-9 hane)
  if (isTr && digits.length < 10) {
    if (digits.length <= 3) {
      return `+90 ${digits}`;
    }
    if (digits.length <= 6) {
      return `+90 ${digits.substring(0, 3)} ${digits.substring(3)}`;
    }
    if (digits.length <= 8) {
      return `+90 ${digits.substring(0, 3)} ${digits.substring(3, 6)} ${digits.substring(6)}`;
    }
    return `+90 ${digits.substring(0, 3)} ${digits.substring(3, 6)} ${digits.substring(6, 8)} ${digits.substring(8)}`;
  }

  // Genel uluslararası format fallback
  if (clean.startsWith('+')) {
    return clean;
  }

  return clean;
}

/**
 * Telefon numarasının geçerli bir telefon formatında olup olmadığını denetler.
 * En az 10 haneli rakam beklenir.
 */
export function isValidPhoneNumber(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;

  const clean = cleanPhoneNumber(phone);
  const digitsOnly = clean.replace(/\D/g, '');

  // Türkiye için 10 hane (5XX...) veya 11 hane (05XX... veya 905XX...)
  if (clean.startsWith('+90') || clean.startsWith('0090')) {
    return digitsOnly.length === 12; // 905XXXXXXXXX
  }

  if (digitsOnly.startsWith('0') && digitsOnly.length === 11) {
    return true; // 05XXXXXXXXX
  }

  if (digitsOnly.length === 10 && digitsOnly.startsWith('5')) {
    return true; // 5XXXXXXXXX
  }

  // Genel geçerlilik: 10 ile 15 hane arası
  return digitsOnly.length >= 10 && digitsOnly.length <= 15;
}

/**
 * Telefon numarasını doğrudan cihazın telefon arama uygulamasına yönlendirecek 'tel:' URI üretir.
 */
export function getTelUri(phone: string): string {
  const clean = cleanPhoneNumber(phone);
  if (!clean) return 'tel:';

  // Eğer 10 haneli Türkiye numarasıysa başına +90 ekle
  const digitsOnly = clean.replace(/\D/g, '');
  if (!clean.startsWith('+') && digitsOnly.length === 10 && digitsOnly.startsWith('5')) {
    return `tel:+90${digitsOnly}`;
  }
  if (!clean.startsWith('+') && digitsOnly.length === 11 && digitsOnly.startsWith('05')) {
    return `tel:+90${digitsOnly.substring(1)}`;
  }

  return `tel:${clean}`;
}
