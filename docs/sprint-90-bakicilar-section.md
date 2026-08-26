# Sprint 90: Settings > Bakıcılar Section

## Context

Caregiver sistemi Sprint 41-72 arasında büyüdü (rich notification, event handler, telemedicine). Ancak **Settings'te** bakıcı yönetim UI yoktu — sadece ayrı `CaregiverInviteScreen` (davet kabul) vardı. Hasta tarafı caregiver listesini göremez, davet gönderemez, kaldıramazdı.

## Yeni Component

### `CaregiverSection` (YENİ)

**Dosya:** `mobile/src/components/settings/CaregiverSection.tsx` (~280 satır)

SettingsScreen'in DailyScheduleSection'dan hemen sonra eklenen yeni section.

**Özellikler:**
- **Aktif bakıcılar listesi** — avatar (initials) + isim + email + "Kaldır" butonu
- **Bekleyen davetler** — pending invites, "Bekliyor" badge + davet kodu + "İptal" butonu
- **Yeni davet formu** — email input + "Bakıcı Davet Et" butonu
- **Boş durum** — "Henüz bakıcınız yok" mesajı
- **a11y** — accessibleLabel her buton ve input'ta

**Hook bağımlılığı:** `useCaregiver` (zaten mevcut Sprint 49'de) — caregivers, pendingInvites, createInvite, removeCaregiverRel, cancelInviteRel.

### Settings Entegrasyonu

**Dosya:** `mobile/src/screens/SettingsScreen.tsx`

- Import: `CaregiverSection` (`../components/settings`)
- Render: DailyScheduleSection'dan hemen sonra, AppearanceSection'dan önce
- Sıralama önemli — Bakıcılar üstte görünür

## Doğrulama

- **TS**: 0 hata
- **Jest**: **1352/1352** (regresyon yok)
- **Gradle**: BUILD SUCCESSFUL (3m 38s)
- **APK**: Build edildi (cihaz bağlı değildi)

## Testte Yapılan Değişiklik

**Dosya:** `mobile/src/__tests__/screens/SettingsScreen.test.tsx`

- `jest.mock('../../components/settings', ...)` mock objesine `CaregiverSection: simpleMock` eklendi
- Diğer 12 section mock'u korundu

## Telefon Doğrulama

Cihaz bağlandığında:
- Ayarlar → "BAKICILAR" section'ı görünür
- "Bakıcı Davet Et" formu + email input
- Mevcut caregivers listesi (avatar + isim + Kaldır)
- Bekleyen invites (Pending badge + kod + İptal)
- "veya QR kod ile davet et" link (onOpenInviteScreen prop'u opsiyonel)

## PR Güncelleme

Sprint 90 commit Sprint 77-88 PR'ına (PR #5) push edildiğinde otomatik güncellenir. PR description güncellemesi Sprint 89'da yapıldı — Sprint 90'ı da eklemek için yeni commit gerekebilir.

## Bilinen Sınırlamalar

- Davet gerçek SMS/email göndermiyor (caregiverService console.log ile bırakılmış) — Sprint 70'de olduğu gibi
- `useCaregiver` aktif ilişki yoksa boş array döner, empty state gösterilir
- onOpenInviteScreen opsiyonel — verilirse QR butonu görünür, yoksa gizli (CaregiverInviteScreen navigation korunur)