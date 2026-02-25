# Bakıcı Modu İyileştirme Tasarımı
**Tarih:** 2026-02-25
**Yazar:** Grandmaster (Kullanıcı işbirliği ile)
**Durum:** Onaylandı

## Problem Tanımı

Mevcut bakıcı modu sınırlı. Bakıcıların hasta ilaçlarını uzaktan izlemesi, yönetmesi ve acil durumlarda müdahale edebilmesi gerekiyor. Mevcut sistemde:
- Sadece QR kod ile davet var
- Uzaktan ilaç yönetimi yok
- Gerçek zamanlı takip yok

## Hedefler

### Birincil Hedefler
- Bakıcı hasta ilaçlarını gerçek zamanlı izleyebilsin
- Kritik işlemler (ekleme/silme) için hasta onayı
- İlaç alma geçmişi ve uyum raporları paylaşılsın

### İkincil Hedefler
- Offline destek - internet olmadan da çalışsın
- Bildirim sistemi - bakıcıya anlık bildirim
- PDF rapor paylaşımı

### Kapsam Dışı
- Video görüşme
- Sesli konuşma
- Konum takibi

## Mimari

### Veri Akışı
```
Hasta (App)                    Bakıcı (App)
    │                              │
    ├─ Firestore (ilk sync)       │
    │                              ├─ Realtime DB (gerçek zamanlı)
    │                              │
    ├─ Notifee (alarm) ─────────►├─ Push bildirim
    │                              │
    └─ Realtime DB ◄──────────────┘
```

### Bileşenler

1. **CaregiverService**
   - Davet yönetimi
   - Bağlantı durumu
   - Yetki kontrolü

2. **RealtimeSync**
   - Firebase Realtime DB entegrasyonu
   - Offline cache
   - Conflict resolution

3. **ApprovalFlow**
   - Onay isteği oluşturma
   - Timeout yönetimi (5 dk)
   - Push bildirim tetikleme

4. **CaregiverNotificationService**
   - Anlık bildirimler
   - Acil durum uyarıları
   - Geçmiş bildirimler

## Veri Yapısı

### Firebase Realtime DB
```json
{
  "caregivers": {
    "{hastaUid}": {
      "caregivers": {
        "{bakkaciUid}": {
          "name": "Ahmet",
          "permission": "partial_approval",
          "status": "active",
          "createdAt": 1700000000000
        }
      }
    },
    "requests": {
      "{bakkaciUid}": {
        "type": "add_medicine",
        "medicineId": "abc123",
        "data": { /* ilaç detayları */ },
        "status": "pending",
        "createdAt": 1700000000000,
        "expiresAt": 1700000300000
      }
    },
    "logs": {
      "{logId}": {
        "medicineId": "abc123",
        "action": "taken",
        "timestamp": 1700000000000,
        " caregiverId": "bakkaciUid"
      }
    }
  }
}
```

### Firestore (Yedek)
```typescript
interface Caregiver {
  uid: string;
  displayName: string;
  permission: 'full' | 'partial_approval' | 'view_only';
  status: 'pending' | 'active' | 'rejected';
  createdAt: Date;
  lastSeen: Date;
}
```

## Güvenlik

### Erişim Kontrolü
| Rol | Okuma | Yazma | Onay Gerekli |
|-----|-------|-------|--------------|
| Hasta | Tümü | Tümü | Yok |
| Aktif Bakıcı | Tümü | Sınırlı | Evet (ekle/sil) |
| Bekleyen Bakıcı | Yok | Yok | Yok |

### Firebase Rules
```json
{
  "rules": {
    "caregivers": {
      "$hastaUid": {
        "caregivers": {
          "$bakkaciUid": {
            ".read": "auth.uid === $bakkaciUid || auth.uid === $hastaUid",
            ".write": "auth.uid === $hastaUid"
          }
        },
        "requests": {
          "$bakkaciUid": {
            ".read": "auth.uid === $bakkaciUid || auth.uid === $hastaUid",
            ".write": "auth.uid === $bakkaciUid"
          }
        }
      }
    }
  }
}
```

### Önlemler
- **Onay Timeout:** 5 dakika - onay verilmezse işlem iptal
- **Log Tutma:** Tüm işlemler kaydedilir
- **SSL/TLS:** Firebase zaten sağlar

## Hata Yönetimi

| Hata | Kullanıcı Mesajı | Otomatik Çözüm |
|------|-------------------|-----------------|
| Network yok | "Bağlantı yok, offline modda çalışılıyor" | Queue'la |
| Onay timeout | "İstek süresi doldu" | İptal et |
| Yetki yok | "Bu işlem için yetkiniz yok" | - |
| Conflict | "Çakışma tespit edildi" | Son yazım kazanır |

## Test Stratejisi

### Birim Testler
- CaregiverService
- ApprovalFlow
- RealtimeSync

### Entegrasyon Testleri
- Happy path: Bakıcı ekleme → İlaç ekleme → Onay → Tamamlandı
- Offline: Internet kesilir → Queue'la → Geri gelir → Sync

### Edge Case Testler
- Çoklu bakıcı
- Aynı anda onay/red
- Timeout süresi dolma

## Açık Sorular

- [ ] Bakıcı sayısı sınırı olsun mu? (Öneri: 5)
- [ ] Onay süresi 5 dk yeterli mi?
- [ ] PDF rapor bakıcı ile nasıl paylaşılsın?

## Karar Günlüğü

| Tarih | Karar | Gerekçe |
|--------|-------|---------|
| 2026-02-25 | Kısmi Onay modeli seçildi | Güvenlik + esneklik dengesi |
| 2026-02-25 | Firebase Realtime DB kullanılacak | Düşük gecikme, gerçek zamanlı |
| 2026-02-25 | 5 dk timeout | Makul süre |
