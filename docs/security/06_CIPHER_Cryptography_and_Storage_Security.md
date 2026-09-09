# 🔐 AJAN 06: CIPHER — Kriptografi, Hassas Veri Depolama & Bellek Güvenliği

**Tarih:** 22 Ağustos 2026  
**Görev:** PIN Kriptografisi, Salt Güvenliği, Key Stretching, Donanımsal Anahtarlık (SecureStore) ve Bellek İzolasyonu Denetimi  
**Sorumlu Ajan:** CIPHER (Cryptography & Secure Storage Specialist)  
**Hedef Kapsam:** `security.ts`, `pinCrypto.ts`, `settingsStorage.ts`, `expo-secure-store`, `expo-crypto`

---

## 🎯 1. Kriptografik Parametreler ve Güvenlik Seviyesi

| Parametre | Değer | Güvenlik Değerlendirmesi |
|---|---|---|
| **Kriptografik Algoritma** | `SHA-256 (Iterative Key Stretching)` | Güçlü (Cihaz içi donanım destekli digest) |
| **İterasyon Sayısı (Rounds)** | `10.000 İterasyon` | Brute-force ve GPU saldırılarına karşı yüksek direnç |
| **Salt Uzunluğu & Entropisi** | `32 Byte (256 bit)` `Crypto.getRandomBytesAsync` | Kriptografik olarak güvenli rastgele sayı üreteci (CSPRNG) |
| **Hash Karşılaştırma** | `constantTimeEqual()` (XOR Diff) | **Timing Attack (Zamanlama analizi) Korumalı** |
| **Depolama Katmanı** | `expo-secure-store` (Android Keystore / iOS Keychain) | Donanımsal şifreli bellek, root/jailbreak olmadan ulaşılamaz |

---

## 🛡️ 2. Gerçekleştirilen Güvenlik İncelemesi & Doğrulamalar

1. **Bellek Sızıntısı & String Hijacking:** Salt ve PIN Hash'leri genel `AsyncStorage` içine ASLA yazılmamakta, yalnızca `SecureStore` anahtarlığı içinde (`security.pin.hash`, `security.pin.salt`) tutulmaktadır.
2. **Timing Attack Direnci:** PIN karşılaştırmasında standart `===` yerine `diff |= a.charCodeAt(i) ^ b.charCodeAt(i)` algoritması işletilerek sabit zamanlı işlem sağlanmıştır.
3. **Kademeli Hash Yükseltme (Migration):** Eski 100 turluk hash'ler, kullanıcının ilk başarılı girişinde otomatik olarak 10.000 tura yükseltilmektedir (`migratePinHashIfNeeded`).

---

## 🔒 3. CIPHER Kararı
PIN ve kriptografik anahtar yönetim sistemi askeri düzeyde (military-grade) standartlara uygun yapılandırılmıştır.
