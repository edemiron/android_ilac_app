# Sprint 84 — StatisticsScreen Code-Level Review

**Tarih:** 2026-07-21
**Branch:** `fix/critical-issues-and-improvements`
**Kapsam:** `mobile/src/screens/StatisticsScreen.tsx` + `mobile/src/screens/StatisticsScreen/*`

## Baglam

Kullanici daha once Ana Sayfa, Ilaçlarim ve Settings ekran goruntulerini paylasip UI iyilestirmeleri uygulamistik (Sprint 73). Istatistikler ekrani (StatisticsScreen) icin screenshot yoktu, bu yuzden kod seviyesinde review yaptim. Ekran goruntuleri olmadan, kodun hangi review altinda oldugunu anlamak icin dosya yapisini, yardimci modulleri ve hangi desenlerin tekrar ettigini inceledim.

## Incelenen Dosyalar

| Dosya | Satir | Not |
| --- | --- | --- |
| `mobile/src/screens/StatisticsScreen.tsx` | 852 -> 835 | Ana ekran (7 useMemo, 3 chart) |
| `mobile/src/screens/StatisticsScreen/helpers.ts` | 95 | `getAdherenceColor`, `PERIOD_CONFIGS`, labels |
| `mobile/src/screens/StatisticsScreen/chartHelpers.ts` | 113 | `buildChartData`, `buildPieData`, `findTopMissedTimes` |
| `mobile/src/screens/StatisticsScreen/components/Section.tsx` | 62 | Section wrapper |
| `mobile/src/screens/StatisticsScreen/components/StatRow.tsx` | 79 | Tek satir (icon + label + value) |
| Toplam test | 118 | (Sprint 84 oncesi 118 suites) |

`chartHelpers.ts` zaten iyi ayrilmis, `findTopMissedTimes` unit test'lerle kapli. Ancak ana ekranda inline implementasyon hâlâ duruyor — duplication var.

## Tespit Edilen Findings

### F1 — `suggestions` useMemo ile `findTopMissedTimes` duplication (HIGH value)
Ekran dosyasi 33 satirlik bir useMemo (lines 115-142) barindiriyor:

```ts
// inline: filter + bucket + sort + slice + map
const suggestions = useMemo(() => { ... }, [medicineLogs, dateRange]);
```

Bu mantik `chartHelpers.ts`'deki `findTopMissedTimes` helper'i ile **ayni semantige** sahip. Helper Sprint 15.4'te cikarildi ama kullanilmadi — orphaned helper kalmis. Bu duplication:
- Helper'in coverage'sini 0'a dusuruyor
- Iki dosyada ayni tarih ayristirma (`split('T')[1]?.substring(0, 5)`) tekrar ediyor
- Code-level review'da "ayni kodu iki yerde degistirmek gerek" riski yaratir

### F2 — Dead wrapper `_getColor` (LOW value)
Line 202'de `const _getColor = (rate: number) => getAdherenceColor(rate, colors);` tanimli ama hic cagirilmiyor. Underscore prefix'i ile "intentionally unused" diye isaretlenmis ama gercek olarak silinmemis.

### F3 — Period toggle button eksik a11y (MEDIUM value)
Weekly/Monthly `TouchableOpacity` butonlari `accessibilityRole`, `accessibilityState` ve `accessibilityLabel` tasimiyor. Screen reader kullanicilari secili durumu anlayamiyor, sadece "Weekly"/"Monthly" duyuyor.

### F4 — Inline color paleti (INFO)
Birden fazla hex literal (`#DCFCE7`, `#FEF3C7`, `#FEE2E2`, `#DBEAFE`, `#F3F4F6`) `StatRow.iconBg` ve `iconContainer`'lara hard-coded. Theme token yok. Ancak bunlar tasarim amacli light pastel bg'ler (Material You MD3 scheme'den geleneksel tasarim kalibi); dark mode icin ayri bir pass gerekir. Sprint 55'te MD3 token eklenmesinden once bu duzeltilmemis. **Findings-only**, scope degil.

### F5 — Chart empty state'te accessibilityLabel yok (SKIPPED)
LineChart/PieChart wrapper'larina `accessibilityLabel` eklemek lazim ama `react-native-chart-kit` bu prop'u zaten yok; dis View'a eklemek anlamli katki saglamaz, cunku chart zaten text label ile aciklanmis. **Skipped.**

### F6 — Tum `Section` kullanim yerlerine a11y (DEFERRED)
Section component'ine `accessibilityLabel` prop'u eklemek 8+ call-site'i degistirmeyi gerektirir. Net diff < 40 limitini asar. **Bulgu olarak birakildi.**

## Uygulanan Improvements

### A1 — `suggestions` -> `findTopMissedTimes` delegation
`StatisticsScreen.tsx` line 115-142'deki 28 satirlik inline `useMemo` 7 satira indirildi:

```ts
const suggestions = useMemo(() => {
  const logs = medicineLogs.filter(
    log => isWithinInterval(new Date(log.scheduledTime), dateRange)
  );
  return findTopMissedTimes(logs, 2);
}, [medicineLogs, dateRange]);
```

Etki: chartHelpers.ts'deki mevcut 4 unit test su an gercekten call-path'i kapsiyor. Date parsing duplication ortadan kalkti.

### A2 — Dead `_getColor` silindi (A1 ile birlikte)
Use-site olmayan helper kaldirildi.

### A3 — Period button a11y (Haftalik / Aylik)
Her iki TouchableOpacity'ye eklendi:
- `accessibilityRole="button"`
- `accessibilityState={{ selected: ... }}`
- `accessibilityLabel={t('stats_weekly' | 'stats_monthly')}`

Screen reader kullanicilari artik "Haftalik, secili" / "Aylik, secili degil" duyar.

## Net Diff

```
mobile/src/screens/StatisticsScreen.tsx | 35 ++++++++--------
 1 file changed, 9 insertions(+), 26 deletions(-)
```

Toplam 17 satir net azalma (835 / orjinal 852) + 6 satir a11y eklenmesi. Planlanan 40-line budget icinde.

## Dogrulama (V1-V6)

| Adim | Sonuc |
| --- | --- |
| V1: `tsc --noEmit` | pre-existing MedicinesScreen.helpers.test.ts TS hatasi degisimden once de vardi, **NOT REGRESSED**. Istatistik kodunda yeni hata yok. |
| V2: `jest --silent` | 117 suites passed, 1354 tests passed (52 skipped, 1 skipped suite). 0 regresyon. |
| V3: `react-native bundle android` | 19 asset files copied, done. |
| V4: `gradlew assembleRelease` | BUILD SUCCESSFUL in 1m 41s |
| V5: `adb install -r` | `Success` (device 43cebdf1) |
| V6: commit + push | bknz. asagidaki SHA |

## Notlar

- Bu bir **kod-level review**'di. Daha once paylasilan ekran goruntuleri Ana Sayfa / Ilaçlarim / Settings icin kullanilmisti. Istatistik ekraninin screenshot'i yok, bu yuzden sadece source code'dan degerlendirildi.
- `findTopMissedTimes`'in coverage'i artik production path'a baglandi.
- Theme token migration (F4) ve Section a11y (F6) bulgu olarak birakildi — Sprint 55 sonrasi MD3 token scope'unda degerlendirilmeli.
- `accessibilityLabel` A3'te `t('stats_weekly')`/`t('stats_monthly')` zaten i18n key kullanildigi icin TR/EN otomatik dogru.
