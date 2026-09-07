# 🚨 Üç Klinik Denetim Bulgusunun Onarımı — Boot ANR Marjı, Doğum Tarihi Kayması, Etkileşim False-Negative'i

> **Kayıt türü:** Denetim kaynaklı klinik güvenlik düzeltmeleri — **sürümsüz** (`[Unreleased]`)
> **Tarih & Saat:** 2026-09-08 01:39
> **Modül / Alan:** Android Boot Yolu · Çark Tarih Seçici (Acil Tıbbi Kimlik) · İlaç Etkileşim Motoru
> **Hakem:** Qwen 3.8 Max (Baş Mimar & Baş Denetçi)
> **Denetim bulguları:** YENİ-3 (HIGH), YENİ-2 (HIGH), Y3 (HIGH) — `IlacHatirlatici_v2.4.0_Rapor_Yeniden_Dogrulama_2026-09-07.md`
> **Durum:** ✅ Kod + test tamam. ⚠️ Kotlin **derlenmedi**, APK yok, cihaz doğrulaması yok, sürüm yükseltilmedi.

---

## 0. Özet

| Bulgu | Kusur | Çözüm | Test | Mutasyon provası |
|---|---|---|---|---|
| **YENİ-3** | Boot yolunda shortService süre marjı **sıfır** → ANR | Görev bütçesi 180 s → **120 s**; RN'den bağımsız **emniyet supabı** (150 s); tek idempotent `shutdown()` | 11 | ✅ 3 test kırıldı |
| **YENİ-2** | Çark tarih seçici doğum tarihini **3 gün** kaydırıyor | `dispatch(reset)` yerine hesaplanan aksiyonun kendisi | 4 | ✅ 1 test kırıldı |
| **Y3** | RxNav ağ hatası "etkileşim yok" sayılıp fallback atlanıyor | `ApiInteractionCheckResult.ok` bayrağı + `response.ok` kontrolü | 7 | ✅ 2 test kırıldı |

Üçü de "uygulama çalışıyor" görünürken hastayı etkileyen sınıf hatalardı ve üçü de **test edilmiyordu**.

---

## 1. ⚠️ YENİ-3 — Denetim teşhisi YANLIŞTI, gerçek kusur farklıydı

### 1.1 Çürütülen iddia

Yeniden doğrulama raporu bu bulguyu şöyle teşhis etmişti:

> *"`FOREGROUND_SERVICE_SHORT_SERVICE` is not declared while `foregroundServiceType="shortService"` is used at targetSdk 36... `startForeground()` is expected to throw `SecurityException`."*

**Resmî Android 14 dokümanı bunu çürütüyor** (`developer.android.com/about/versions/14/changes/fgs-types-required`, bu oturumda çekildi):

> `shortService` için manifest'te bildirilecek izin: **None**. Alt-tip izni gerekmiyor; temel `FOREGROUND_SERVICE` yeterli.

Temel izin ise `mobile/android/app/src/main/AndroidManifest.xml:7`'de **zaten mevcut**:

```xml
<uses-permission android:name="android.permission.FOREGROUND_SERVICE"/>
```

Dolayısıyla **eksik izin yok** ve `SecurityException` senaryosu **geçersiz**. Raporda önerilen "düzeltme" (izni ekle) uygulansaydı gereksiz bir izin eklenmiş ve gerçek kusur açık kalmış olacaktı.

> **Ders:** denetim ajanının çıktısı kanıt değil iddiadır. Bu bulgu, birleşik release manifest'i okunarak "doğrulanmış" görünüyordu — ama manifest'te iznin *yokluğu* doğru tespit edilmişti, *zorunlu olduğu* varsayımı yanlıştı. Doğrulama, gözlemi değil **öncülü** de sınamalı.

### 1.2 Dokümanın ortaya çıkardığı gerçek kusur

Aynı doküman `shortService` sözleşmesinin süre tarafını netleştiriyor:

- 3 dakikalık saat **`Service.startForeground()` çağrısından** itibaren işler — yani buradaki `onCreate`'ten.
- Süre aşılırsa sistem **`Service.onTimeout()`** çağırır.
- Servis `stopSelf()`/`stopForeground()` ile durdurulMAZsa uygulama **cached** duruma düşer ve ardından **ANR** tetiklenir — *uygulamanın başka geçerli foreground servisi olsa bile*.

