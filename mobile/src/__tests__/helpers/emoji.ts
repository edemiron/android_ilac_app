/**
 * Emoji kapilari icin TEK kaynak (v1.8.7).
 *
 * NEDEN BU DOSYA VAR — v1.8.2'nin sessiz kusuru:
 * Emoji kapisi dort ayri test dosyasina ELLE yazilmis su karakter sinifiyla
 * kurulmustu:
 *
 *     /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]|\u{FE0F}/u
 *
 * Bu sinif `\u{2300}-\u{23FF}` blogunu (Miscellaneous Technical) HIC
 * icermiyordu. Yani `⏰` (U+23F0), `⏱` (U+23F1), `⌚` (U+231A) gibi saat
 * isaretleri kapidan serbestce geciyordu. Sonuc: v1.8.2 "emoji kaldirildi"
 * dedi, dort test yesil yandi, ama test alarminin bildirim govdesinde
 * `⏰ 19:01` aylarca ayakta kaldi. Kusur ancak cihazda
 * `dumpsys notification --noredact` ile canli bildirim kaydi okunarak
 * gorulebildi.
 *
 * Ders: elle yazilmis Unicode araliklari eksik olur. Standart, Unicode'un
 * kendi ozelligini kullanmaktir — `\p{Extended_Pictographic}` her
 * piktografik karakteri kapsar ve bizim MEsRU noktalama isaretlerimize
 * (em dash `—`, madde imi `•`, ok `→`, Turkce `İ`/`ı`) dokunmaz.
 *
 * Yalniz `\u{FE0F}` (variation selector-16) ozelliksizdir: emoji ile birlikte
 * gelen ama tek basina piktografik SAYILMAYAN bir birlestirici. Bir metinde
 * tek basina kalmissa bu da bir emoji kalintisidir, o yuzden ayrica aranir.
 */

/** Tek eslesme arar (`test` icin). */
export const EMOJI_PATTERN = /\p{Extended_Pictographic}|\u{FE0F}/u;

/** Butun eslesmeleri toplar — her cagrida taze regex (lastIndex tuzagi yok). */
export function findEmoji(text: string): string[] {
  return text.match(/\p{Extended_Pictographic}|\u{FE0F}/gu) ?? [];
}

/** Metinde emoji var mi? */
export function hasEmoji(text: string): boolean {
  return EMOJI_PATTERN.test(text);
}
