# 📡 AJAN 07: HERMES — Bakıcı Bildirim Köprüsü, FCM & Cloud Functions Güvenliği

**Tarih:** 22 Ağustos 2026  
**Görev:** Bakıcı Davetleri, FCM Push Bildirimleri, Cloud Functions Auth Doğrulaması ve Yanlış/Sahte Bildirim Tetikleme Denetimi  
**Sorumlu Ajan:** HERMES (Push Notification, Webhooks & Cloud Functions Specialist)  
**Hedef Kapsam:** `server/functions/index.js`, `caregiverService.ts`, `caregiverHelpers.ts`, `caregiverNotificationService.ts`, `caregiverEventHandler.ts`

---

## 🎯 1. Test Edilen Güvenlik Alanları & Sonuçlar

| Test Alanı | Test Senaryosu | Uygulanan Koruma | Sonuç |
|---|---|---|---|
| **Yetkisiz Cloud Function Çağrısı** | Anonim veya sahte kullanıcıyla `sendCaregiverNotification`, `geminiSearch`, `claudeSearch` çağırma | `request.auth` zorunluluğu + `verifyBearerAuth` | **ENGELLEDİ (401/403)** |
| **Davet Kodu Entropisi ve Uzunluk Tutarlılığı** | 8 karakterli yeni nesil kodların (`1.1 Trilyon kombinasyon`) validasyonu | `isValidInviteCode` regex `/^[A-Z0-9]{6,8}$/` ile tam uyumlandı | **DÜZELTİLDİ & GÜVENLİ** |
| **FCM Token Manipülasyonu** | FCM cihaz belirteçlerinin çalınması veya tahrif edilmesi | `SecureStore` anahtarlığında (`caregiver.fcm.token`) şifreli saklanıyor | **KORUMALI** |
| **Bildirim Payload Flooding / Taşırma** | 100.000 karakterlik mesaj gövdesi ile FCM servislerini boğma denemesi | Sunucu tarafında `title` (max 100 kar.) ve `body` (max 500 kar.) sınırlandırması | **KORUMALI** |

---

## 🔍 2. Yapılan İyileştirmeler & Güvenlik Yaması

1. **`caregiverHelpers.ts` Regex Senkronizasyonu:** `caregiverInvite.ts` ve `qrCodeService.ts` ile olan 6 vs 8 karakter regex uyumsuzluğu giderildi (`{6,8}` yapıldı), böylece 8 haneli davetler eksiksiz doğrulanıyor.
2. **Cloud Functions Giriş Filtreleme:** `server/functions/index.js` içerisindeki tüm onCall fonksiyonlarının kimlik doğrulama zorunluluğu (`request.auth`) ve girdi sınırları teyit edildi.

---

## 🔒 3. HERMES Kararı
Bakıcı bildirim altyapısı ve sunucu fonksiyonları yetkisiz erişim ve mesaj enjeksiyonlarına karşı tam korumalıdır.
