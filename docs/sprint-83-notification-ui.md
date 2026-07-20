# Sprint 83: NotificationSection UI Polish

## Summary
Sprint 83, NotificationSection icindeki 4 switch satirina (Vibration, Persistent Notification, Full Screen Alarm, Alarm Mode) gorsel AÇIK/KAPALI (ON/OFF) badge'i ekledi. Ayrica "Erteleme Hakkı" picker etiketini "X kez / X times" yerine daha anlamli "X erteleme / X snoozes" yapti.

## Changes

### File: `mobile/src/components/settings/NotificationSection.tsx`

#### 1. ON/OFF State Badge (Switch rows)
4 switch satirinin `rightElement`'i su anda `<Switch>` yerine:
- Badge (yesil "AÇIK" / gri "KAPALI", locale-aware)
- Switch

iceren bir `flexDirection: row` wrapper. Badge `accessibilityElementsHidden` ile a11y agacindan gizlendi — Switch'in `value` degeri zaten VoiceOver/TalkBack tarafindan okunuyor.

Renk semasi (NotificationSection disindaki ScoreCircle/LowStockCard ile uyumlu):
- ON: yesil `#10B981` (Success tone, success state), background `rgba(16,185,129,0.15)`
- OFF: gri `#6B7280` (Muted), background `rgba(156,163,175,0.18)`

#### 2. Snooze Count Label Polish
Onceki: `getSnoozeCountLabel(count)` → `"5 kez"` veya `"5 times"` (anlamsiz, "kez" cogul anlami yok, "times" ise redundant)
Yeni: `"5 erteleme"` (TR) ve `"5 snoozes"` (EN). Singular/plural-aware.

#### 3. RN imports
`View, Text` eklendi (`Switch, LayoutAnimation` zaten vardi).

## Diff Stats
- File: `mobile/src/components/settings/NotificationSection.tsx`
- 65 insertions, 26 deletions = +39 net (target <50)

## Verification

| Check | Status |
|-------|--------|
| `tsc --noEmit` | 0 new errors (1 pre-existing unrelated: MedicinesScreen.helpers.test.ts onPrimary token) |
| `jest --silent` | 1354 passed / 1406 total (52 skipped) — no regression |
| `react-native bundle` (android) | Done |
| `./gradlew assembleRelease` | BUILD SUCCESSFUL (1m 43s) |
| `adb install -r app-release.apk` | Success (43cebdf1) |

## Design Rationale
- **Why badges?** Onceki halde Switch'in ON/OFF durumunu gormek icin kucuk renk ipucuna bakmak gerekiyordu — ozellikle Persistent Notification (turuncu track) ve Alarm Mode (kirmizi track) gibi farkli renkli switch'ler tutarsizlik yaratiyordu. Badge ile tutarli bir ON/OFF gosterimi saglandi.
- **Why not change track colors?** Mevcut renk semasi zaten bilincli (kirmizi = alarm, turuncu = persistent, mor = primary). Badge eklemek, switch track rengininin semantic anlamini bozmadan ekstra state gosterimi ekliyor.
- **A11y:** Badge ekran okuyucudan gizlendi cunku Switch'in `value` durumu zaten erisilebilir. Iki kez okunmamali.

## Future Considerations
- Test row descriptions (Test Notification / Full Screen Alarm / Voice Reminder) hala kisa. Sprint 84'te genisletilebilir.
- Alarm Volume picker hala "Düşük/Orta" relative labels kullanıyor — actual percent (%30) bilgisi sadece picker icinde gozukuyor.
