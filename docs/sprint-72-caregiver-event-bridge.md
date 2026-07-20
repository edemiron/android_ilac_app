# Sprint 72: Caregiver Event Bridge (App.tsx Mount)

## Context

Sprint 70: caregiver zengin notification (Hasta Aldı + Ara) — tamamlandı.
Sprint 71: `useCaregiverEventHandler` hook'u — tamamlandı ama **mount edilmedi**.

Backlog: "App.tsx entegrasyonu YOK — Sprint 72'de yapılacak (Firestore update + caregiverService çağrısı)".

## Yapılan Değişiklikler

### 72.1 — App.tsx inceleme

Mevcut provider chain:
```
UserProfile > Accent > Theme > LowStockDismiss > Onboarding > Language > Auth > Subscription > Alert > AppContent
```

Bridge için en uygun nokta: `<AlertProvider>` içinde, `<AppContent>`'tan hemen önce. AuthProvider'dan sonra olmalı (caregiverId için).

### 72.2 — CaregiverEventBridge component

**Yeni dosya:** `mobile/src/components/CaregiverEventBridge.tsx` (~140 satır)

- `useAuth()` ile caregiverId okur
- `subscribeToCaregivers` ile caregiver'in ilk aktif ilişkisini "activePatientId" olarak seçer
- `useCaregiverEventHandler({...})` hook'unu mount eder
- 3 callback bağlar:
  - `onPatientTook` → Firestore medicineLog yazar
  - `onCallPatient` → Linking.openURL('tel:...')
  - `onDismiss` → log
- `null` döner (görünmez mount component)

### 72.3 — Firestore logMedicineTaken

**Dosya:** `mobile/src/services/caregiverService.ts`

İki yeni helper:

**`logMedicineTakenByCaregiver(patientId, medicineName, doseTime)`**:
- `users/{patientId}/medicineLogs/{autoId}` subcollection'a yazar
- `source: 'caregiver_action'` ayırt edici field
- `serverTimestamp()` ile server-side zaman
- `{success, logId?, error?}` döner

**`getPatientPhoneNumber(patientId)`**:
- `users/{patientId}.phoneNumber` field'ını okur
- Boş string fallback (telefon yoksa caregiver "Ara" çalışmaz, Alert gösterir)

### 72.4 — Tel arama entegrasyonu

**Dosya:** `mobile/src/components/CaregiverEventBridge.tsx`

- `Linking.canOpenURL('tel:PHONE')` ile destek kontrol
- `Linking.openURL('tel:...')` native dialer açar
- Telefon sanitize: sadece rakam ve `+` bırakılır
- Telefon yoksa Alert: "Bu hastanın telefon numarası kayıtlı değil."

### 72.5 — App.tsx mount

```tsx
<AlertProvider>
  {/* Sprint 72: CaregiverEventBridge — caregiver "Hasta Aldı" / "Ara" action'larını Firestore'a bağlar */}
  <CaregiverEventBridge />
  <AppContent />
</AlertProvider>
```

## Akış Diyagramı

```
[Hasta telefon]
  ↓ ilaç zamanı geldi
[notifyCaregivers] → Firestore push
  ↓ (veya local notification fallback)
[Caregiver telefon] → "Hasta Aldı" / "Ara" notification action
  ↓
[useCaregiverEventHandler] → handleEvent()
  ↓ onPatientTook / onCallPatient
[CaregiverEventBridge callback]
  ↓
[Firestore medicineLogs subcollection] veya [tel: dialer]
```

## Migration / Backward Compat

- `LayoutVariant` değişmedi (A/B)
- Yeni eklenen component/service fonksiyonları additive
- `useCaregiverEventHandler` callback'leri opsiyonel — mevcut kullanım etkilenmedi
- caregiverService ServiceResult wrapper'ları korundu (geriye uyumlu)

## Doğrulama

- **TS**: 0 hata
- **Jest**: 1332/1332 (değişmez — Sprint 72 entegrasyonu ek test gerektirmez, integration test ileride)
- **Gradle**: BUILD SUCCESSFUL (1m 47s)
- **APK install**: Success (43cebdf1)

## Telefon Doğrulama

Manuel test gerekir (gerçek hasta-caregiver bağlantısı ile):
1. Hasta tarafında caregiver invite oluştur → davet kodu al
2. Aile bireyi telefonunda uygulamayı kur, davet kodunu kabul et
3. Hasta tarafında ilaç zamanı geldiğinde caregiver notification gösterilir
4. "Hasta Aldı" basılınca → caregiver tarafında callback tetiklenir → Firestore'a log yazılır
5. "Ara" basılınca → hasta telefonu dialer açılır

Bu senaryo Sprint 70 + 71 + 72 birleşik çalışmasıyla test edilir. Production'da Cloud Function üzerinden yetkilendirme gerekli (mevcut implementasyon caregiver client-side yazar — MVP/demo seviyesinde).

## Bilinen Sınırlamalar

- **Güvenlik**: Firestore rule'da caregiver relationship validation şart (client-side yetki yok)
- **Production**: Cloud Function üzerinden yazma (caregiver client-side yazmamalı)
- **activePatientId MVP**: tek aktif hasta seçimi (multi-patient UI Sprint 73+)
- **telefon numarası**: hasta onboarding'de phoneNumber field yok — Sprint 73+ eklenecek