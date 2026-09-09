# Sprint 5: useAlarmNavigation Tam Hook — Yol Haritası

**Tarih:** 2026-06-25  
**Durum:** Planlama tamamlandı, uygulama sonraki oturuma

## Amaç

`useAlarmQueue` (mevcut) sadece `pendingAlarm` state'ini tutar. **Tam versiyon** `navigateToAlarm` callback'ini, notification listener setup'ını ve initial notification check'ini de hook'a almalı.

## Mevcut Durum

- `mobile/App.tsx:476-560` — `navigateToAlarm` callback (150 satır)
- `mobile/App.tsx:843-846` — `pendingAlarm` useEffect (navigation trigger)
- `mobile/App.tsx:684-751` — notification listener setup (kullanıcı dilinden setupNotificationListeners)
- `mobile/App.tsx:754-832` — initial notification check (pending alarm restore)

## Hedef Hook Yapısı

```typescript
export function useAlarmNavigation(options: UseAlarmNavigationOptions): {
  pendingAlarm: PendingAlarmData | null;
  // navigateToAlarm artık hook içinde, App.tsx'ten kaldırılır
};
```

## Parametreler (Hook'a inject edilecek)

- `navigationRef`: NavigationContainerRef
- `setAlarmActive`, `getMedicineById`, `getReminderTimesForMedicine`: medicineStore action'ları
- `settings`: user settings (alarm mode için)
- `securityCheckComplete`: PIN kontrolü tamam mı
- `resumeDeferredSecurityAfterAlarmAbort`: alarm abort handler
- `setAlarmLaunchInProgress`, `clearAlarmNavigationFallback`: navigation state
- `setPendingAlarm`: alarm state setter

## Refactor Adımları

1. **Bağımlılık analizi:** `navigateToAlarm` içinde hangi fonksiyon/değişken kullanılıyor
2. **Hook interface tasarımı:** Parametreler ve geri dönüş değerleri
3. **Hook implementasyonu:** Mevcut kod olduğu gibi taşınır (davranış korunur)
4. **App.tsx entegrasyonu:** State'ler hook'a geçirilir, eski callback kaldırılır
5. **Test doğrulaması:** Tüm testler geçmeli

## Riskler

- `navigateToAlarm` birçok state ve callback'e bağımlı — bağımlılık yönetimi kritik
- `useCallback` dependency array'leri stale closure'a yol açabilir
- `alarmNavigationFallbackTimeoutRef.current` gibi ref'ler hook içine taşınmalı

## Tahmini Süre

- Planlama: 1 saat (bu doküman)
- Uygulama: 2-3 saat (sonraki oturum)
- Test: 30 dakika

## Sprint 6 ile Bağlantı

Sprint 5 sonrası `navigateToAlarm` App.tsx'ten çıkınca, **Sprint 6'da** `handleIncomingAlarmNavigation` (alarmNavigation.ts'de zaten var) ile DRY refactor yapılabilir.