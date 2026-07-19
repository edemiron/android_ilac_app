# Sprint 71: Caregiver Event Handler (Hook)

## Context

Sprint 70'te caregiver zengin notification (Hasta Aldı + Ara action button) eklendi. Sprint 71'de action button basıldığında callback işleme alındı.

## Yeni Component'ler

- `mobile/src/services/caregiverEventHandler.ts` (~75 satır, YENİ)
  - `useCaregiverEventHandler(callbacks)` hook — foreground + background event listener
  - `CaregiverEventCallbacks` type — `onPatientTook`, `onCallPatient`, `onDismiss`
  - Action dispatch: `CAREGIVER_ACTION_TAKEN` (Hasta Aldı) → `onPatientTook(medicineName, doseTime)`
  - `CAREGIVER_ACTION_CALL` (Ara) → `onCallPatient()`
  - `EventType.DISMISSED` → `onDismiss()`
  - Background + foreground dual subscription (Sprint 70 PR #4 notune uygun)

## API

```ts
import { useCaregiverEventHandler } from './services/caregiverEventHandler';

useCaregiverEventHandler({
  onPatientTook: (medicineName, doseTime) => {
    // Firestore medicineLog update (Sprint 72)
  },
  onCallPatient: () => {
    // Telefon arama intent
  },
  onDismiss: () => {
    // Telemetry log
  },
});
```

## Bilinen Sınırlamalar

- **App.tsx entegrasyonu YOK** — Sprint 72'de yapılacak (Firestore update + caregiverService çağrısı)
- **Firestore sync** — useCaregiverService update helper gerekli
- **Sprint 72 backlog**: useEffect mount + telemedicine link, logMedicineTaken onHasta Aldı action

## Doğrulama

- TS: 0 hata
- Jest: 1331/1331 baseline korundu
- Yeni test eklenmedi (integration test Sprint 72'de)

## Telefon Doğrulama

Manuel test Sprint 72'de mümkün (Firestore entegrasyonu gerekli).
