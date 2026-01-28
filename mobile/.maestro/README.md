# Maestro E2E Tests

İlaç Hatırlatıcı uygulaması için E2E test suite.

## Kurulum

### Windows

1. **Java 11+ gerekli** (Maestro Java tabanlı)
   ```powershell
   java -version
   ```

2. **Maestro CLI Kurulumu**
   ```powershell
   # PowerShell ile kurulum
   Invoke-WebRequest -Uri "https://get.maestro.mobile.dev" -OutFile "install.ps1"
   .\install.ps1

   # Veya manuel indirme:
   # https://github.com/mobile-dev-inc/maestro/releases
   # maestro-cli.zip indir ve PATH'e ekle
   ```

3. **Android Emulator veya Cihaz**
   ```bash
   adb devices  # Cihazın bağlı olduğunu doğrula
   ```

### macOS / Linux

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

## Test Çalıştırma

### Tüm testleri çalıştır
```bash
cd mobile/.maestro
maestro test flows/
```

### Tek test çalıştır
```bash
maestro test flows/01_launch_app.yaml
```

### Studio ile görsel debug
```bash
maestro studio
```

### CI modunda çalıştır (headless)
```bash
maestro test --format junit flows/
```

## Test Flow'ları

| Flow | Açıklama |
|------|----------|
| `01_launch_app.yaml` | Uygulama başlatma testi |
| `02_permissions_flow.yaml` | İzin akışı testi |
| `03_add_medicine.yaml` | İlaç ekleme testi |
| `04_home_interactions.yaml` | Ana ekran etkileşimleri |
| `05_settings_flow.yaml` | Ayarlar testi |
| `06_medicine_actions.yaml` | İlaç düzenleme/silme |

## Yeni Test Ekleme

1. `flows/` klasöründe yeni `.yaml` dosyası oluştur
2. Naming convention: `NN_test_name.yaml`
3. Örnek yapı:

```yaml
appId: com.ilachatirlatici
name: "Test Adı"
---
- launchApp:
    appId: com.ilachatirlatici

- assertVisible:
    text: "Beklenen metin"

- tapOn:
    text: "Buton"

- takeScreenshot: "test_result"
```

## Troubleshooting

### Test başarısız oluyor
- Emulator'ün tam yüklendiğinden emin ol
- `clearState: true` ile temiz başlangıç yap
- Timeout değerlerini artır

### Element bulunamıyor
- `maestro studio` ile element'leri incele
- `id`, `text`, veya `index` kullan
- `optional: true` ile soft assertion yap

## CI Entegrasyonu

GitHub Actions workflow'u `.github/workflows/e2e.yml` dosyasında tanımlı.

Self-hosted runner gerektirir (Android emulator için).
