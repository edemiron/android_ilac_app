/**
 * Fotoğraf yakalama — AI görsel akışlarının TEK kaynağı (v1.9.1).
 *
 * ── Neden bu dosya var ────────────────────────────────────────────────────
 * Kullanıcı "AI ile ilaç ekle" akışında fotoğraf çekip onayladıktan sonra
 * ANA EKRANA DÜŞÜYORDU. Teşhis:
 *
 *   - Sunucu tarafında `geminiGenerate` fonksiyonuna O DENEMEDEN HİÇ İSTEK
 *     GELMEMİŞTİ (Cloud Logging, 2 saatlik pencere).
 *   - Crashlytics'te o sürüme ait çökme kaydı YOKTU.
 *   - İstemci kodunda her katmanda `try/catch` var ve hata durumunda `Alert`
 *     gösteriliyor, ana ekrana yönlendirme YAPILMIYOR.
 *
 * Üçü birlikte tek bir tabloya çıkıyor: uygulama, kamera önde iken Android
 * tarafından ÖLDÜRÜLDÜ ve dönüşte sıfırdan başladı. Bellek yöneticisinin
 * öldürmesi bir "çökme" değildir — sinyal yoktur, Crashlytics kaydetmez;
 * `await` da hiç dönmez, o yüzden sunucuya istek gitmez.
 *
 * ── Kodun buna katkısı ────────────────────────────────────────────────────
 * Üç çağrı noktası da picker'a `base64: true` veriyordu:
 *
 *     launchCameraAsync({ base64: true, quality: 0.8, allowsEditing: false })
 *
 * Bu, tam çözünürlüklü fotoğrafın (tablette 8MP) hem JPEG hem de ~3-5 MB'lık
 * bir base64 DİZESİ olarak bellekte tutulması demek — üstelik tam da
 * uygulamanın arka plandan döndüğü, bellek baskısının zirve yaptığı anda.
 * Uygulamayı öldürülmeye en açık hâle getiren an buydu.
 *
 * ── Bu modülün yaptığı ────────────────────────────────────────────────────
 * 1. Picker'dan base64 İSTEMEZ. Yalnızca dosya URI'si alınır.
 * 2. base64'e çevirme, uygulama ÖN PLANA DÖNDÜKTEN SONRA, ayrı bir adımda
 *    yapılır (`new File(uri).base64()`). Zirve bellek anı ile kodlama anı
 *    artık aynı an değil.
 * 3. Gönderim öncesi BOYUT DENETLENİR. Sunucu 8 MB base64 sınırı koyuyor
 *    (`schedule`/`index.js`: MAX_INLINE_IMAGE_CHARS) ama istemcide bunu
 *    kontrol eden hiçbir şey yoktu: büyük bir fotoğraf sessizce sunucuda
 *    reddediliyor ve kullanıcı "tanınamadı" sanıyordu.
 *
 * ── Neden yeni bir native bağımlılık eklenmedi ────────────────────────────
 * Görseli KÜÇÜLTMEK (örn. `expo-image-manipulator`) belleği bir kat daha
 * düşürürdü, ama yeni bir native modül demek: autolinking + gradle değişikliği.
 * Bu oturumda APK derleyip cihazda deneyemediğim için, doğrulayamayacağım bir
 * native değişiklik bırakmak doğru olmazdı. `expo-file-system` ZATEN kurulu ve
 * autolink'li — bu düzeltme sıfır native risk taşıyor.
 * Küçültme, ölçülebildiğinde ayrı bir adım olarak eklenmeli (bkz. checklist).
 */

import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';

import { createScopedLogger } from './logger';

const log = createScopedLogger('ImageCapture');

/**
 * Gönderilebilecek en büyük base64 uzunluğu.
 *
 * Sunucu sınırı 8 MB (`8 * 1024 * 1024` karakter). Burada 6 MB'ta kesiliyor:
 * aradaki pay, JSON zarfı ve prompt metni için. Sunucuya "kesin reddedilecek"
 * bir yük göndermenin anlamı yok — kullanıcı boşuna bekler ve hatayı yanlış
 * yorumlar.
 */
