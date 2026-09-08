# Çalışma Klasörü Temizlik Raporu — 5 Eylül 2026

**Kapsam:** `ila_v8_agy_cmd/` kökü ve `mobile/`, `web/`, `server/` alt klasörleri.
`node_modules/` ve `.git/` içine bakılmadı. **Hiçbir şey silinmedi** — bu bir
tarama raporu; işaretli maddeler senin onayınla silinecek.

**Geri kazanılabilir alan:** yaklaşık **5,1 GB** (yalnızca ✅ maddeler).

---

## 🔴 ÖNCE BU — tarama sırasında bulunan YENİ sızıntı

Temizlik raporu yazarken beklenmedik bir şey çıktı: `scripts/` altında iki
dosya, üçüncü bir sağlayıcının (z.ai / GLM) API anahtarını **düz metin ve
git'e commit edilmiş** hâlde taşıyor.

| Dosya | Satır | Ne var |
| :--- | :---: | :--- |
| `scripts/glm_bridge.js` | 6 | `API_KEY = process.env.GLM_API_KEY \|\| '<49 karakter, 2705… ile başlıyor>'` |
| `scripts/mcp-servers/glm_server.js` | 10 | `API_KEY = process.env.GLM_API_KEY \|\| '<…5fd1… ile başlıyor>'` |

Bunlar A1'deki dört anahtardan **farklı**, beşinci ve altıncı anahtar. Uygulama
kodunun parçası değiller — Antigravity IDE'nin GLM modeline bağlanması için
yazılmış köprüler. Ama repo herhangi bir yerde paylaşıldıysa bu anahtarlar
gitmiş demek.

- [ ] **Sende:** z.ai konsolundan bu iki anahtarı **iptal et** (yeniden üretmek
      yetmez, eskisi iptal edilmeli).
- [ ] Dosyalar aşağıda ✅ ile silinmeye işaretli. Git geçmişinde kalırlar —
      geçmişi temizlemek "geri alınamayan işlem" sınıfında, ayrıca sorarım.

---

## ✅ KESİNLİKLE SİLİNMELİ

Uygulamayla ilgisi yok, kaybı yok, bir kısmı aktif zarar veriyor (repo
boyutu, sızıntı yüzeyi). Sıra: en büyükten en tehlikeliye değil, **sebep
gruplarına** göre.

### A. Eski APK'lar — 3,3 GB

| # | Ne | Boyut | Git | Sebep |
| :---: | :--- | ---: | :---: | :--- |
| ✅ | Kökteki 27 `IlacHatirlatici_v1.5.0 … v1.8.0_release.apk` + `app-release.apk` | 1,9 GB | takipsiz | Hepsi eski sürüm; güncel 1.9.1. Her biri 74 MB, aynı dosyanın 27 kopyası. |
| ✅ | `apk/` klasörü (20 APK v1.5.0–v1.7.2 + 17 test ekran görüntüsü) | 1,4 GB | takipsiz | Kökteki listenin ikinci kopyası. |
| ✅ | `mobile/IlacHatirlatici_v1.4.9_release.apk`, `mobile/IlacHatirlatici_v1.5.0_release.apk` | 149 MB | takipsiz | Üçüncü kopya. |

> Yayınlanmış sürümlerin APK'sını saklamak istersen doğru yer Play Console'un
> kendi arşivi ya da repo dışında tek bir `releases/` klasörü — 27 kopya değil.

### B. Cihaz günlükleri ve ekran görüntüleri — GIT'TE, 270 MB

Bunlar test oturumlarından kalan `adb logcat` çıktıları ve `screencap`
görüntüleri. **Git'e commit edilmişler**; her `git clone` bunları indiriyor.
Günlükler cihaz kimlikleri, uid'ler ve bildirim yükleri içeriyor
(`xiaomi_siren_logcat.txt`te token benzeri bir dize var).

