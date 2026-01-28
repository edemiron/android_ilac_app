# Claude Hafıza Dosyası

> **Son Güncelleme:** 2026-01-28
> **Aktif Session:** sessions/2026-01-28_ui-tweaks.md
> **Proje Durumu:** v1 TAMAMLANDI - UI Polish

---

## Kullanıcı

| Anahtar | Değer |
|---------|-------|
| İsim | Enes |
| Dil | Türkçe (her zaman) |
| Proje | Android İlaç Hatırlatıcı |
| Session Notları | Otomatik güncelle |

---

## Proje Durumu

**Tech Stack:** React Native 0.81.5 + Expo 54 + TypeScript 5.9.2 + Zustand 5.0.10 + Firebase

### v1 Release Özeti (26 Ocak 2026)

| Metrik | Değer |
|--------|-------|
| Test Sayısı | 271 (tümü geçiyor) |
| TypeScript | 0 hata |
| Release APK | Çalışıyor |
| Kilit Ekranı Alarm | Çalışıyor (MIUI uyumlu) |

### Tamamlanan Görevler

| Tarih | Görev | Detay |
|-------|-------|-------|
| 01-25 | ID Generator | UUID v7 (collision-proof) |
| 01-25 | Race Condition | SyncQueue pattern |
| 01-25 | Memory Leak | Listener cleanup |
| 01-25 | SettingsScreen refactor | 1187→136 satır |
| 01-25 | AddMedicineScreen refactor | 1008→174 satır |
| 01-25 | Test coverage | 64→271 test |
| 01-25 | Firebase App Check | Güvenlik katmanı |
| 01-26 | TypeScript temizliği | 9→0 hata |
| 01-26 | Release build fixes | AdMob, Notifee, package name |
| 01-26 | Full-screen alarm | MIUI/Xiaomi uyumlu |
| 01-26 | Notification actions | Take/Skip/Snooze çalışıyor |
| 01-26 | Deep link support | `ilachatirlatici://` scheme |

### Bekleyen Görevler (Opsiyonel)

| Öncelik | Görev | Not |
|---------|-------|-----|
| Düşük | Dead code temizliği | AI services |
| Düşük | E2E testler | Detox/Maestro |
| Opsiyonel | Play Store imzalı build | Production release |

---

## Mimari Kararlar

1. **Vertical Slice:** Component'ler feature bazlı organize
2. **Zustand:** Global state + AsyncStorage persistence
3. **Logger Utility:** `__DEV__` flag ile production sessiz
4. **UUID v7:** Tüm ID'ler için (time-ordered)
5. **Zod:** Input validation
6. **Constants.expoConfig.extra:** Firebase config for release builds

---

## Komutlar

```bash
# Test
cd mobile && npm test

# TypeScript check
cd mobile && npx tsc --noEmit

# Debug build + install (VARSAYILAN)
cd mobile/android && ./gradlew installDebug

# Release APK
cd mobile/android && ./gradlew assembleRelease --no-daemon

# Install release to device
adb install -r "mobile/android/app/build/outputs/apk/release/app-release.apk"
```

**NOT:** Metro bundler KULLANILMAZ. Debug build de JS bundle içerir (`debuggableVariants = []`).

---

## Session Geçmişi

| Tarih | Dosya | Özet |
|-------|-------|------|
| 01-25 | `2025-01-25_critical-fixes.md` | Race condition, memory leak, refactor |
| 01-26 | `2025-01-26_typescript-fixes.md` | TypeScript temizliği |
| 01-26 | `2026-01-26_ilac-projem-v1.md` | **v1 Final - Release build + Alarm** |
| 01-28 | `2026-01-28_ui-tweaks.md` | UI polish, hero card yukarı yaslandı |

---

*Bu dosya her session sonunda otomatik güncellenir.*
