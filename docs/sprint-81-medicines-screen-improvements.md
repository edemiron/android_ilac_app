# Sprint 81: İlaçlarım Ekranı İyileştirmeleri

## Context

Kullanici "İlaçlarım menüsünü ve kodlarını analiz et. Geliştirmeme yardımcı ol."

Analiz sonucu 3 gerçek UX iyileştirmesi:

1. **SKT badge tutarsız renk** — Sadece Parol'de "SKT: 11 Tem 2027" görünüyor, soluk gri. SKT yaklaşınca belirgin olmalı.
2. **Stok sayısı görünmüyor** — MedicineRow'da mevcut stok bilgisi yok. "deneme" ilacı stok düşük olabilir, kullanıcı göremiyor.
3. **Geçmiş/gelecek saat karışık** — Tüm saatler aynı renk. Geçmiş saatler muted olmalı (tıklanmış/geçilmiş hissi).

## Değişiklikler

### 81A — SKT Akıllı Renk

**Dosya:** `mobile/src/screens/MedicinesScreen/components/MedicineRow.tsx`

Yeni helper `getExpiryColor(expiryDate, reminderDays, colors)`:
- `< 0 gün` (süresi dolmuş): `colors.error + '20'` bg, `colors.error` fg
- `< reminderDays` (yaklaşıyor): `colors.warning + '20'` bg, `colors.warning` fg
- `< 90 gün` (yakın gelecek): `colors.success + '15'` bg, `colors.success` fg
- `> 90 gün` (uzak): `colors.textMuted + '15'` bg, `colors.textMuted` fg
- Tarih yoksa: muted (badge hiç gösterme)

`differenceInCalendarDays` import'u eklendi.

### 81B — Stok Badge

Yeni helper `getStockColor(stockCount, threshold, colors)`:
- `stockCount <= threshold`: kırmızı (critical) — "Stok az (X)"
- `stockCount <= 2x threshold`: sarı (low) — "X kaldı"
- `stockCount > 2x threshold`: muted (ok) — "X kaldı"
- `stockEnabled = false` veya stockCount undefined: badge hiç gösterme

3 variant: `'critical' | 'low' | 'ok'` (Sprint 65 stock-dismiss ile tutarlı).

`stockBadge` + `stockBadgeText` stilleri eklendi.

### 81C — Saat Chip Zaman Bazlı Renk

Yeni helper `isFutureTime(time: string): boolean`:
- HH:MM şu andan büyükse → gelecek
- Aksi halde → geçmiş

`timeChip`'in JSX'inde koşullu:
- **Gelecek saat + aktif ilaç**: `medicine.color + '25'` bg + border + `medicine.color` fg (primary vurgu)
- **Geçmiş saat + aktif ilaç**: `colors.textMuted + '15'` bg, `colors.textMuted` fg (muted)
- **Pasif ilaç**: `colors.inputBackground` (mevcut)

## Sonuç

Önceki tüm saatler (08:00, 08:10, 08:20, 08:30) artık **muted** görünür (saat 1:13'te tümü geçmiş). Sadece gelecek saat primary renkte parlar. Kullanıcı ilacın aktif/etkisiz durumunu saat renginden anında okur.

SKT badge artık **zamana duyarlı**: 1 yıl uzaktayken muted, 90 gün yaklaşınca yeşil, hatırlatma eşiğinde sarı, geçmişte kırmızı.

Stok badge aktif: "Stok az (3)" kırmızı, "12 kaldı" muted.

## Doğrulama

- **TS**: 0 hata
- **Jest**: 1332/1332 (değişmez — pure helper'lar eklendi, ileride unit test eklenebilir)
- **Gradle**: BUILD SUCCESSFUL (1m 44s)
- **APK install**: Success (43cebdf1)

## Telefon Doğrulama

İlaçlarım sekmesine gidin:
- 4 ilaç kartı (Parol, TERRAMYCIN, REPARIL-GEL, deneme)
- **Saatler** muted (tümü 08:00-08:30, şu an 13:xx)
- **Stok badge'leri** (eğer stockEnabled=true ise): Parol "30 kaldı", "deneme" düşük stok ise "Stok az (X)" kırmızı
- **SKT badge** (sadece Parol): "11 Tem 2027" muted (1 yıl uzakta)

## İleride (Sprint 82+ backlog)

- 81D: "deneme" placeholder validasyonu (Sprint 73F scope)
- 81E: Hızlı "✓ Aldım" action butonu (Sprint 73F scope)
- Pure helper unit testleri (`getExpiryColor`, `getStockColor`, `isFutureTime`)
- Stok seçim wizard'da initial stock input