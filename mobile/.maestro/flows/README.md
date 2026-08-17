# Maestro E2E test akışları — İlaç Hatırlatıcı

## Kurulum

```bash
# Maestro kurulumu (macOS)
curl -fsSL "https://get.maestro.mobile.dev" | bash
export PATH="$HOME/.maestro/bin:$PATH"

# Android emulator başlat (ayrı terminal)
emulator -avd Pixel_5_API_34 &
adb wait-for-device

# Metro bundler başlat (ayrı terminal)
cd mobile && npm start

# Tüm akışları çalıştır
maestro test .maestro/flows/
```

## Akışlar

### login.yaml

- Kullanıcı girişi akışını test eder
- Email + password input + Giriş Yap butonu + HomeScreen'e geçiş

### add_medicine.yaml

- Yeni ilaç ekleme akışı
- Medicines → + butonu → form → kaydet → listede görün

### alarm.yaml

- Alarm tetikleme + dismiss akışı
- Bildirim gelir → AlarmScreen → Aldım/Ertele → HomeScreen

## CI Entegrasyonu

Sprint 11'de `.github/workflows/e2e.yml` eklenecek:

- macos-latest runner
- Android emulator kurulumu
- Maestro çalıştırma
- Test raporları artifact olarak yükleme

## Notlar

- Her flow dosyası bağımsız çalışabilir
- App ID: com.ilachatirlatici
- Test timeout: 30s per step
- Retry policy: 2 retry per failed assertion