Kod bu sözleşmeye karşı incelendiğinde üç kusur ortaya çıktı:

| Kusur | Kanıt (eski hâl) |
|---|---|
| Görev bütçesi tavanna **tam eşit** | `getTaskConfig` → `180000` ms |
| Görev saati tavandan **daha geç** başlıyor | tavan `onCreate`'teki `startForeground`'dan, görev bütçesi görev başlamasından itibaren → tavan **her zaman** önce dolar |
| `onTimeout()` override'ı **yok** | `BootTaskService.kt`'de böyle bir metot yoktu → sistem durdurma fırsatı verdiğinde kimse yakalamıyor |

**Klinik etki:** bu servis reboot / saat dilimi değişikliği / `MY_PACKAGE_REPLACED` sonrası alarmları yeniden kaydeden **tek JS yolu**. Burada bir ANR veya erken ölüm, hastanın erteleme ve ertesi-gün alarm sürekliliğinin sessizce kaybolması demek. (Native DE re-arm bu servisten **önce** çalıştığı için aynalanmış alarmlar çalmaya devam eder — bu, etkinin kısmi azaltıcısı.)

### 1.3 Uygulanan çözüm

```kotlin
private const val SHORT_SERVICE_LIMIT_MS = 180_000L   // Android sözleşmesi (belgeleyici)
private const val TASK_TIMEOUT_MS        = 120_000    // eski: 180_000  → 60 s marj
private const val HARD_STOP_MS           = 150_000L   // emniyet supabı
```

- **Görev bütçesi 120 s.** 180 s tavanına karşı 60 s marj. Görev pratikte saniyeler sürüyor (saklı alarmları yeniden kaydediyor), yani 120 s hâlâ çok cömert.
- **Emniyet supabı.** `onCreate`'te `mainHandler.postDelayed(hardStopRunnable, HARD_STOP_MS)`. Görev kendi bütçesinde bitmezse servisi **tavandan önce** durdurur.
- **Tek idempotent kapanış.** `shutdown(reason)` — `@Volatile isShutDown` bayrağı ile korunuyor; hem `onHeadlessJsTaskFinish` (normal bitiş) hem `hardStopRunnable` buradan geçiyor. Yarışsalar bile çift `stopSelf` olamaz ve foreground bildirimi sızamaz.
- **`onDestroy`'da `removeCallbacks`** — aksi halde servis öldükten sonra tetiklenen bir Runnable main looper'da sızardı.

### 1.4 `onTimeout()` override'ı neden BİLİNÇLİ olarak eklenmedi

Bu, daha "doğru" görünen çözüm ama reddedildi:

- `Service.onTimeout(int, int)` **API 34**'te eklendi. Override'ı derlemek `androidx.annotation.RequiresApi` veya bir lint bastırması gerektirir.
- Bu projede **hiçbir Kotlin dosyası** `androidx.annotation` kullanmıyor (grep: `@RequiresApi|@TargetApi|@SuppressLint|androidx.annotation` → 0 eşleşme). Yeni bir bağımlılık kalıbı açmak, üstelik doğrulanamadan, göze alınan riske değmezdi.
- **Derleme doğrulaması yapılamıyor:** bu makinede Java 1.8 var, Gradle/Android derlemesi çalıştırılmadı. Boot yolunda — yani en kritik yolda — körlemesine API-34 kodu eklemek, çözdüğü sorundan büyük bir risk.
- Emniyet supabı **tüm API seviyelerinde** çalışıyor (24+) ve RN'in görev-zaman-aşımı yolunun `onHeadlessJsTaskFinish`'i çağırıp çağırmadığından **bağımsız** — oysa `onTimeout` yalnızca 34+ için anlamlı.

Karar ve gerekçesi `BootTaskService.kt` içinde yorum olarak belgelendi.

---

## 2. 🚨 YENİ-2 — Çark tarih seçici doğum tarihini sessizce kaydırıyordu

### 2.1 Kusur

