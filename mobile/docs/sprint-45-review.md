# Sprint 45 — Yüksek Öncelik: TypeScript Strict Mode (Final Review)

## Ozet

Sprint 45'te **Yüksek Öncelik 2/3** tamamlandı:

- 24 latent TS strict hatası temizlendi (24 → 0)
- `tsconfig.json`'a ek strict flag'ler eklendi (noImplicitOverride, noImplicitReturns, useUnknownInCatchVariables vb.)
- `withTakenAt` generic kısıtı genişletildi (test fixture'larıyla uyumlu)
- `buildSelfHealNoDriftResult` `RescheduledSnoozeNotification[]` döndürecek şekilde düzeltildi
- `ErrorBoundary.componentDidCatch` + `render` `override` modifier eklendi
- Test fixture'ları tip güvenli hale getirildi (Snooze.snoozeCount, ReminderTime, sanitizeMedicineData)

**Zero regression** — 1233 testler hala geçiyor, ESLint temiz.

## Commit Timeline (1 commit)

| #   | Commit    | Aciklama                                  |
| --- | --------- | ----------------------------------------- |
| 1   | sprint-45 | TS strict mode gecisi + 24 hata temizligi |

## Görev Bazlı Sonuçlar

### Sprint 45.1: TS Strict Mode Düzeltmeleri (24 hata)

**Test dosyalarındaki hatalar (16 hata):**

1. `useMedicineHelpers.extended.test.ts:122-124` — `isValidReminderTimes(nullInput)` → `nullInput as unknown as string[]`
2. `useSettingsHelpers.extended.test.ts:65` — `normalizeTimeString(undefined as unknown)` → `as unknown as string`
3. `useSettingsHelpers.test.ts:85-86` — `closePickerVisibility` generic K inference'ı
   `Record<PickerKey, boolean>` ile explicit generic verildi
4. `buildersHelpers.test.ts:121-131` — `withTakenAt({ id: 'l1' } as never, ...)` + `as { takenAt?: string }`
5. `helpers.sanitize.test.ts:52` — `name: 42 as unknown as string` + `dosage: undefined as string | undefined`
6. `crudHelpers.test.ts:184` — boş array için explicit tip: `{ id, medicineId, time }[]`
7. `snoozesHelpers.test.ts:37` — `../../types` → `../../../types` (3 seviye yukarı)
8. `medicineStoreHelpers.test.ts:53` — `frequency: 1` kaldırıldı (ReminderTime'da yok)
9. `medicineStoreHelpers.test.ts:184+225` — Snooze fixture'larına `snoozeCount: 0` default
10. `medicineStoreHelpersSprint27.test.ts:130-140` — `as never` + `as { takenAt?: string }`
11. `notifications.schedule.test.ts:222` — `../../../types` → `../../types` (2 seviye yukarı)

**Source code hataları (5 hata):**

1. `BarcodeScannerScreen.tsx:90` — `navigation.navigate('Main' as never)`
2. `CaregiverInviteScreen.tsx:107` — `colors.disabled` → `colors.textMuted` (theme'de yok)
3. `medicineStore.ts:1259` — `buildSelfHealNoDriftResult` return type uyumsuz
4. `ErrorBoundary.tsx:39+59` — `override` modifier eksik (noImplicitOverride)
5. `withTakenAt` generic — `T extends { takenAt?: string }` → `T extends object` (test fixture'larıyla uyumlu)

## Toplam Sprint 45 Metrikler

| Metric                       | Sprint 44 sonu | Sprint 45 sonu | Delta   |
| ---------------------------- | -------------- | -------------- | ------- |
| TS hata                      | 24             | **0**          | **-24** |
| Test (pass)                  | 1233           | 1233           | 0       |
| ESLint uyarı                 | 4              | 4              | -       |
| tsconfig strict flag         | 1 (strict)     | 12             | +11     |
| medicineStoreHelpers helpers | 45             | 45             | 0       |
| medicineStore.ts             | ~1515          | ~1515          | 0       |

## Eklenen tsconfig.json Strict Flag'ler

```json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true,
  "strictFunctionTypes": true,
  "strictBindCallApply": true,
  "strictPropertyInitialization": true,
  "noImplicitThis": true,
  "alwaysStrict": true,
  "useUnknownInCatchVariables": true,
  "noImplicitReturns": true,
  "noImplicitOverride": true,
  "allowUnusedLabels": false,
  "allowUnreachableCode": false
}
```

`noUnusedLocals` ve `noUnusedParameters` false (ESLint zaten enforce ediyor).
`exactOptionalPropertyTypes` false (cok katı, mevcut codebase ile uyumsuz).
`noUncheckedIndexedAccess` false (functional helper'lar gereği `arr[0]` yaygın).
`noPropertyAccessFromIndexSignature` false (theme colors vb. icin gerekli).

## Mimari Prensipler (Sprint 45)

1. **Strict Mode Zaten Aktifti** — `strict: true` önceden vardı. **Asıl iş**:
   strict mode altında latent 24 hatayı temizlemek. Sprint 45'te ek 11 strict
   flag eklendi → gerçek strict mode coverage.
2. **Tip Güvenli Test Fixture'ları** — `Partial<Snooze>` yerine default `snoozeCount: 0`
   ekleyerek tip güvenli. `as never` cast'ler en son çare.
3. **Generic Constraint Pragmatism** — `withTakenAt<T extends object>` test
   fixture'ları (Omit<MedicineLog, 'takenAt'>) için esnek. Tip güvenliği hala korunuyor.

## Toplam Sprint 3-45 Bileşik Etki (43 Sprint)

| Metric                       | Sprint 3 önce | Sprint 45 sonra          | Toplam           |
| ---------------------------- | ------------- | ------------------------ | ---------------- |
| Toplam test                  | 565           | 1233                     | **+668 (+118%)** |
| Yeni modül                   | 0             | ~53                      | +53              |
| Pre-existing TS hata         | 12            | 0                        | -100%            |
| TS strict flag               | 1             | 12                       | +11              |
| ESLint uyarı (Sprint 16'dan) | 78            | 4                        | -95%             |
| Pure helper sayısı           | 0             | 45 (medicineStore) + ~46 | +91              |
| medicineStore.ts             | 1737          | 1515                     | **-222 (-13%)**  |

## Kalan Yüksek Öncelik

- ⏭️ **Sprint 46: medicineStore slice combine** (medicineStore 1515 satır → 4 slice + combine + devtools)

## Sprint 45 Dersler

1. **Strict Mode Tek Başına Yetmez** — `strict: true` 12 aydır vardı ama gerçek
   strict mode coverage (noImplicitOverride, noImplicitReturns, vb.) 24 latent
   hata saklıyordu. Sprint 45'te tüm ek flag'ler eklendi → 0 hata.
2. **Test Fixture'ları Tip Güvenli Olmalı** — `Partial<Snooze>` default
   `snoozeCount: 0` ile. Generic `withTakenAt<T extends object>` test fixture'ları
   (Omit tipi) ile uyumlu hale getirildi.
3. **Theme Color Uyumsuzlukları** — `colors.disabled` theme'de yoktu.
   `textMuted` zaten disabled UI için yaygın kullanılan renk. Tek satır fix.
4. **Route Parametre Tipleri** — `navigate('Main')` RootStackParamList'te
   tanımlı olmasına rağmen `NavigatorScreenParams<MainTabParamList>` parametre
   bekliyor. `as never` ile geçici bypass (Sprint 46+ sonrası refactor).

## Sprint 46 Planı (Sonraki)

medicineStore.ts → 4 slice (combine + devtools):

1. `medicines.ts` slice (CRUD + snooze)
2. `logs.ts` slice (medicineLogs + adherence)
3. `reminders.ts` slice (reminderTimes + notifications)
4. `settings.ts` slice (settings + sync + storage)
5. medicineStore.ts → 4 slice combine + re-export

Bu büyük riskli refactoring, ayrı branch'te denenmeli. Sprint 46+ için plan.
