# 🔒 AJAN 03: SENTINEL — Kimlik Doğrulama, PIN & Deep Link Güvenliği

**Tarih:** 21 Ağustos 2026  
**Görev:** PIN / Biyometrik Kilit Mekanizması, QR Kod Okuyucu ve Deep Link URL Şema Denetimi  
**Sorumlu Ajan:** SENTINEL (Authentication & Access Control Specialist)  
**Hedef Kapsam:** `security.ts`, `pinCrypto.ts`, `useSecurityGate.ts`, `qrCodeService.ts`, `caregiverInvite.ts`

---

## 🔍 1. Yapılan Güvenlik ve Sızma Testleri

| Test Alanı | Test Senaryosu | Uygulanan Koruma | Sonuç |
|---|---|---|---|
| **PIN Brute-Force Saldırısı** | 100 ardışık yanlış PIN denemesi | 5 başarısız denemede 5 dakika kilit (`isLockedOut`) | **BAŞARILI (Korumalı)** |
| **Timing Attack (Zamanlama Analizi)** | Hızlı byte karşılaştırma ile hash tahmin etme | `constantTimeEqual` (Sabit zamanlı karşılaştırma) | **BAŞARILI (Korumalı)** |
| **Salt & Key Güvenliği** | AsyncStorage vs SecureStore denetimi | Salt ve Hash cihaz donanım anahtarlığında (`SecureStore`) saklanıyor | **BAŞARILI (Korumalı)** |
| **QR Deep Link Regex Uyumsuzluğu** | 8 karakterli yeni nesil davet kodlarının QR'dan okunması | Regex: `/invite\/([A-Z0-9]{6})/` | **🔴 AÇIK TESPİT EDİLDİ** |

---

## 🚨 2. Tespit Edilen Açık: `qrCodeService.ts` 8 Karakterli Davet Kodu Budanması
- **Zafiyet Detayı:** Sprint 14 geliştirmesinde güvenlik entropisini 1.1 trilyon kombinasyona yükseltmek için davet kodları 6 karakterden 8 karaktere (`6,8`) çıkarılmıştı. Ancak `qrCodeService.ts` içindeki `extractInviteCodeFromUrl()` fonksiyonunda Regex hala `{6}` olarak sabit bırakılmıştı.
- **Etkisi:** 8 karakterli QR davet linki tarandığında sadece ilk 6 karakter okunuyor ve davet kodu geçersiz sayılarak bakıcı bağlantısı reddediliyordu.
- **Düzeltme:** Regex deseni `/ilachatirlatici:\/\/caregiver\/invite\/([A-Z0-9]{6,8})/i` olarak güncellenecek.
