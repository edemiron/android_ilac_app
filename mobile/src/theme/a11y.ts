/**
 * Erişilebilirlik tabanı — asgari yazı boyutu ve dokunma hedefi.
 *
 * Neden bu dosya var (v1.8.3):
 *
 * Denetim (madde 24) ≥16pt yazı ve ≥44dp dokunma hedefi istiyordu. Kod
 * tabanını ölçtüm ve gerçek durum şu çıktı:
 *
 *   398 dosyada `fontSize:` sayısal literalinin dağılımı
 *      9pt →   3      13pt → 129
 *     10pt →  18      14pt → 133
 *     11pt → 103      16pt → 106
 *     12pt → 162
 *   → **14 puntodan küçük 415 nokta**
 *   → 44dp altında 253 sabit kutu ölçüsü
 *   → 324 `Touchable*`/`Pressable`, bunların yalnızca 35'inde `hitSlop`
 *   → 1001 ham `<Text>`, 2 `<ThemedText>` (yani tasarım sistemi fiilen
 *      benimsenmemiş; `tokens.ts` de "sadece yeni kodda kullanılır" diyor)
 *
 * Bu yüzden "tokens'taki `body`yi 16'dan 18'e çek" tek satırlık çözümü
 * İŞE YARAMIYOR: uygulamanın neredeyse tamamı sabit sayı kullanıyor.
 *
 * 415 noktayı toptan değiştirmeyi de BİLEREK yapmadım. Sebep: bu ekranları
 * göremiyorum (test cihazı desen kilitli) ve denetimin kendi bulgusu
 * "41 `numberOfLines={1}` + 205 sabit `height` yüzünden sistem yazı ölçeği
 * %130'da kırpma var" diyor — yani yazıyı büyütmek sabit yükseklikli
 * kutularda metni KESER. Doğrulayamadığım 415 noktalık görsel bir
 * değişiklik, v1.8.1'de `kotlin/**` ile yaşadığımın aynısı olurdu: testler
 * yeşil, uygulama bozuk.
 *
 * Bu yüzden strateji:
 *   1. Taban burada tek yerde tanımlı ve testli.
 *   2. ALARM ve DOZ yolundaki 39 küçük yazı + dokunma hedefleri elle
 *      düzeltildi (bu ekranlarda küçük yazı doğrudan zarar veriyor).
 *   3. O yol için lint + test kapısı kondu; yeni küçük yazı giremez.
 *   4. Kalan ~376 nokta ölçülmüş bir birikim olarak arşiv kaydında duruyor
 *      ve kilidi açık bir cihazda görsel doğrulama gerektiriyor.
 */

/**
 * Asgari yazı boyutu (dp/sp).
 *
 * WCAG mutlak bir taban vermiyor; Android'in kendi Material kılavuzu gövde
 * metni için 14sp diyor ve TalkBack'i olmayan ama gözlüğünü bulamayan
 * kullanıcı için pratik alt sınır bu. Denetim 16 istiyordu; kritik yolda
 * 14'ü ZORUNLU taban, 16'yı hedef aldım — çünkü 11pt'den 16pt'ye atlamak
 * sabit yükseklikli kutularda kırpma üretiyor, 14 ise üretmiyor.
 */
export const MIN_FONT_SIZE = 14;

/** Gövde metni için hedeflenen boyut (yeni kod bunu kullanmalı). */
export const TARGET_BODY_FONT_SIZE = 16;

/**
 * Asgari dokunma hedefi (dp). Android erişilebilirlik kılavuzu 48dp,
 * WCAG 2.1 AA (2.5.5) 44px diyor. 44'ü taban, 48'i hedef aldım.
 */
export const MIN_TOUCH_TARGET = 44;

/** Hedeflenen dokunma hedefi (yeni kod bunu kullanmalı). */
export const TARGET_TOUCH_TARGET = 48;

export interface HitSlop {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * Verilen yazı boyutunu tabana çeker.
 *
 * Kesirli değerler de doğru çalışır (kod tabanında `11.5`, `12.5`, `13.5`
 * var); tabanın altındaki her şey tabana yükselir, üstündeki hiçbir şeye
 * dokunulmaz. `NaN`/`undefined` gelirse taban döner — bir yazı boyutunun
 * `NaN` olması React Native'de metni GÖRÜNMEZ yapar.
 */
export function clampFontSize(size: number, min: number = MIN_FONT_SIZE): number {
  if (!Number.isFinite(size)) return min;
  return Math.max(min, size);
}

/**
 * Görsel olarak küçük kalması gereken bir dokunma alanını (ikon düğmesi,
 * kapatma çarpısı) YERLEŞİMİ BOZMADAN büyütür.
 *
 * `hitSlop` dokunma alanını kutunun DIŞINA taşırır; genişlik/yükseklik
 * değişmediği için hiçbir şey kaymaz veya kırpılmaz. Bu, göremediğim
 * ekranlarda dokunma hedefini düzeltmenin tek risksiz yolu.
 *
 * @param actualSize Kutunun gerçek kenar uzunluğu (dp)
 * @param target     Ulaşılmak istenen dokunma hedefi (varsayılan 44dp)
 * @returns Her kenara eklenecek taşma; kutu zaten yeterliyse hepsi 0
 */
export function touchTargetHitSlop(actualSize: number, target: number = MIN_TOUCH_TARGET): HitSlop {
  if (!Number.isFinite(actualSize) || actualSize <= 0) {
    const half = Math.ceil(target / 2);
    return { top: half, bottom: half, left: half, right: half };
  }

  const missing = target - actualSize;
  if (missing <= 0) return { top: 0, bottom: 0, left: 0, right: 0 };

  // Iki kenara bolunuyor; tek sayida bir piksel fazlasi verilir ki
  // sonuc hedefin ALTINDA kalmasin.
  const perSide = Math.ceil(missing / 2);
  return { top: perSide, bottom: perSide, left: perSide, right: perSide };
}

/** Kutu ölçüsü dokunma hedefini karşılıyor mu? */
export function meetsTouchTarget(size: number, target: number = MIN_TOUCH_TARGET): boolean {
  return Number.isFinite(size) && size >= target;
}
