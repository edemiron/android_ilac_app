# Sprint 80: Sade Layout — Skip A11y + Status Badge Belirgin

## Context

Kullanici Sade Layout Sprint 79 sonrasi test ekran goruntuleri paylasti. Gozlem:

1. **Skip (X) butonunda text yok** — sadece X ikonu. Kullanici "iptal mi, atla mi, kapat mi?" karisikligi yasiyor.
2. **"10 saat sonra" badge cok soluk** — `textSecondary + 20% alpha`. "Su an" ve "Gecmis" durumundan daha az gorunur.
3. **accessibilityHint yetersiz** — sadece "Bu dozu atlandi olarak kaydeder", ilac adi icermez.

## Degisiklikler

### 80A — Skip Buton A11y + Gorunur Etiket

**Dosya:** `mobile/src/screens/HomeScreen/components/CurrentDoseCard.tsx`

- **Icon boyutu**: 18 → 16 (text ile sigacak sekilde)
- **Text eklendi**: `"Atla"` (TR) / `"Skip"` (EN), X ikonunun yaninda
- **Yeni stil**: `skipBtnText` (fontSize: 13, fontWeight: 600, marginLeft: 4)
- **accessibilityHint zenginlestirildi**: ilac adi dahil edildi ("Parol dozunu atlandi olarak kaydeder")
- **accessibilityLabel** zaten acik: "Parol dozunu atla"

### 80B — Countdown Badge Belirgin

**Dosya:** `mobile/src/screens/HomeScreen/components/CurrentDoseCard.tsx`

- Eski: `statusColor + '20'` (transparan arka plan + soluk renk)
- Yeni: `statusBg` paleti:
  - **isNow** (Su an) → `colors.primaryContainer` + `colors.onPrimaryContainer`
  - **isPast** (Gecmis) → `rgba(239, 68, 68, 0.18)` (koyu) veya `#FEE2E2` (acik) + kirmizi ton
  - **gelecek** (X saat sonra) → `colors.primaryContainer` + `colors.onPrimaryContainer` (soluk yerine)
- **Font**: 12/600 → 13/700 (daha okunur)
- **Padding**: 10/4 → 12/5 (biraz daha buyuk pill)

### 80C — Diger Ekranlar Tutarlilik Kontrolu

- SettingsScreen layout label: A=Detayli, B=Sade ✓
- HomeScreenLayoutA: showPlan default true ✓
- HomeScreenLayoutB: showPlan default true ✓ (Sprint 79 oncesi zaten boyleydi)
- AppearanceSection options: ['A', 'B'] ✓
- Switcher map: A → LayoutB, B → LayoutA ✓ (Sprint 78)

## Sonuc

| Ozellik | Once | Sonra |
|---------|------|-------|
| Skip buton | Sadece X ikonu | X + "Atla" text |
| Skip a11y hint | Generic | Ilac adli |
| Badge renk (gelecek) | Soluk textSecondary | primaryContainer |
| Badge font | 12/600 | 13/700 |

## Dogrulama

- **TS**: 0 hata
- **Jest**: 1332/1332 (degismez)
- **Gradle**: BUILD SUCCESSFUL (1m 39s)
- **APK install**: Success (43cebdf1)

## Telefon Dogrulama

Su An kartinda:
- "10 saat sonra" badge artik **primaryContainer** renginde, daha belirgin
- X butonu artik **"Atla"** text'i ile — kullanici ne yapacagini anliyor
- MD3 uyumlu renkler (primaryContainer/onPrimaryContainer)

Ayarlar > Ana Sayfa Duzeni:
- Detayli (Layout B): 7 MD3 karti, varsayilan plan expanded
- Sade (Layout A): kompakt hero + summary satiri + varsayilan plan expanded