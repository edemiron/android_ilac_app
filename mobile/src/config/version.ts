/**
 * Versiyon Yapılandırması
 *
 * Bu dosya versiyon bilgilerini tek bir yerden yönetmek için kullanılır.
 * Versiyon güncellemesi sırasında SADECE bu dosyayı güncelleyin.
 *
 * Kullanım:
 * 1. Semantic Versioning: MAJOR.MINOR.PATCH (örn: 1.3.2)
 * 2. MAJOR: Büyük değişiklikler, uyumsuzluk
 * 3. MINOR: Yeni özellikler, geriye uyumlu
 * 4. PATCH: Bug fix'ler
 */

export const APP_VERSION = '1.3.6';

export const ANDROID_VERSION_CODE = 19;

export const IOS_BUILD_NUMBER = '19';

/**
 * Versiyon tarih damgası (Build zamanı)
 */
export const BUILD_DATE = new Date().toISOString();
