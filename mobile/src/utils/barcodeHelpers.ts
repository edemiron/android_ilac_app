/**
 * GS1 DataMatrix / Karekod ve EAN-13 Barkod Ayrıştırıcı ve Normalize Edici
 *
 * Türkiye İlaç Takip Sistemi (İTS) Karekod Standartları:
 * - (01) veya 01: GTIN-14 (14 haneli ürün numarası, örn: 08699522958566 -> 8699522958566)
 * - (21) veya 21: Seri Numarası (Seri No)
 * - (17) veya 17: Son Kullanma Tarihi (YYMMDD)
 * - (10) veya 10: Parti / Lot Numarası
 */

export interface ParsedKarekod {
  barcode: string; // 13 haneli EAN-13 standart barkod (örn: 8699522958566)
  gtin?: string; // 14 haneli GTIN (örn: 08699522958566)
  serialNumber?: string; // Seri No
  expiryDate?: string; // ISO veya YYYY-MM-DD formatında son kullanma
  lotNumber?: string; // Parti / Lot No
  isKarekod: boolean; // 2D DataMatrix karekod mu standart barkod mu
}

/**
 * Ham barkod veya GS1 2D DataMatrix (Karekod) metnini normalize eder.
 * Veritabanı ve TİTCK aramaları için 13 haneli temiz EAN barkodu döndürür.
 */
export function normalizeBarcode(rawInput: string | null | undefined): string {
  if (!rawInput) return '';

  const parsed = parseGS1Karekod(rawInput);
  return parsed.barcode;
}

/**
 * GS1 DataMatrix (Karekod) metnini tüm alt alanlarıyla birlikte ayrıştırır.
 */
export function parseGS1Karekod(rawInput: string): ParsedKarekod {
  if (!rawInput || typeof rawInput !== 'string') {
    return { barcode: '', isKarekod: false };
  }

  const trimmed = rawInput.trim();

  // 1. Durum: Parantezli GS1 formatı: (01)08699522958566(21)123456(17)261231(10)LOT123
  if (trimmed.includes('(01)')) {
    const gtinMatch = trimmed.match(/\(01\)(\d{14})/);
    const snMatch = trimmed.match(/\(21\)([^()]+)/);
    const expMatch = trimmed.match(/\(17\)(\d{6})/);
    const lotMatch = trimmed.match(/\(10\)([^()]+)/);

    if (gtinMatch && gtinMatch[1]) {
      const gtin = gtinMatch[1];
      const barcode = gtin.startsWith('0') ? gtin.slice(1) : gtin;
      return {
        barcode,
        gtin,
        serialNumber: snMatch ? snMatch[1].trim() : undefined,
        expiryDate: expMatch ? formatGS1Date(expMatch[1]) : undefined,
        lotNumber: lotMatch ? lotMatch[1].trim() : undefined,
        isKarekod: true,
      };
    }
  }

  // 2. Durum: Standart İTS DataMatrix (010869... veya 010868...)
  // 01 ile başlar, ardından 14 haneli GTIN gelir: 010869952295856621...
  if (trimmed.startsWith('01') && trimmed.length >= 16) {
    const potentialGtin = trimmed.substring(2, 16);
    if (/^\d{14}$/.test(potentialGtin)) {
      const gtin = potentialGtin;
      const barcode = gtin.startsWith('0') ? gtin.slice(1) : gtin;

      let remainder = trimmed.substring(16);
      let serialNumber: string | undefined;
      let expiryDate: string | undefined;
      let lotNumber: string | undefined;

      // Kalan string'de 21 (Seri No), 17 (Son Kullanma), 10 (Lot) ara
      // Ayırıcı karakterler \x1D (GS) veya ardışık AI kodları olabilir.
      //
      // `no-control-regex` BILINCLI olarak kapatildi: GS1 DataMatrix
      // standardinda alan ayiricilari GS (\x1D) ve RS (\x1E) kontrol
      // karakterleridir; karekod okuyucudan aynen bu baytlar geliyor.
      // eslint-disable-next-line no-control-regex
      remainder = remainder.replace(/[\x1D\x1E]/g, ' ');

      const snMatch = remainder.match(/(?:21| 21)([^\s]+)/);
      if (snMatch) serialNumber = snMatch[1];

      const expMatch = remainder.match(/(?:17| 17)(\d{6})/);
      if (expMatch) expiryDate = formatGS1Date(expMatch[1]);

      const lotMatch = remainder.match(/(?:10| 10)([^\s]+)/);
      if (lotMatch) lotNumber = lotMatch[1];

      return {
        barcode,
        gtin,
        serialNumber,
        expiryDate,
        lotNumber,
        isKarekod: true,
      };
    }
  }

  // 3. Durum: Standart 13-14 Haneli Barkod (EAN-13 / GTIN-14)
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.length === 14 && digitsOnly.startsWith('0')) {
    return {
      barcode: digitsOnly.slice(1),
      gtin: digitsOnly,
      isKarekod: false,
    };
  }

  if (digitsOnly.length === 13) {
    return {
      barcode: digitsOnly,
      gtin: `0${digitsOnly}`,
      isKarekod: false,
    };
  }

  // 4. Durum: Diğer temizlenmiş barkodlar (UPC-A, EAN-8 vb.)
  return {
    barcode: digitsOnly.length > 0 ? digitsOnly : trimmed,
    isKarekod: false,
  };
}

/**
 * GS1 YYMMDD formatındaki tarihi YYYY-MM-DD formatına dönüştürür.
 */
function formatGS1Date(yymmdd: string): string | undefined {
  if (!yymmdd || yymmdd.length !== 6) return undefined;
  const yy = parseInt(yymmdd.substring(0, 2), 10);
  const mm = yymmdd.substring(2, 4);
  const dd = yymmdd.substring(4, 6);

  // 2000-2099 arası
  const year = 2000 + yy;
  // Gün '00' ise ayın son gününü temsil eder (GS1 standardı)
  const day = dd === '00' ? '28' : dd;

  return `${year}-${mm}-${day}`;
}
