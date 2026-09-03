/**
 * `medicineStore` persist şeması sürümü ve göç (migration).
 *
 * ⚠️ v1.8.0 — TEK STORE'A GEÇİŞ, ŞEMA SÜRÜMÜ 2
 * ══════════════════════════════════════════════════════════════════════════
 *
 * v1'de aynı veri BEŞ ayrı `persist` altında tutuluyordu:
 *
 *     medicine-store                  ← asıl store
 *     ilac-app-medicines-storage      ← AYNA (ilaçlar + hatırlatma saatleri)
 *     ilac-app-logs-storage           ← AYNA (doz kayıtları)
 *     ilac-app-snoozes-storage        ← kullanılmıyordu
 *     ilac-app-settings-storage       ← kullanılmıyordu
 *
 * Slice store'ları ÜRETİMDE hiçbir yer OKUMUYORDU; `medicineStore` onlara
 * yalnızca yazıyordu (`_useMedicinesStore.setState`, `replaceMedicineLogs`).
 * Sonuç: her ilaç eklemesi/silmesi ve her doz kaydı diskte İKİ KEZ
 * yazılıyordu, açılışta beş store hidrate oluyordu ve ilaç listesi diskte iki
 * kopya halinde duruyordu — birbirinden sapabilecek iki kopya.
 *
 * v1.8.0'da slice store'lar tamamen silindi. Bu, persist şemasını
 * DEĞİŞTİRDİĞİ için sürüm 2'ye çıkıldı.
 *
 * ── GÖÇ NEDEN ESKİ VERİYİ TAŞIMIYOR ──────────────────────────────────────
 * Uygulama YAYINDA DEĞİL: korunması gereken tek bir gerçek kullanıcı verisi
 * yok. Bu durumda v1 şemasını v2'ye dönüştürmeye çalışmak, hiç kimsenin
 * ihtiyaç duymadığı bir kod yolunu sonsuza kadar taşımak demek — ve o yol
 * asla gerçek veriyle test edilmeyeceği için ilk kullanımında bozuk çıkma
 * olasılığı yüksek.
 *
 * Bu yüzden göç bilinçli olarak ESKİ STATE'İ ATAR ve temiz başlangıç durumu
 * döndürür. Yayına çıktıktan sonra bu davranış DEĞİŞMELİ: v2'den sonraki her
 * sürüm gerçek bir dönüşüm yazmak zorundadır.
 */

/**
 * Persist şeması sürümü.
 *
 * ⚠️ Bunu artırdığında `migrateMedicineStoreState` içine GERÇEK bir dönüşüm
 * yazman gerekir — aşağıdaki "state'i at" davranışı yalnızca yayın öncesi
 * için geçerlidir.
 */
export const SETTINGS_STORAGE_VERSION = 2;

/**
 * v1 (beş ayrı persist) → v2 (tek persist) göçü.
 *
 * Eski state ATILIR; `undefined` döndürmek zustand'a "kalıcı veri yok, temiz
 * başlangıç durumunu kullan" demektir. Gerekçe dosya başında.
 */
export function migrateMedicineStoreState(persistedState: unknown, version: number): unknown {
  if (version < SETTINGS_STORAGE_VERSION) {
    // Bilinçli olarak taşınmıyor — bkz. dosya başı.
    return undefined;
  }
  return persistedState;
}
