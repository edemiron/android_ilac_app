# Sprint 89: Uymum Grafiği Etiket Optimizasyonu

## Context

Sprint 88 sonrası İstatistikler ekran görüntüsünde "UYMUM GRAFİĞİ" 7 gün için etiket kesilmesi (Pazartesi "Paz..." olarak) görüldü. Haftalık mod için `EEE` formatı (3 harf: "Pzt", "Sal", "Çar"...) chart'ın 7 label x ~40px = 280px sınırında sığmıyor.

## Değişiklikler

**Dosya:** `mobile/src/screens/StatisticsScreen.tsx`

### 89A — Haftalık Etiket Sıkıştırma

**Önce:**
```ts
format(d.date, 'EEE', { locale: dateLocale })
// TR: "Pzt Sal Çar Per Cum Cmt Paz"
// EN: "Mon Tue Wed Thu Fri Sat Sun"
```

**Sonra:**
```ts
format(d.date, 'EE', { locale: dateLocale })
// TR: "Pt Sa Ça Pe Cu Cm Pa"
// EN: "Mo Tu We Th Fr Sa Su"
```

Plus chart font 10 → 9 (x-axis etiket font).

## Sonuç

| Element | Önce | Sonra |
|---------|------|-------|
| Haftalık x-label | "Pzt" (3 harf) | "Pt" (2 harf) |
| X-label font | 10pt | 9pt |
| Toplam genişlik | ~280px (sınırda) | ~260px (rahat) |

Aylık mod (`d` formatı) zaten kısa, değişmedi.

## Doğrulama

- **TS**: 0 hata
- **Jest**: 1352/1352 (regresyon yok — label sadece UI render'ı etkiliyor)
- **Gradle**: BUILD SUCCESSFUL (1m 58s)
- **APK**: Build edildi (cihaz bağlı değildi)

## Telefon Doğrulama

İstatistikler → Haftalık mod → UYMUM GRAFİĞİ:
- X ekseni etiketler artık "Pt Sa Ça Pe Cu Cm Pa" (2 harf, sıkı)
- "Paz" kesilmesi yok
- Chart points aynı konumda (data değişmedi)

## PR Güncelleme

PR #5 Sprint 77-88 kapsamındadır. Sprint 89 PR'a push edilecek → otomatik güncellenir.