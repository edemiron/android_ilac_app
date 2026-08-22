# 🐉 AJAN 08: HYDRA — Donanım İzinleri, Android Intent & Harici Entegrasyon Güvenliği

**Tarih:** 22 Ağustos 2026  
**Görev:** Android Sistem Intent'leri (MIUI Battery / Autostart), Harici API İstekleri (RxNav, Nöbetçi Eczane, Harita/Telefon Arama), Sesli Komut ve Bildirim Zamanlayıcı Güvenliği  
**Sorumlu Ajan:** HYDRA (Hardware Permissions, OS Integration & API Security Specialist)  
**Hedef Kapsam:** `miuiHelper.ts`, `pharmacyService.ts`, `voiceRecognition.ts`, `notifications/time.ts`, `drugInteraction.ts`

---

## 🎯 1. Test Edilen Güvenlik Alanları & Sonuçlar

| Test Alanı | Test Senaryosu | Uygulanan Koruma | Sonuç |
|---|---|---|---|
| **Android Intent Hijacking & Çökertme** | Desteklenmeyen cihazlarda MIUI Intent çağrısı veya geçersiz action | `isMIUIDevice()` safe fallback + `Linking.canOpenURL` koruması | **KORUMALI** |
| **GPS & Nöbetçi Eczane Girdi Güvenliği** | Sahte koordinat, `tel:` URI enjeksiyonu veya zararlı harita parametresi | `cleanNumber = phone.replace(/[^0-9+]/g, '')` + `encodeURIComponent` harita query | **KORUMALI** |
| **Sesli Komut İle Yetkisiz Eylem** | Belirsiz veya arkaplan seslerinin istemsiz işlem tetiklemesi | Intent skorlama (`confidence >= 0.85`), `matchedKeyword` doğrulaması ve modal onayı | **KORUMALI** |
| **Sessiz Saatler (Quiet Hours) Bozuk Veri Çökmesi** | Ayarlardan `null` / `undefined` veya bozuk saat stringi (`"99:99"`) gelmesi | `notifications/time.ts` içine tip ve string ayrıştırma doğrulama bloğu eklendi | **DÜZELTİLDİ & GÜVENLİ** |
| **Harici API (RxNav) İstek Güvenliği** | İlaç etkileşim aramasında URL Manipulation | `encodeURIComponent(drugName)` ve numeric `rxcuis` allowlist | **KORUMALI** |

---

## 🔍 2. Yapılan İyileştirmeler & Güvenlik Yaması

1. **`notifications/time.ts` (Sessiz Saatler Çökme Koruması):** `settings.quietHoursStart` veya `quietHoursEnd` parametrelerinin string kontrolü ve `:` format doğrulaması eklenerek `split()` çağrılarının çökme riski ortadan kaldırıldı.
2. **Telefon & Harita URI Sanitizasyonu:** `pharmacyService.ts` telefon arama (`tel:`) ve harita navigasyon linklerinin enjeksiyonlara karşı güvenli olduğu teyit edildi.

---

## 🔒 3. HYDRA Kararı
Donanım izinleri, işletim sistemi intent'leri ve dış API bağlantıları en üst düzeyde hata toleransı ve girdi sanitizasyonu ile korunmaktadır.
