# Sprint 6: navigateToAlarm DRY Refactor — Yol Haritası

**Tarih:** 2026-06-25  
**Bağımlılık:** Sprint 5 (useAlarmNavigation tam hook)  
**Durum:** Sprint 5 tamamlandıktan sonra uygulanabilir

## Problem

`App.tsx` içinde inline `navigateToAlarm` (150+ satır) ile `src/utils/alarmNavigation.ts` içinde `handleIncomingAlarmNavigation` — **iki paralel implementasyon**.

## Çözüm

`handleIncomingAlarmNavigation`'ı dependency injection ile App.tsx'ten çağır. `navigateToAlarm` callback'i bu fonksiyonu çağırsın.

## Adımlar

1. **Mevcut kodu analiz:** İki implementasyonun benzerlikleri ve farkları
2. **AlarmNavigationDependencies interface'i güncelle:** Yeni parametreler ekle
3. **App.tsx'te navigateToAlarm'ı refactor et:** handleIncomingAlarmNavigation'ı çağırsın
4. **Davranış doğrula:** Test coverage snapshot al, refactor öncesi ve sonrası karşılaştır

## Riskler

- Dependency'ler farklı olabilir (ref vs. inline state)
- `activeAlarmKeysRef` gibi ref'lerin paylaşımı sorunlu olabilir
- `setAlarmLaunchInProgress` navigation state'leri DRY olmayabilir

## Tahmini Süre

- 2 saat (Sprint 5 sonrası)
- Bu sprint tek başına uygulanabilir değil — Sprint 5'in tamamlanmasını bekler