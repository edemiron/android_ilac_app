/**
 * Hesap silme onayının SAF kuralları.
 *
 * Neden ayrı bir domain dosyası: silme geri alınamaz ve tek dokunuşla
 * yapılmamalı. "Emin misiniz?" diyaloğu bir ilaç uygulamasında yeterli
 * değil — kullanıcı diyaloğu okumadan onaylıyor. Bu yüzden onay için
 * kullanıcının bir kelimeyi ELLE YAZMASI gerekiyor ve o kelimenin
 * doğrulaması burada, arayüzden bağımsız ve test edilebilir hâlde.
 *
 * (Aynı desen ilaç silmede de kullanılabilirdi ama ilaç silme geri
 * alınabilir bir işlem: v1.7.8'den beri silme kaydı tutuluyor ve içe aktarma
 * ile geri gelebiliyor. Hesap silme öyle değil.)
 */

/** Kullanıcının yazması gereken onay kelimesi (dile göre). */
export const DELETION_CONFIRMATION_WORD: Record<'tr' | 'en', string> = {
  tr: 'SİL',
  en: 'DELETE',
};

/**
 * Yazılan metin onay kelimesiyle eşleşiyor mu?
 *
 * Kurallar:
 * - Baştaki/sondaki boşluk yok sayılır (klavye otomatik boşluk ekliyor).
 * - Büyük/küçük harf yok sayılır — ama Türkçe'de bu dikkat gerektiriyor:
 *   `'sil'.toUpperCase()` JS'te `'SIL'` verir, `'SİL'` DEĞİL (noktalı İ
 *   yalnızca `tr` locale'inde çıkar). Bu yüzden karşılaştırma
 *   `toLocaleUpperCase('tr')` ile yapılıyor; aksi halde "sil" yazan bir
 *   kullanıcı reddedilirdi.
 * - Boş metin asla eşleşmez.
 */
export function isDeletionConfirmed(input: string, language: 'tr' | 'en' = 'tr'): boolean {
  const expected = DELETION_CONFIRMATION_WORD[language];
  const normalized = (input || '').trim();

  if (!normalized) return false;

  const locale = language === 'tr' ? 'tr-TR' : 'en-US';
  return normalized.toLocaleUpperCase(locale) === expected.toLocaleUpperCase(locale);
}

/**
 * Silinecek veri kalemleri — kullanıcıya GÖSTERİLİR.
 *
 * KVKK aydınlatma yükümlülüğü "neyin silindiğini" somut söylemeyi gerektiriyor;
 * "tüm verileriniz" ifadesi yeterli değil. Liste sunucudaki
 * `deleteMyAccount.js` kapsamıyla birebir aynı tutulmalı.
 */
export const DELETED_DATA_ITEMS: Record<'tr' | 'en', string[]> = {
  tr: [
    'İlaç listeniz ve hatırlatma saatleriniz',
    'Tüm doz geçmişiniz (alınan, atlanan, kaçırılan)',
    'Reçeteleriniz ve stok kayıtlarınız',
    'Bakıcı ilişkileriniz ve davet kodlarınız',
    'Uygulama ayarlarınız',
    'Giriş hesabınız (e-posta / Google bağlantısı)',
  ],
  en: [
    'Your medicine list and reminder times',
    'Your entire dose history (taken, skipped, missed)',
    'Your prescriptions and stock records',
    'Your caregiver relationships and invite codes',
    'Your app settings',
    'Your sign-in account (email / Google link)',
  ],
};
