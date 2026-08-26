# Sprint 79: Sade Layout İyilestirme

## Context

Kullanici Sprint 78 sonrasi test: "Detayli ve Sade butonlari dogru calisiyor. Temalarda eksik bir sey var mi goze carpan."

Gozlem: Sade Layout (Layout A) ekran goruntusu 2-3'te cok minimal kaldi. Sadece:
- Yuzde + bekleyen sayisi
- Su An kartı
- Bugunun Plani (collapsed - sadece baslik)

Kullanici "Sade" sectiginde bilgi istemez anlamina gelmez; minimal ama yararli olmali.

## Degisiklikler

### 79A — Bugunun Plani Default Expanded

**Dosya:** `mobile/src/components/layouts/HomeScreenLayoutA.tsx:58`

- `useState(false)` → `useState(true)`
- Plan basligi tiklamadan once de TimelineItem listesi gorunur
- Kullanici hâlâ toggle edebilir (chevron calismaya devam)

### 79B — Inline Summary Satiri

**Dosya:** `mobile/src/components/layouts/HomeScreenLayoutA.tsx`

- Hero altina yeni `summaryRow` satiri
- Icerik: `Bugün 16 doz · 0 alındı · 12 bekleyen` (TR) / `Today 16 doses · 0 taken · 12 pending` (EN)
- Kosullu: `totalCount > 0` ise goster
- `textSecondary` rengi (hero vurgudan daha muted)
- Padding: `paddingHorizontal: 20, paddingVertical: 10`
- Border bottom ile hero'dan ayrilmis

## Yeni Stil

```ts
summaryRow: {
  paddingHorizontal: 20,
  paddingVertical: 10,
  borderBottomWidth: StyleSheet.hairlineWidth,
},
summaryText: {
  fontSize: 13,
  fontWeight: '500',
},
```

## Sonuc (Sade Layout)

Onceden:
- Yuzde + bekleyen chip
- Su An
- Bugunun Plani (collapsed — sadece baslik)

Sonra:
- Yuzde + bekleyen chip (hero)
- **Bugün 16 doz · 0 alındı · 12 bekleyen** (yeni inline summary)
- Su An
- Bugunun Plani (default expanded — TimelineItem'lar gorunur)

Artik "Sade" secen kullanici 16 dozun ne kadarini aldigi, ne kadarini bekledigini ve bugunun planini tek bakişta gorebiliyor.

## Dogrulama

- **TS**: 0 hata
- **Jest**: 1332/1332 (degismez)
- **Gradle**: BUILD SUCCESSFUL (1m 52s)
- **APK install**: Success (43cebdf1)

## Telefon Dogrulama

- **Sade Layout**: Hero + summary satiri + su an + bugunun plani (expanded)
- **Detayli Layout**: Degismez (7 kartli zengin gorunum)