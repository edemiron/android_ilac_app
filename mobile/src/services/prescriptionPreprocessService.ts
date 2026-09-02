/**
 * prescriptionPreprocessService.ts — İlaç & Reçete Ön İşleme ve KVKK/PII Maskeleme Motoru
 *
 * 100k Kullanıcı Ölçekli Hibrit AI Mimarisi:
 * 1. İstemci tarafı KVKK / HIPAA uyumlu PII (Kişisel Tanımlanabilir Bilgi) Maskeleme
 * 2. T.C. Kimlik No, Hasta Adı, Doktor Adı ve Telefon No sansürleme
 * 3. Görsel boyut ve kalite doğrulama
 */

import { createScopedLogger } from '../utils/logger';

const log = createScopedLogger('PrescriptionPreprocessService');

export interface PIIMaskingResult {
  maskedText: string;
  detectedPIICount: number;
  hasTCKN: boolean;
  hasPatientName: boolean;
  hasDoctorName: boolean;
  hasPhone: boolean;
}

export interface ImageValidationResult {
  isValid: boolean;
  warning?: string;
  recommendedWidth: number;
  recommendedHeight: number;
}

/**
 * 11 Haneli T.C. Kimlik No algoritması basit doğrulama / tespit
 */
const TCKN_REGEX = /\b([1-9][0-9]{10})\b/g;

/**
 * Hasta ve Doktor adı kalıpları
 */
const PATIENT_NAME_PREFIX_REGEX =
  /(?:Sn\.|Sayın|Hasta(?:\s*Adı)?[:\s]+)([A-ZÇĞİÖŞÜa-zçğıöşü]{2,}(?:\s+[A-ZÇĞİÖŞÜa-zçğıöşü]{2,})+)/gi;
const DOCTOR_NAME_PREFIX_REGEX =
  /(?:Dr\.|Doktor|Uzm\.\s*Dr\.|Prof\.\s*Dr\.|Doç\.\s*Dr\.|Op\.\s*Dr\.)\s*([A-ZÇĞİÖŞÜa-zçğıöşü]{2,}(?:\s+[A-ZÇĞİÖŞÜa-zçğıöşü]{2,})+)/gi;

/**
 * Türkiye Telefon Numarası Kalıbı
 */
const PHONE_REGEX = /(?:\+?90\s*|0)?5[0-9]{2}[\s-]?[0-9]{3}[\s-]?[0-9]{2}[\s-]?[0-9]{2}\b/g;

/**
 * Ham reçete / SMS metnindeki kişisel verileri (KVKK/HIPAA) API'ye gitmeden önce maskeler.
 */
export function maskPII(text: string | null | undefined): PIIMaskingResult {
  if (!text || typeof text !== 'string') {
    return {
      maskedText: '',
      detectedPIICount: 0,
      hasTCKN: false,
      hasPatientName: false,
      hasDoctorName: false,
      hasPhone: false,
    };
  }

  let count = 0;
  let hasTCKN = false;
  let hasPatientName = false;
  let hasDoctorName = false;
  let hasPhone = false;

  let masked = text;

  // 1. TCKN Maskeleme
  const tcknMatches = masked.match(/\b([1-9][0-9]{10})\b/g);
  if (tcknMatches && tcknMatches.length > 0) {
    hasTCKN = true;
    count += tcknMatches.length;
    masked = masked.replace(/\b([1-9][0-9]{10})\b/g, '[TCKN_MASKELENDİ]');
  }

  // 2. Telefon Numarası Maskeleme
  const phoneMatches = masked.match(
    /(?:\+?90\s*|0)?5[0-9]{2}[\s-]?[0-9]{3}[\s-]?[0-9]{2}[\s-]?[0-9]{2}\b/g
  );
  if (phoneMatches && phoneMatches.length > 0) {
    hasPhone = true;
    count += phoneMatches.length;
    masked = masked.replace(
      /(?:\+?90\s*|0)?5[0-9]{2}[\s-]?[0-9]{3}[\s-]?[0-9]{2}[\s-]?[0-9]{2}\b/g,
      '[TELEFON_MASKELENDİ]'
    );
  }

  // 3. Hasta Adı Maskeleme (Sn. / Sayın / Hasta Adı:)
  const patientRegex =
    /(?:Sn\.\s*|Sayın\s*|Hasta(?:\s*Adı)?[:\s]+)([A-ZÇĞİÖŞÜa-zçğıöşü]{2,}(?:\s+[A-ZÇĞİÖŞÜa-zçğıöşü]{2,})+)/gi;
  const patientMatches = masked.match(patientRegex);
  if (patientMatches && patientMatches.length > 0) {
    hasPatientName = true;
    count += patientMatches.length;
    masked = masked.replace(patientRegex, 'Sn. [HASTA_MASKELENDİ]');
  }

  // 4. Doktor Adı Maskeleme (Dr. / Uzm. Dr. / Prof. Dr.)
  const docRegex =
    /(?:Dr\.\s*|Doktor\s*|Uzm\.\s*Dr\.\s*|Prof\.\s*Dr\.\s*|Doç\.\s*Dr\.\s*|Op\.\s*Dr\.\s*)([A-ZÇĞİÖŞÜa-zçğıöşü]{2,}(?:\s+[A-ZÇĞİÖŞÜa-zçğıöşü]{2,})+)/gi;
  const docMatches = masked.match(docRegex);
  if (docMatches && docMatches.length > 0) {
    hasDoctorName = true;
    count += docMatches.length;
    masked = masked.replace(docRegex, 'Dr. [DOKTOR_MASKELENDİ]');
  }

  log.debug('KVKK PII maskeleme tamamlandı', {
    detectedPIICount: count,
    hasTCKN,
    hasPatientName,
    hasDoctorName,
    hasPhone,
  });

  return {
    maskedText: masked,
    detectedPIICount: count,
    hasTCKN,
    hasPatientName,
    hasDoctorName,
    hasPhone,
  };
}

/**
 * Reçete fotoğrafının boyut ve çözünürlük parametrelerini optimize eder.
 * Max 1080p (1920x1080) seviyesine indirgemek için önerilen boyutları hesaplar.
 */
export function calculateOptimalDimensions(
  width: number,
  height: number,
  maxDimension: number = 1920
): { width: number; height: number; needsResize: boolean } {
  if (width <= 0 || height <= 0) {
    return { width: maxDimension, height: maxDimension, needsResize: false };
  }

  const maxSide = Math.max(width, height);
  if (maxSide <= maxDimension) {
    return { width, height, needsResize: false };
  }

  const scale = maxDimension / maxSide;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
    needsResize: true,
  };
}

/**
 * Görselin AI taraması için uygunluğunu kontrol eder.
 */
export function validateImageForScan(
  imageUri: string | null | undefined,
  sizeBytes?: number
): ImageValidationResult {
  if (!imageUri) {
    return {
      isValid: false,
      warning: 'Görsel seçilmedi.',
      recommendedWidth: 1920,
      recommendedHeight: 1080,
    };
  }

  // Boyut kontrolü: 10MB üstü görseller mobil ağlar için çok büyük
  if (sizeBytes && sizeBytes > 10 * 1024 * 1024) {
    return {
      isValid: false,
      warning: 'Görsel boyutu çok yüksek (>10MB). Lütfen daha düşük çözünürlükle tekrar deneyiniz.',
      recommendedWidth: 1920,
      recommendedHeight: 1080,
    };
  }

  return {
    isValid: true,
    recommendedWidth: 1920,
    recommendedHeight: 1080,
  };
}