export const MAX_UPLOAD_BASE64_CHARS = 6 * 1024 * 1024;

/**
 * JPEG yeniden kodlama kalitesi.
 *
 * Eskiden 0.8 (toplu içe aktarma) ve 0.6 (ilaç ekleme) idi — aynı iş için iki
 * farklı değer. 0.5 bilinçli: ilaç kutusundaki YAZIYI okumak için yeterli,
 * ve dosyayı kabaca yarıya indiriyor.
 */
export const CAPTURE_QUALITY = 0.5;

export type CaptureSource = 'camera' | 'library';

export type CaptureFailureReason =
  | 'cancelled'
  | 'permission-denied'
  | 'no-image'
  | 'too-large'
  | 'read-failed';

export type CaptureResult =
  | { ok: true; uri: string; base64: string; base64Length: number }
  | { ok: false; reason: CaptureFailureReason; base64Length?: number };

/**
 * Bu base64 gönderilemeyecek kadar büyük mü? (saf — testi kolay olsun diye)
 */
export function exceedsUploadLimit(base64Length: number): boolean {
  return base64Length > MAX_UPLOAD_BASE64_CHARS;
}

/**
 * Kamera/galeriden görsel al ve AI'a gönderilmeye hazır base64 döndür.
 *
 * ASLA `base64: true` geçmez — gerekçe dosya başında.
 */
export async function captureImageForAI(source: CaptureSource): Promise<CaptureResult> {
  try {
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        return { ok: false, reason: 'permission-denied' };
      }
    }

    const options: ImagePicker.ImagePickerOptions = {
      quality: CAPTURE_QUALITY,
      allowsEditing: false,
      // base64 BİLEREK istenmiyor.
    };

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

    if (result.canceled) {
      return { ok: false, reason: 'cancelled' };
    }

    const uri = result.assets?.[0]?.uri;
    if (!uri) {
      return { ok: false, reason: 'no-image' };
    }

    // Buradan sonrası uygulama ON PLANDAYKEN calisir.
    let base64: string;
    try {
      base64 = await new File(uri).base64();
    } catch (error) {
      log.error('Dosya base64 okunamadi', error);
      return { ok: false, reason: 'read-failed' };
    }

    if (!base64) {
      return { ok: false, reason: 'read-failed' };
    }

    if (exceedsUploadLimit(base64.length)) {
      log.warn('Gorsel yukleme sinirini asti', { base64Length: base64.length });
      return { ok: false, reason: 'too-large', base64Length: base64.length };
    }

    return { ok: true, uri, base64, base64Length: base64.length };
  } catch (error) {
    log.error('captureImageForAI hatasi', error);
    return { ok: false, reason: 'read-failed' };
  }
}

/**
 * Başarısızlık sebebinin kullanıcıya gösterilecek karşılığı.
 *
 * `cancelled` BİLEREK yok: kullanıcı vazgeçtiyse ona uyarı göstermek kaba olur.
 * Çağıran taraf `cancelled` durumunda sessizce çıkmalı.
 */
export function captureFailureMessage(
  reason: CaptureFailureReason,
  language: 'tr' | 'en'
): string | null {
  const isTr = language === 'tr';
  switch (reason) {
    case 'cancelled':
      return null;
    case 'permission-denied':
      return isTr
        ? 'İlaç kutusunu fotoğraflamak için kamera izni vermeniz gerekiyor.'
        : 'Camera permission is required to photograph the medicine box.';
    case 'too-large':
      return isTr
        ? 'Fotoğraf çok büyük. Lütfen biraz uzaktan, daha az yakınlaştırarak tekrar çekin.'
        : 'The photo is too large. Please retake it from a little further away.';
    case 'no-image':
    case 'read-failed':
    default:
      return isTr
        ? 'Fotoğraf işlenemedi. Lütfen tekrar deneyin.'
        : 'The photo could not be processed. Please try again.';
  }
}
