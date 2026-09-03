/**
 * Notifications — config module.
 *
 * Shared notification konfigurasyon sabitleri. Sprint 3 (notifications.ts modular).
 */

/**
 * Bildirim üzerindeki hızlı eylemler.
 *
 * v1.8.2 — İKİ değişiklik, ikisi de klinik gerekçeli:
 *
 * 1. EMOJİ KALDIRILDI (`✅ Aldım` → `Aldım`). TalkBack emojiyi de okuyor:
 *    "beyaz onay işareti Aldım". Yaşlı ve görme engelli kullanıcı için bu
 *    gürültü; ayrıca bazı launcher/OEM bildirim gölgesinde emoji kırpılıp
 *    kutuya dönüşüyor. Bir ilaç bildiriminde okunabilirlik süslemeden
 *    önce gelir.
 *
 * 2. "Atla" EYLEMİ KALDIRILDI. Bildirim gölgesinde tek dokunuşla, onay
 *    olmadan, gerekçe sorulmadan bir dozu ATLANDI yazmak klinik bir kararı
 *    kazayla vermektir — hem de "Ertele" düğmesinin hemen yanında, aynı
 *    boyutta. Atlama hâlâ mümkün: tam ekran alarm ekranında, gerekçe
 *    soran onaylı akışın arkasında (`SkipReasonModal`).
 *    NOT: `skip` action id'sini İŞLEYEN kod BİLEREK duruyor
 *    (index.ts arka plan handler'i + listeners.ts) — güncelleme öncesinde
 *    gösterilmiş, hâlâ ekranda duran bir bildirimden `skip` gelebilir ve
 *    o dokunuş sessizce yutulmamalı.
 */
export const ALARM_ACTIONS: Array<{ title: string; pressAction: { id: string } }> = [
  { title: 'Aldım', pressAction: { id: 'take' } },
  { title: 'Ertele', pressAction: { id: 'snooze' } },
];

export const FULL_SCREEN_ACTION = {
  id: 'default',
  launchActivity: 'default',
};

export const PRESS_ACTION = {
  id: 'default',
  launchActivity: 'default',
};

export const ANDROID_TRIGGER_INTROSPECTION_LIMIT = 50;