`components/common/wheel/WheelDatePicker.tsx` `handleSelect`:

```ts
} else if (id === 'month') {
  nextState = reducer(currentState, { type: 'setMonth', month: index + 1 });  // lastExplicitDay KORUNUR
}
dispatch({ type: 'reset', parts: nextState.parts });                          // ← setMonth DEĞİL, reset!
```

`domain/wheelDateModel.ts`:

```ts
case 'setMonth': {
  const day = resolveDay(state.parts.year, month, state.lastExplicitDay);
  return { parts: { ...state.parts, month, day }, lastExplicitDay: state.lastExplicitDay };  // :185 KORUR
}
case 'reset': {
  const day = resolveDay(action.parts.year, action.parts.month, action.parts.day);
  return { parts: { ...action.parts, day }, lastExplicitDay: action.parts.day };             // :224 KIRPILMIŞ günü yazar
}
```

Bileşen doğru aksiyonu **hesaplıyor** ama sonucu `reset` üzerinden uyguladığı için koruma **her sütun kaydırmasında** çöpe gidiyordu.

### 2.2 Yeniden üretim

| Adım | Durum |
|---|---|
| Başlangıç | **31 Ocak 1975** (`lastExplicitDay = 31`) |
| Ayı Şubat yap | gün 28'e kırpılır (doğru — 1975 artık yıl değil) **ve** `lastExplicitDay` 28'e yazılır |
| Ayı geri Ocak yap | `resolveDay(1975, 1, 28)` = **28** |
| Kaydedilen | **1975-01-28 — üç gün yanlış, uyarısız** |

### 2.3 Klinik etki

Bu alan **acil tıbbi kimlikteki doğum tarihi**. Yaş, `MedicalIdModal.tsx:32-43` `calculateAge` üzerinden yaş rozetini ve yaş-bazlı klinik mantığı besliyor. Sessiz bir üç günlük kayma, buzdağının görünen kısmı: aynı mekanizma herhangi bir ay/yıl kaydırmasında açık günü düşürüyor.

### 2.4 Çözüm

```ts
const action: WheelDateAction =
  id === 'day'   ? { type: 'setDay',   day: index + 1 }
  : id === 'month' ? { type: 'setMonth', month: index + 1 }
                   : { type: 'setYear',  year: resolvedRange.min.year + index };

const nextState = reducer(currentState, action);
dispatch(action);                       // ← reset değil, aksiyonun kendisi
onChange(partsToIso(nextState.parts), nextState.parts);
```

`onChange` davranışı değişmedi (hâlâ hesaplanmış `nextState` üzerinden bildiriyor); yalnızca store'a giden aksiyon düzeltildi.

### 2.5 Test yazarken karşılaşılan engel (ve çözümü)

İlk denemede `getByText('Şub')` **"Unable to find an element"** verdi. Varsayım yapmak yerine geçici bir tanı dosyasıyla ağaç döküldü:

```
TOPLAM_METIN=160
ILK_40=["1","2",...,"31","Oca","Şub","Mar",...]
SUB_VAR_MI=true
```

Yani öğeler **render oluyor**, ama RNTL sorguları onları **görmüyor**. Sebep: `WheelItem`, v2.1.0'ın *"sütun başına tek `accessibilityRole="adjustable"` düğümü"* TalkBack kuralı gereği

```
accessibilityElementsHidden
importantForAccessibility="no-hide-descendants"
```

taşıyor ve RNTL a11y ağacından gizlenmiş öğeleri eler. **Çözüm:** `root.findAll` ile ham ağaçtan inmek. Gerekçe testin içine yorum olarak yazıldı — bir sonraki kişi aynı tuzağa düşmesin.

(Tanı dosyası `_diag_wheel.test.ts` işini bitirince **silindi**.)

---

## 3. 🚨 Y3 — RxNav ağ hatası "etkileşim yok" sayılıyordu

### 3.1 Kusur

`services/drugInteraction.ts`:

```ts
// eski
apiSuccess = true; // API başarılı çalıştı (sonuç boş dönse bile)
```

ve

```ts
} catch (error) {
  log.error('API etkilesim kontrolu hatasi', error);
  return { hasInteractions: false, interactions: [], checkedAt: ... };   // ← hata sinyali YOK
}
```

