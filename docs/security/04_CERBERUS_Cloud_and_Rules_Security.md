# 🦅 AJAN 04: CERBERUS — Bulut Güvenliği & Firestore Kuralları Raporu

**Tarih:** 21 Ağustos 2026  
**Görev:** Firestore Güvenlik Kuralları, Veri İzolasyonu ve Yetki Yükseltme (Privilege Escalation) Denetimi  
**Sorumlu Ajan:** CERBERUS (Cloud Architecture & Firestore Security Auditor)  
**Hedef Kapsam:** `firestore.rules`, `firestoreSync.ts`, `authService.ts`

---

## 🛡️ 1. Firestore Güvenlik Kuralları Denetim Matrisi

| Kural / Koleksiyon | Uygulanan Politika | Güvenlik Seviyesi |
|---|---|---|
| `/users/{userId}` | Sadece doğrulanmış `auth.uid == userId` erişebilir | **KATI (İzole)** |
| `/users/{userId}/subscription` | İstemciden oluşturma/güncelleme/silme tamamen yasak (`false`) | **KATI (Korumalı)** |
| `/users/{userId}/medicines` | Karakter allowlist regex kontrolü (`isValidMedicineText`) | **KATI (Enjeksiyon Korumalı)** |
| `/users/{userId}/medicineLogs` | Yabancı anahtar kontrolü (`exists(...)` ile ilaç varlığı doğrulanır) | **KATI (Bütünlük Korumalı)** |
| `/caregiverInvites/{inviteId}` | Sadece `patientId == auth.uid` oluşturabilir, bakıcı kabul edebilir | **KATI (Yetki Korumalı)** |
| `/{document=**}` | Genel yakalama kuralı: Kalan tüm koleksiyonlara okuma/yazma yasak | **KATI (Default Deny)** |

---

## 🔒 2. CERBERUS Kararı
Firestore güvenlik kuralları tam veri izolasyonu (tenant isolation) ve `default deny` prensibine göre mükemmel yapılandırılmıştır. İstemci tarafından abonelik yükseltme veya başkasının sağlık kayıtlarına erişme olasılığı sıfırdır.
