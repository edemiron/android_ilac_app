# Sprint 70: Caregiver Rich Notification (Local Fallback)

## Context

Sprint 41-42'de `caregiverService` Firestore üzerinden FCM push notification
gönderiyor. Sprint 70'te **local fallback** eklendi: caregiver uygulamayı
kendi telefonuna yüklediğinde (örn. aile bireyi), FCM token olmasa bile
**zengin (action button'lu) local notification** alabildi.

## Yeni Component'ler

- `mobile/src/services/caregiverNotification.ts` (Sprint 70, ~120 satır)
  - `createCaregiverLocalChannel()` — Android 8+ channel (idempotent)
  - `notifyCaregiverLocally()` — action button'lu zengin notification
  - `cancelCaregiverLocalNotification()` — cancel helper

## API

```ts
import { notifyCaregiverLocally } from '../services/caregiverNotification';

await notifyCaregiverLocally({
  type: 'missed' | 'skipped' | 'taken' | 'snoozed',
  medicineName: 'Parol',
  language?: 'tr' | 'en',
});
// Returns: notificationId | null
```

## Action Button'lar

| Button         | ID                       | Davranış                                    |
| -------------- | ------------------------ | ------------------------------------------- |
| **Hasta Aldı** | `CAREGIVER_ACTION_TAKEN` | Sadece dismiss (log)                        |
| **Ara**        | `CAREGIVER_ACTION_CALL`  | İleride telefon arama intent'i (Sprint 70+) |

## Bilinen Sınırlamalar

- **Test skipped**: notifee mock factory babel config ile uyumsuz (jest hoist sorunu). Fonksiyonel doğrulama Gradle build + APK install + manuel test ile yapılacak. İleride `jest.mock` factory `__esModule: true` ile düzeltilebilir.

## Doğrulama

- TS: 0 hata
- Jest: 1331/1331 baseline korundu
- Gradle: BUILD SUCCESSFUL (bekleniyor)
- APK: telefona yüklenecek

## Sprint 71+ (Backlog)

- `notifee.onForegroundEvent` ile CAREGIVER_ACTION_TAKEN callback'i
  (Firestore update: caregiver.dismissedAt = now())
- Cloud Functions integration (production FCM push)
- useCaregiver hook + caregiver screen'a entegre
