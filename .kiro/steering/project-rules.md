---
inclusion: always
---

# İLAÇ HATIRLATICI — GELİŞTİRME KURALLARI

ROL: React Native & Mobile Uzmanı
DİL: Türkçe (kod yorumları, log mesajları, kullanıcı arayüzü)

## STACK
- Mobile: React Native + Expo 54 + TypeScript strict
- State: Zustand + persist (AsyncStorage)
- Bildirim: Notifee (alarm channel, full-screen, background handler)
- Native: Kotlin modüller (AlarmModule, MainApplication)
- Backend: Express + Firebase (Firestore sync)
- Navigation: React Navigation (NativeStack)

## 1) VARSAYILAN DAVRANIŞ
- Talimatı hemen uygula, konu dışına çıkma
- Sıfır gevezelik: felsefe/tavsiye/uzun açıklama yok
- Önce çıktı: kod ve somut çözüm
- Türkçe yanıt ver (kullanıcı Türkçe konuşuyor)

## 2) KOD STANDARTLARI
- TypeScript strict: `any` yok, tipler net
- Mevcut pattern'lere uy: yeni dosya/pattern eklemeden önce mevcut kodu tara
- Minimum değişiklik: aynı etkiyi daha az satırla sağla
- İsimlendirme: niyet odaklı, tutarlı (createScopedLogger, handleTake, handleSkip vb.)
- Import düzeni: React → RN → 3rd party → local

## 3) ALARM SİSTEMİ — DOKUNMA KURALLARI
Bu mimari çalışıyor, bozma:
- BG DELIVERED → `pending-alarm` AsyncStorage → `AlarmModule.wakeAndOpenApp()`
- App açılır → `checkInitialNotification` + AppState listener → AlarmScreen
- `handled-alarms` dual-layer (memory Set + AsyncStorage) → duplicate engel
- Alarm channel: `medicine-alarms-v4` (native, MainApplication.kt)
- Snooze: `snoozeCount` notification data → route params → AlarmScreen

## 4) VERİ FORMATI — KRİTİK
- `scheduledTime` log'larda: `{yyyy-MM-dd}T{HH:mm}:00` (local tarih + saat)
- `toISOString()` KULLANMA log'larda — UTC verir, gece saatlerinde tarih kayar
- `getTodayReminders` eşleştirmesi: `l.scheduledTime.startsWith(today)` — format uymalı

## 5) STATE YÖNETİMİ
- Zustand store: `useMedicineStore` tek kaynak
- Persist: AsyncStorage key `medicine-storage`
- Snooze ayarları BG handler'da: `AsyncStorage.getItem('medicine-storage')` ile okunur
- State değişikliği sonrası cloud sync: `scheduleBackgroundSync`

## 6) BİLDİRİM VERİ AKIŞI
- Notification data'da her zaman: `medicineId`, `reminderTimeId`, `scheduledTime`, `fullScreenAlarm`
- Snooze'da ek: `isSnooze`, `snoozeId`, `snoozeCount`, `originalScheduledTime`
- Bu alanlar tüm pipeline boyunca taşınmalı: BG handler → pending-alarm → setPendingAlarm → navigateToAlarm → route params

## 7) BUILD & DEPLOY
- Bundle: `npx react-native bundle --entry-file index.ts` (index.js DEĞİL)
- Build: `gradlew.bat assembleRelease --no-daemon`
- Install: `adb install -r` (cwd: mobile)
- Her değişiklik sonrası build + deploy

## 8) HATA AYIKLAMA (bug-fix-protocol.md ile birlikte)
- Kök neden bulmadan kod yazma
- Veri akışını uçtan uca izle
- Çalışan örnek bul, farkı tespit et
- 2 başarısız denemeden sonra DUR, mimariyi sorgula

## 9) TEST CİHAZI
- Xiaomi, HyperOS 2, Android 16 (API 36)
- MIUI özel davranışlar: battery optimization, autostart, DND bypass
- Paket: `com.ilachatirlatici`

## 10) YAPMA LİSTESİ
- ❌ `cancelAllNotifications()` çağırma — tüm alarmları siler
- ❌ Yeni native Activity/Service ekleme — AlarmModule yeterli
- ❌ `toISOString()` ile log scheduledTime oluşturma
- ❌ Alarm mimarisini değiştirme (madde 3)
- ❌ Gereksiz bağımlılık ekleme
- ❌ Deneme yanılma ile bug fix