| # | Ne | Boyut | Git | Sebep |
| :---: | :--- | ---: | :---: | :--- |
| ✅ | `xiaomi_log.txt` | 137 MB | **takipli** | Ham logcat. Tek dosya, repo'nun en büyük nesnesi. |
| ✅ | `samsung_log.txt` | 37 MB | **takipli** | Ham logcat. |
| ✅ | `samsung_full_logcat.txt`, `samsung_logcat.txt`, `xiaomi_siren_logcat.txt`, `samsung_fcm_received.txt` (0 bayt) | 210 KB | **takipli** | Aynı sınıf. |
| ✅ | Kökteki **256** `*.png` (`samsung_*`, `xiaomi_*`, `tab_*`, `tablet_*`, `v155_*`, `screen_*`, `alarm_*`, `step3_confirm`, `sharesheet` …) | 95 MB | **takipli** | Test oturumu ekran görüntüleri. Kanıt değeri olanlar zaten arşiv kayıtlarında anlatılmış. |
| ✅ | `mobile/` kökündeki **28** `*.png` (`xiaomi_v150_*`, `samsung_*`) | ~6 MB | **takipli** | Aynı sınıf, farklı klasör. |
| ✅ | `mobile/screenshots/` (24 dosya) | 5,4 MB | **takipli** | Aynı sınıf. |
| ✅ | `samsung_ui.xml` | 45 KB | **takipli** | `uiautomator dump` çıktısı. |
| ✅ | `logs/` (`al1…al5.txt`, `build-1.7.2.log`, `build-1.7.3.log`) | 4,2 MB | **takipli** | Alarm test günlükleri + eski derleme günlükleri. |
| ✅ | `_dogrulama/` (`_tmp_*.ps1`, `ui_*.xml`, `*.log`) | 12 MB | takipsiz | Benim önceki oturumlardaki geçici doğrulama dosyalarım. Görevleri bitti. |

### C. Bu repoya ait olmayan proje — "Antigravity Kit"

`web/` klasörü ve kökteki `package.json` / `package-lock.json`, **başka bir
açık kaynak projenin** (vudovn/antigravity-kit — "AI Agent templates") Next.js
dokümantasyon sitesi. İlaç Hatırlatıcı ile hiçbir bağı yok; `web/src/app/layout.tsx`
başlığı "Antigravity Kit - AI Agent Capability Expansion Toolkit". Büyük
ihtimalle IDE kurulumu sırasında yanlış klasöre kopyalandı.

| # | Ne | Git | Sebep |
| :---: | :--- | :---: | :--- |
| ✅ | `web/` (89 takipli dosya + `web/node_modules`) | **takipli** | Yabancı proje. CI (`.github/workflows/ci.yml`) yalnızca `server/` ve `mobile/`yi çalıştırıyor; `web/`e hiçbir referans yok. |
| ✅ | Kökteki `package.json` (`"name": "antigravity-kit"`) ve `package-lock.json` | **takipli** | Aynı yabancı projenin manifesti. Uygulamanın gerçek manifestleri `mobile/package.json` ve `server/functions/package.json`. |

> Dikkat: kökte bir `package.json` olması, kökte `npm install` yapan birini
> yanlış projenin bağımlılıklarını kurmaya yönlendirir.

### D. Sızıntı taşıyan / tek kullanımlık betikler

