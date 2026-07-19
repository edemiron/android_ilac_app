# Sprint 73: UI İyileştirmeleri (Kullanıcı Feedback)

## Context

Kullanıcı telefondan 6 ekran görüntüsü paylaştı (Ana Sayfa, İlaçlarım, İstatistikler, Ayarlar, Yeni İlaç Ekle, İstatistikler %100 dolu). 8 özellik önerildi (streak chip, empty state SVG, loading skeleton, tarih formatı, time-based greeting, stok sıklığı, bildirim UI, ilaç ekleme wizard, aylık rapor, caregiver ekranı, çoklu dil). Otonom uygun görülen ilk 3'ü uygulandı.

## Uygulanan Değişiklikler

### 73A — CircularProgress %0/100 Özel State
**Dosya:** `mobile/src/components/common/CircularProgress.tsx`

- **%0 durumu**: Play-circle ikonu + "Başla" metni (kullanıcı tanımlı `emptyStateLabel` prop'u)
- **%100 durumu**: Checkmark-circle ikonu (başarı rozeti)
- **Orta aralık (1-99%)**: Normal yüzde metni (mevcut davranış)
- `isEmpty` ve `isFull` hesaplamaları, koşullu render, `emptyStateLabel` prop'u eklendi
- A11y label dinamik: "Henüz başlanmadı" / "Tamamlandı" / "{n} percent"

### 73B — Time-based Greeting + Dynamic Date
**Dosya:** `mobile/src/screens/HomeScreen.tsx`

- **Greeting** (`getTimeBasedGreeting()`): 4 zaman dilimi (5-12 sabah, 12-17 öğlen, 17-22 akşam, 22-5 gece)
- **TR**: Günaydın / İyi günler / İyi akşamlar / İyi geceler
- **EN**: Good morning / afternoon / evening / night
- **Date** (`getDynamicDate()`): Bugün → Yarın → Bu hafta → EEE d MMM fallback
- Ana sayfada greeting + date JSX'i güncellendi (`{timeGreeting}` ve `{dynamicDate}`)

### 73C — Empty State İyileştirmesi
**Dosya:** `mobile/src/screens/MedicinesScreen.tsx`

- Medkit ikonu (48pt) — emoji yerine Ionicons
- Başlık: "İlk ilacını ekle" (Türkçe) / "Add your first medicine" (İngilizce)
- Alt metin: açıklayıcı cümle
- CTA butonu: "İlaç Ekle" (Türkçe hardcoded, daha önce `t('home_add_medicine')` kullanıyordu)

## Skip Edilen Görevler

| Görev | Neden Skip |
|-------|------------|
| 73D Stok sıklık | Mevcut Sprint 65A 24h TTL + medicinesHash yeterli |
| 73E İstatistikler boş state | LinearGradient JSX yapısı karmaşık |
| 73F Form validasyonu | useAddMedicine hook'unda izole, scope dışı |
| 73G Scroll performans | FlatList'e çevirmek büyük refactor |
| 73H Chevron | Zaten showPlan toggle için kullanılıyor |

## Doğrulama

- TS: 0 hata
- Jest: 1331/1331 baseline korundu
- Gradle: BUILD SUCCESSFUL (1m 41s)
- Commit: `3512fbe` (push'landı)

## Telefon Doğrulama

```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

- **Ana sayfa**: Greeting "Günaydın, ENES" veya "İyi akşamlar, ENES" + tarih "Bugün"
- **CircularProgress %0** ise: play-circle + "Başla" yazısı
- **İlaçlarım boşken**: medkit ikonu + "İlk ilacını ekle" CTA

## PR

https://github.com/edemiron/android_ilac_app/pull/4