Fallback kapısı:

```ts
if (!apiSuccess || rxcuis.length < drugNames.length) { /* yerel DB */ }
```

Tüm ilaçlar RxCUI'ye çevrilmişse (`rxcuis.length === drugNames.length`) ve API **ağ hatası** verdiyse, `apiSuccess` yine `true` olduğu için **yerel veritabanı hiç sorgulanmıyordu**.

**Klinik etki:** çevrimdışı veya kötü ağda kullanıcı "etkileşim bulunamadı" görüyordu — `KNOWN_INTERACTIONS`'ta kayıtlı **aspirin + varfarin (severity: high)** çifti için bile. Klinik güvenlik ekranının en tehlikeli sessiz başarısızlık modu.

### 3.2 Ek kusur: `response.ok` hiç kontrol edilmiyordu

```ts
const response = await fetch(url);
const data = await response.json();     // ← HTTP durumu hiç sorgulanmıyor
```

Yani **500 / 429 / bir HTML hata sayfası** da:
- ya `response.json()`'ı fırlatıp catch'e düşüyor (yine sessiz `hasInteractions:false`),
- ya da `data.fullInteractionTypeGroup` tanımsız kaldığı için boş liste üretiyordu.

Her iki yol da çağıran tarafa "API başarılı, etkileşim yok" gibi görünüyordu.

### 3.3 Çözüm

Yeni tip — semantik ayrımı tipe kazıyor:

```ts
export interface ApiInteractionCheckResult extends InteractionCheckResult {
  ok: boolean;   // false → "API'ye ulaşılamadı"; hasInteractions:false → "gerçekten etkileşim yok"
}
```

- HTTP hata durumu → `ok: false` + `log.warn`
- catch → `ok: false`
- başarılı yanıt (boş olsa bile) → `ok: true`
- çağıran: `apiSuccess = apiResult.ok`

### 3.4 Kapsama boşluğu da kapatıldı

Etkileşim servisinin **CI kapsaması sıfırdı**: ana paket `__tests__/services/drugInteraction.test.ts` `describe.skip` ile atlanmış (eski senkron imzayı bekliyor) **ve** `tsconfig.json:49-50`'den hariç tutulmuş. Yeni `drugInteraction.fallback.test.ts` bu boşluğu dolduruyor.

> Ana paket hâlâ `describe.skip` — migrate etmek ayrı bir iş kalemi olarak açık.

### 3.5 Testin kurduğu ayırt edici düzenek

Regresyon testi **RxCUI lookup'un başarılı, etkileşim çağrısının başarısız** olduğu durumu kurmak zorunda; aksi halde eski kod da fallback'e düşerdi ve test hiçbir şey kanıtlamazdı:

```ts
if (url.includes('/REST/rxcui.json'))            → ok, her ilaca FARKLI cui
if (url.includes('/REST/interaction/list.json')) → throw
```

Farklı cui'ler **şart**: aynı cui verilirse duplicate-therapy kalkanı tetiklenir ve test yanlış sebepten geçerdi.