| # | Ne | Git | Sebep |
| :---: | :--- | :---: | :--- |
| ✅ | `scripts/glm_bridge.js` | **takipli** | Yukarıdaki kırmızı kutu: gömülü z.ai anahtarı. Uygulamayla ilgisiz (IDE köprüsü). |
| ✅ | `scripts/mcp-servers/glm_server.js` | **takipli** | Aynı. |
| ✅ | `inspect_firestore.js` | **takipli** | Tek seferlik Firestore inceleme betiği; Firebase Web API anahtarı gömülü (bu anahtar tasarımca istemcide açıktır, ama A1b'de kısıtlanması bekleniyor). `./mobile/node_modules/…` yoluna göre yazılmış, kökten çalıştırılmak için — kırılgan. |

### E. Kalıntılar

| # | Ne | Boyut | Git | Sebep |
| :---: | :--- | ---: | :---: | :--- |
| ✅ | `stitch_instruction_based_theme_builder (1).zip` | 418 KB | takipsiz | Yanındaki açılmış klasörün **aynısı**. Tarayıcı indirmesi. |
| ✅ | `desktop.ini` | 115 B | takipsiz | Windows Gezgini meta dosyası. `.gitignore`a `desktop.ini` eklenmeli (Thumbs.db var, bu yok). |
| ✅ | `short-node-modules/` | 116 KB | takipsiz | Windows uzun-yol sorununa karşı eski bir kısayol/junction kalıntısı. `metro.config.js`, `babel.config.js`, gradle dosyaları, `tsconfig` — hiçbiri referans vermiyor. |
| ✅ | `mobile/dist/`, `mobile/tasks/` | 0 | — | Boş klasörler. |
| ✅ | `mobile/android/app/build/` | **1,5 GB** | yoksayılan | Gradle çıktısı. Silmek güvenli; `npm run build:release` yeniden üretir. |

> `mobile/android/.gradle/` (109 MB) **bilerek işaretli değil**: derleme
> önbelleği, silinirse sonraki derleme dakikalar daha uzun sürer.

---

## 🟡 UYGULAMAYLA İLGİSİ YOK — AMA PROJEYLE VAR, KARAR SENİN

Bunlar kod değil, ama ürünün etrafındaki iş: pazarlama, strateji, tasarım
promptları, geliştirme günlüğü. Silinmemeli; **yerleri yanlış**. Önerim:
kökten `docs/` altına toplamak. Kök dizinde 11 tane `.md` olması, ilk açan
kişiyi hangisinin önemli olduğunu anlayamaz hâle getiriyor.

| Ne | Ne olduğu | Önerilen yer |
| :--- | :--- | :--- |
| `rakip-analizi.md`, `dunya-turkiye-rakip-analizi-2025.md`, `Apify analiz.md` (docs/) | Pazar analizi | `docs/strateji/` |
| `ozellikekle.md`, `yeniozellik.md` | Özellik fikirleri | `docs/plans/` (zaten var) |
| `GOOGLE_STITCH_THEME_PROMPT.md`, `stitch_instruction_based_theme_builder/` (13 takipli) | Tasarım aracı promptları | `docs/design/` |
| `playstore yükleme talimatı.txt` | Yayın notu | `docs/store/` (zaten var) — ve dosya adındaki boşluk/Türkçe karakter kaldırılmalı |
| `tasks/` (`lessons.md`, `todo.md`, 3 sprint planı) | Geliştirme günlüğü | `docs/archive/` ya da `docs/plans/` |
| `mobile/docs/` (sprint-10…20 review, `apk-build-report.md`) | Sprint incelemeleri | `docs/archive/` — iki ayrı `docs` klasörü olması kafa karıştırıcı |
| `icon/mipmap-*/ic_launcher.png` (5 takipli) | Uygulama ikonu kaynakları | Kalsın ama `mobile/assets/` altında olmalı; kökte ikon klasörü beklenmez |
| `docs/` altındaki strateji/ASO/UGC/Apify belgeleri | Ürün-pazarlama | Kalsın, alt klasörlere ayrılsın |

**Kalması doğru, yeri de doğru:** `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`
(ajan çalışma kuralları), `ARCHITECTURE.md`, `CHANGELOG.md`, `README.md`,
`LICENSE`, `firebase.json`, `firestore.rules`, `.maestro/`, `.github/`,
`docs/archive/`, `docs/legal/`, `docs/security/`.

---

## 📐 Silme SONRASI kök dizin nasıl görünür

```
ila_v8_agy_cmd/
├── .github/  .maestro/
├── AGENTS.md  CLAUDE.md  GEMINI.md
├── ARCHITECTURE.md  CHANGELOG.md  README.md  LICENSE
├── firebase.json  firestore.rules
├── docs/        ← tüm belgeler burada
├── mobile/      ← uygulama
├── server/      ← Cloud Functions
└── scripts/     ← (boş kalırsa o da silinir)
```

Kökteki dosya sayısı **~310 → ~12**.

---

## ⚠️ Silmeden önce iki not

1. **Git'teki dosyalar için** `git rm` gerekir, sadece dosyayı silmek yetmez;
   yoksa `git status` 400 satır "deleted" gösterir. Takipli olanların hepsini
   tek commit'te kaldırmak doğru: *"chore: test kalıntıları, yabancı proje ve
   gömülü anahtar taşıyan betikler repodan çıkarıldı"*.
2. **Git geçmişi temizlenmez.** `xiaomi_log.txt` (137 MB) ve z.ai anahtarları
   geçmişte kalır; klon boyutu düşmez. Geçmişi yeniden yazmak (`git filter-repo`)
   geri alınamaz bir işlem — kalıcı yetkinin dışında, **ayrıca sorarım**.
   Anahtarlar için asıl çözüm zaten iptal; geçmiş temizliği ikincil.

---

## Bu turda YAPMADIĞIM şeyler

- Hiçbir dosya silinmedi, taşınmadı, `git rm` edilmedi.
- `node_modules/` ve `.git/` içine bakılmadı.
- `web/node_modules` boyutu ölçülmedi (bağlı klasör üzerinden `du` zaman
  aşımına düştü); silindiğinde muhtemelen +200–400 MB daha kazanılır.

---

## ✔ UYGULANDI — 5 Eylül 2026, 23:50

**✅ bölümü:** tüm maddeler `_to_delete/` altına taşındı ve repodan `git rm`
edildi (commit `14188bb`). Kalıcı silme yetkisi bana verilmediği için silme
işlemini kullanıcı yaptı; `_to_delete/` artık yok.

**🟡 bölümü (taşıma):**

| Eski yer | Yeni yer |
| :--- | :--- |
| `rakip-analizi.md`, `dunya-turkiye-rakip-analizi-2025.md`, `docs/Apify analiz.md` | `docs/strateji/` (büyük harf, boşluksuz adlar) |
| `docs/ASO_*`, `docs/BUYUME_*`, `docs/PAZAR_*`, `docs/UGC_*` | `docs/strateji/` |
| `ozellikekle.md`, `yeniozellik.md` | `docs/plans/ozellik-fikirleri-1.md`, `-2.md` |
| `GOOGLE_STITCH_THEME_PROMPT.md`, `stitch_instruction_based_theme_builder/` | `docs/design/` |
| `playstore yükleme talimatı.txt` | `docs/store/PLAYSTORE_YUKLEME_TALIMATI.txt` |
| `tasks/` | `docs/tasks/` (`CLAUDE.md` bağlantıları güncellendi) |
| `mobile/docs/` (54 sprint incelemesi) | `docs/archive/sprint-reviews/` |
| `icon/mipmap-*` | `mobile/assets/icon-source/` |

> Not: `stitch_instruction_based_theme_builder/` klasörü taşıma sırasında
> diskten kaybolmuş bulundu (muhtemelen `_to_delete/` ile birlikte silindi —
> raporda yalnızca `.zip` kopyası silinmeye işaretliydi). Git'ten 13 dosya
> geri alınıp doğrudan `docs/design/` altına yerleştirildi; içerik kaybı yok.

> `icon/` ve `mobile/docs/` klasörleri **boş** kaldı; bağlı klasör üzerinden
> boş klasör silinemiyor. Gezgin'de silinebilir, git için önemi yok.

Kök dizin: `AGENTS.md CLAUDE.md GEMINI.md ARCHITECTURE.md CHANGELOG.md README.md
LICENSE firebase.json firestore.rules docs/ mobile/ server/` — 12 girdi.
