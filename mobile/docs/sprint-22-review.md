# Sprint 22 — medicineStore Ek Helper Extraction (Final Review)

## Ozet

Sprint 21'in baslangicinda yapilan medicineStore.ts refactor'una devam. 3 ek pure
helper (countActiveSnoozes, uniqueNotificationIds, getActiveSnoozesForReminder)
cikarildi. Store methodlari (\_cleanupNotifications, createSnooze, runNotificationSelfHeal)
pure helper'a delege edildi. 6 yeni test ile helper test sayisi 21'e ulasti.

## Commit Timeline (1 commit)

| #   | Commit    | Aciklama                                                       |
| --- | --------- | -------------------------------------------------------------- |
| 1   | sprint-22 | medicineStore snooze/self-heal helper extraction + 6 yeni test |

## Gorev Bazli Sonuclar

### Sprint 22.1: Kalan inline analiz

medicineStore.ts (~1637 satir) icindeki inline logic taramasi tamamlandi. Tespit edilen
uygulanabilir pure logic noktalari:

- `_cleanupNotifications` — `snoozes.filter(...)` (3 satir)
- `createSnooze` — `countActiveSnoozes` (5 satir)
- `runNotificationSelfHeal` — `Array.from(new Set([...]))` deduplication (3 satir)

Side-effect iceren yerler (cancelNotification, AsyncStorage, vb.) pure helper'a
donusturulemez; olduklari yerde kalmali.

### Sprint 22.2: 3 yeni pure helper extraction

**Eklenen helpers:**

- `countActiveSnoozes(snoozes, medicineId, reminderTimeId, originalScheduledTime)`
  — createSnooze icin max snooze kontrolu oncesi aktif sayiyi hesaplar
- `uniqueNotificationIds(ids)` — runNotificationSelfHeal icindeki orphan + legacy
  snooze ID birlestirmesi tekrar onler (Set-based deduplication)
- `getActiveSnoozesForReminder(snoozes, medicineId, reminderTimeId)` — generic
  tip ile aktif snooze listesi; \_cleanupNotifications icin filtre

**Store wrapper delegasyonu:**

```typescript
// _cleanupNotifications
const activeSnoozes = getActiveSnoozesForReminder(snoozes, medicineId, reminderTimeId);

// createSnooze
const activeSnoozeCount = countActiveSnoozes(
  snoozes,
  medicineId,
  reminderTimeId,
  originalScheduledTime
);

// runNotificationSelfHeal
const cancelledNotificationIds = uniqueNotificationIds([
  ...driftReport.orphanTriggerIds,
  ...driftReport.legacySnoozeNotificationIds,
]);
```

### Sprint 22.3: 6 yeni helper testi

Test dosyasi: src/**tests**/stores/medicineStoreHelpers.test.ts (21 toplam test)

Yeni eklenen testler:

- `countActiveSnoozes` — 2 test (filters + empty)
- `uniqueNotificationIds` — 3 test (dedup, empty, order)
- `getActiveSnoozesForReminder` — 1 test (active matching)

## Toplam Sprint 22 Metrikler

| Metric                          | Sprint 21 sonu | Sprint 22 sonu | Delta  |
| ------------------------------- | -------------- | -------------- | ------ |
| Test (pass)                     | 1075           | 1081           | **+6** |
| medicineStoreHelpers.ts helpers | 7              | 10             | **+3** |
| medicineStore.ts                | ~1637          | ~1620          | -17    |
| ESLint uyari                    | 4              | 4              | -      |

## Mimari Prensipler (Sprint 22)

1. **Side-Effect vs Pure Ayrimi** — Pure logic (count, filter, dedup) helper'a cikar;
   side-effect (cancel, setState, AsyncStorage) oldugu yerde kalir. Bu ayrim
   refactor sinirini netlestirir.
2. **Generic Type Constraints** — `getActiveSnoozesForReminder<T extends {...}>(...)`
   generic tip ile farkli slice'lardaki Snooze tipine uyum saglar; type-safe filter.
3. **Kucuk Pure Helper Birikimi** — Tek tek 3-5 satirlik helper'lar kucuk gozukse de,
   Sprint 21-22 boyunca 10 helper'a ulasti. Helper library testability'i toplu
   olarak arttiriyor.

## Toplam Sprint 3-22 Bilesik Etki (20 Sprint)

| Metric                       | Sprint 3 once | Sprint 22 sonra          | Toplam          |
| ---------------------------- | ------------- | ------------------------ | --------------- |
| Toplam test                  | 565           | 1081                     | **+516 (+91%)** |
| Yeni modul                   | 0             | ~46                      | +46             |
| Pre-existing TS hata         | 12            | 0                        | -100%           |
| ESLint uyari (Sprint 16'dan) | 78            | 4                        | **-95%**        |
| Pure helper sayisi           | 0             | 10 (medicineStore) + ~46 | +56             |

## Kalan medicineStore.ts Iyilestirmeleri (Sprint 23+)

- `markMissedReminders` icindeki caregiver notification batch logic
- `clearAllData` orchestration
- `runNotificationSelfHeal` icindeki drift report builder
- medicineStore.ts'i 4-5 alt dosyaya bolme (medicines, logs, snoozes, settings, sync)

## Sprint 23 Onerileri (ileride)

- medicineStore.ts ek pure logic extraction (markMissedReminders)
- settingsStorage.ts veya settings sync logic icin pure helper
- alarmNavigation.ts inline logic (useAlarmNavigation.ts icindeki TDZ-safe pattern)
- package.json "type":"module" ekleme (Node ESM warning fix)
- TypeScript strict mode gecisi

## Dersler (Lessons Learned)

1. **Side-Effect / Pure Ayrimi** — Bir methodda hem side-effect hem pure logic
   varsa, pure kisimlari helper'a cikar, side-effect'i yerinde birak. Bu, testable
   boundaries yaratir.
2. **Kucuk Helper'larin Birikim Etkisi** — Tek basina 3 satirlik `uniqueNotificationIds`
   helper'i buyuk gozukmez; ancak 10+ helper biriktiginde, test edilebilir, okunabilir
   ve refactor-friendly kod tabani olusur.
3. **Generic Type ile Yeniden Kullanilabilirlik** — `getActiveSnoozesForReminder<T extends {...}>`
   ile helper'i farkli Snooze-shape'lerinde (slices/snoozes, store, medicineStore)
   kullanabiliriz; generic type constraint esneklik saglar.
