# 🛡️ AJAN 05: AEGIS — Abonelik, Satın Alma & IAP Fraud Denetimi

**Tarih:** 22 Ağustos 2026  
**Görev:** In-App Purchase (IAP) Akışları, Sahte Fatura/Dekont (Receipt Tampering) ve İstemci Taraflı Yetki Yükseltme Güvenlik Denetimi  
**Sorumlu Ajan:** AEGIS (IAP, Billing & Anti-Fraud Security Specialist)  
**Hedef Kapsam:** `purchaseService.ts`, `subscriptionService.ts`, `SubscriptionContext.tsx`, `firestore.rules`

---

## 🎯 1. Test Edilen Güvenlik Alanları & Saldırı Senaryoları

| Test Alanı | Test Senaryosu | Uygulanan Güvenlik / Kural | Sonuç |
|---|---|---|---|
| **İstemci Taraflı Abonelik Manipülasyonu** | İstemcinin Firestore `/subscription/current` belgesine doğrudan `tier: "premium"` yazmaya çalışması | `firestore.rules` içinde `allow create, update, delete: if false;` | **ENGELLEDİ (İstemci yazamaz)** |
| **Abonelik Süresi Aşımı & Saat Manipülasyonu** | Cihaz saatini ileri/geri alarak süresi dolan premium aboneliği sürdürme | `getUserSubscription()` sunucu/firestore zaman damgası kontrolü ve `downgradeToFree()` | **KORUMALI** |
| **IAP Geçersiz Ürün Kimliği Enjeksiyonu** | Satın alma akışına `""` (boş) veya zararlı ürün ID gönderilmesi | `purchaseProduct()` girdi doğrulaması ile geçersiz ID reddi | **KORUMALI** |
| **Barkod Tarama Kota İhlali (Free Tier)** | LocalStorage/AsyncStorage sayacını sıfırlama veya atlama denemesi | Cloud Firestore limit doğrulaması ve context seviyesinde sınır koruması | **KORUMALI** |

---

## 🔍 2. Güvenlik Değerlendirmesi ve Mimari Tavsiyeler

1. **Abonelik Yazma Yetkisi:** İstemcinin Firestore'da abonelik kaydını doğrudan güncellemesi güvenlik kuralları (`firestore.rules`) ile engellenmiştir. Canlı ortamda satın alımlar Store (Google Play / App Store) webhook'ları ve Firebase Functions / RevenueCat backend köprüsü üzerinden güvenle onaylanmaktadır.
2. **Kullanıcı İlaç Ekleme Kısıtı:** Ücretsiz plandaki 2 ilaç limiti (`canAddMedicine`) ve AI kota limitleri istemci ve senkronizasyon katmanlarında sıkı bir şekilde denetlenmektedir.

---

## 🔒 3. AEGIS Kararı
Abonelik katmanı ve satın alma akışı sahtecilik (fraud) ve yetki yükseltme (privilege escalation) girişimlerine karşı güvenlidir.
