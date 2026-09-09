# Sprint 11: E2E Maestro Workflow — Yol Haritası

**Tarih:** 2026-06-25  
**Durum:** Planlama tamamlandı, uygulama sonraki oturuma

## Amaç

`.github/workflows/e2e.yml` silinmiş, `.maestro/flows/` dizini de yok. E2E testlerini geri yaz.

## Mevcut Durum

- `.github/workflows/e2e.yml`: Silinmiş (PR #1 öncesi)
- `mobile/.maestro/flows/`: Silinmiş
- E2E test yokluğu: Her PR'da platform-specific bug'lar merge sonrası ortaya çıkıyor

## Hedef

Minimum viable E2E:
1. **`.github/workflows/e2e.yml`** — macOS runner + Android emulator + Maestro test
2. **3 kritik flow:**
   - `login.yaml` — kullanıcı girişi
   - `add_medicine.yaml` — ilaç ekleme
   - `alarm.yaml` — alarm tetikleme + dismiss

## Adımlar

1. **Maestro kurulumu:** `.maestro/` dizini ve config
2. **Test akışları:** 3 flow dosyası
3. **GitHub Actions:** e2e.yml workflow
4. **Secrets:** Android emulator için gerekli secrets tanımla
5. **Dokümantasyon:** README'de E2E çalıştırma talimatı

## Tahmini Süre

- 4-6 saat (yeni flow yazma + test ortamı kurma)

## Riskler

- macOS runner pahalı (GitHub Actions dakika limiti)
- Android emulator setup zahmetli
- Maestro'nun React Native uyumluluğu test edilmeli