Ayrıca **ters yönde** bir assert var: API başarılı ve boş döndüğünde yerel DB **çalıştırılmamalı**. Bu, düzeltmenin "her zaman fallback"e kaçmadığını da kilitliyor (yerel DB'deki kaba `includes` eşleştirmesi false-positive üretiyor).

---

## 4. Testler ve mutasyon provaları

Projenin kendi v1.8.8 pratiği uygulandı (*"Testin ISIRDIGI kanitlandi: ... gecici olarak ... yapildi -> 1 test kirildi, geri alindi"*). Her üç kapı için kusur geçici olarak geri kondu, kırılma sayıldı, sonra geri alındı.

| Kapı | Dosya | Test | Mutasyon | Kırılan |
|---|---|---|---|---|
| YENİ-3 | `__tests__/android/bootTaskService.contract.test.ts` (yeni) | **11** | `TASK_TIMEOUT_MS` → `180_000` | **3** (öngörüldüğü gibi) |
| YENİ-2 | `__tests__/components/common/WheelDatePicker.test.tsx` | **+4** (toplam 8) | `dispatch(action)` → `dispatch({type:'reset'})` | **1** |
| Y3 | `__tests__/services/drugInteraction.fallback.test.ts` (yeni) | **7** | `apiResult.ok` → `true` | **2** |

### 4.1 YENİ-2'de neden yalnızca 1 test kırıldı — ve bu neden değerli

Dört testten yalnızca **round-trip** testi (31 Oca → Şub → Oca) kırıldı. Diğer üçü tek yönlü değişiklik olduğu için kusurlu kodda da geçiyor:

- `1980-02-29 → Oca`: `reset` `lastExplicitDay`'i 29 yazıyor, sonra değişiklik yok → 29 kalır.
- `1975-02-28 → Oca`: aynı, 28 kalır.
- `1975-12-31 → 1976`: `reset` 31 yazıyor, sonra değişiklik yok → 31 kalır.

Bu bir zayıflık değil, **kusurun doğasının kanıtı**: hata yalnızca *ikinci* bir sütun kaydırmasında ortaya çıkıyor, yani tek hamlelik testler onu asla yakalayamaz. `wheelDateModel.test.ts`'in 20 senaryosunun kusuru kaçırmasının nedeni de tam olarak bu — hepsi tek aksiyon dispatch ediyor.

Üçüncü test ayrıca korumanın **"sihirli 31"** değil **gerçek kullanıcı seçimi** olduğunu kanıtlıyor: kullanıcı 31'i hiç açıkça seçmediyse (`1975-02-28` girişi), Ocak'a geçince 28 kalmalı — 31'e zıplamamalı.

### 4.2 Y3'te neden 2 test kırıldı

`ok` bayrağı birim testleri (4 adet) **geçti** — çünkü mutasyon bayrağın kendisini değil, **çağıranın onu tüketimini** değiştirdi. Yalnızca iki `checkMultipleInteractions` testi kırıldı. Bu tam olarak beklenen ayrım ve testlerin doğru katmanı kilitlediğini gösteriyor.

### 4.3 Kotlin kapısının dürüst sınırı

`bootTaskService.contract.test.ts` **derleme veya çalışma anı davranışı kanıtlamaz.** Kotlin jest ile çalıştırılamıyor (Gradle + cihaz/emülatör gerekir; bu makinede Java 1.8 var, Android emülatörü Java 11+ ister). Kapının yaptığı:

- sayısal invariantları kilitlemek: `taskTimeout < hardStop < shortServiceLimit`, marj ≥ 30 s
- emniyet supabının gerçekten zamanlandığını (`postDelayed`) ve `onDestroy`'da geri alındığını doğrulamak
- tek idempotent `shutdown()` yolunu ve her iki çağıranı doğrulamak
- birinin ham `180000` literali yazıp invariantı **bypass etmesini** engellemek
- manifest tarafında `shortService` + temel `FOREGROUND_SERVICE` + `exported="false"` üçlüsünü kilitlemek

Bu son madde ayrıca **yanlış teşhisin tekrar gündeme gelmesini engelliyor**: testin içine, `shortService` için alt-tip izni gerekmediğini belirten resmî doküman atfı yazıldı.

Sınırlar dosyanın başlığında açıkça belgelendi. Gerçek doğrulama için cihazda `adb shell am broadcast -a android.intent.action.BOOT_COMPLETED` + logcat gerekiyor.

---

## 5. Doğrulama

| Kontrol | Komut | Sonuç |
|---|---|---|
| Tip güvenliği | `npm run typecheck` | ✅ exit 0 |
| Lint (proje geneli) | `npx eslint src/ --quiet` | ✅ **0 error** (çıktı boş) |
| YENİ-3 kapısı | `npx jest src/__tests__/android/bootTaskService.contract.test.ts` | ✅ **11/11** |
| YENİ-2 | `npx jest src/__tests__/components/common/WheelDatePicker.test.tsx` | ✅ **8/8** |
| Y3 | `npx jest src/__tests__/services/drugInteraction.fallback.test.ts` | ✅ **7/7** |
| Tam paket | `npx jest --ci` | ✅ **223 suite / 2328 test**, 0 FAIL, 62.2s |
| Kotlin yapı denetimi | import + sınıf kapsamı | ✅ `Handler`/`Looper` eklendi, `class` 28 → 210 |

Test sayısı 2306 → **2328** (+22), suite 221 → **223** (+2).

**⚠️ YAPILAMAYAN:** Kotlin derlemesi (`./gradlew` çalıştırılmadı), APK üretimi, cihazda `BOOT_COMPLETED` senaryosu.

---

## 6. Değişen dosyalar

```
 M mobile/android/.../BootTaskService.kt                          (+103)  süre marjı + emniyet supabı + shutdown
 M mobile/src/components/common/wheel/WheelDatePicker.tsx          (+37)  dispatch(action)
 M mobile/src/services/drugInteraction.ts                          (+52)  ok bayrağı + response.ok
 M mobile/src/__tests__/components/common/WheelDatePicker.test.tsx (+120) 4 gün-koruma testi
?? mobile/src/__tests__/android/bootTaskService.contract.test.ts           11 test (yeni)
?? mobile/src/__tests__/services/drugInteraction.fallback.test.ts          7 test (yeni)
```

---

## 7. Neden sürümsüz

`versionName`/`versionCode` **2.4.0 / 82** bırakıldı:

- APK derlenmedi, cihaza kurulmadı.
- Kotlin değişikliği **derlenmedi** bile — yalnızca kaynak düzeyinde doğrulandı.
- YENİ-2'nin cihazda davranışsal kanıtı (gerçek kaydırma ile 31 Oca → Şub → Oca) yok.

Bu üç düzeltme klinik davranış değiştiriyor; yayınlanmadan önce **cihazda** doğrulanmaları gerekiyor. Keep a Changelog gereği commit'lenmiş-yayınlanmamış işin doğru yeri `[Unreleased]`.

---

## 8. Açık kalan ilgili maddeler

| # | Madde | Not |
|---|---|---|
| **YENİ-2b** | `WheelDatePickerModal.tsx:53-60` yaş rozeti **donmuş liter tarihle** hesaplanıyor (`{ year: 2026, month: 9, day: 6 }`) | Rozet şimdiden bir gün bayat ve sonsuza dek bozulacak; parse edilemeyen girdi için sessizce `2000-01-01` koyup "26 Yaşında" diyor |
| **YENİ-2c** | `WheelDatePicker.tsx:43` `fallbackMax = { year: 2026, month: 12, day: 31 }` | `range.max` yoksa **gelecekte** doğum tarihi seçilebilir; `validateParts`/`FUTURE_DATE` var ama **hiçbir bileşen çağırmıyor** |
| **YENİ-2d** | `MedicalIdModal.tsx:103-106, :118-133` kayıt yolunda doğrulama yok | Bozuk bir `medicalId.birthDate` yüklenirse çark `1980-01-01` gösterirken `draftIso` çöpü tutuyor → OK'a basmak UI'ın hiç göstermediği değeri kaydediyor |
| **O19** | `checkInteractionLocal('','')` ilk etkileşimi döndürüyor; `drugInteractionLocal.test.ts:19` `it.skip` | Kusur düzeltilmek yerine testte atlanmış |
| **L3** | `drugInteraction.test.ts` hâlâ `describe.skip` | Etkileşim servisinin ana paketi CI'da yok |
| **YENİ-6** | `canUseFullScreenIntent()` native hata durumunda **`true`** dönüyor (fail-open) | Android 14+'ta izni geri alınmış cihaz "sağlıklı" raporlanıyor, kullanıcıya hiç sorulmuyor |
| **O5 / O6** | Tam-ekran alarm kapalıyken `setAlarmClock` + DE aynası hiç kurulmuyor; alarm sürekliliği tek-atışlı ve watchdog'suz | YENİ-3 boot yolunu korudu ama bu iki madde alarm güvenilirliğinin kalan en büyük açıkları |

---

*Bu kayıt, 2026-09-07 tarihli yeniden doğrulama raporunun YENİ-3, YENİ-2 ve Y3 bulgularına verilen yanıttır. YENİ-3'te denetimin kendi teşhisi çürütülmüş ve düzeltilmiştir (§1.1).*
