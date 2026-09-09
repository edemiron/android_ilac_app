# 🚨 Auto-Snooze Sessiz Doz Kaybı — v2.0.1 Klinik Regresyonunun Onarımı

> **Kayıt türü:** Denetim kaynaklı klinik güvenlik düzeltmesi — **sürümsüz** (`[Unreleased]`)
> **Tarih & Saat:** 2026-09-08 00:40
> **Modül / Alan:** Alarm Ekranı · Doz Kaydı · Hasta-Bakıcı Bildirimi · Klinik Uyum Raporu
> **Hakem:** Qwen 3.8 Max (Baş Mimar & Baş Denetçi)
> **Denetim bulgusu:** YENİ-1 (CRITICAL) — `IlacHatirlatici_v2.4.0_Rapor_Yeniden_Dogrulama_2026-09-07.md`
> **Durum:** ✅ Kod + test tamam. ⚠️ APK derlenmedi, cihaza kurulmadı, sürüm yükseltilmedi.

---

## 1. Kusur

v2.0.1 *"Klinik Güvenlik & Pil Koruma Kalkanı — Auto-Snooze (3 Dakika)"* başlığıyla `useAlarmController.ts`'e bir zamanlayıcı ekledi. Erteleme hakları tükenmişken kullanıcı 3 dakika boyunca yanıt vermezse:

```ts
} else {
  stopAlarmAudio();
  void withTimeout(clearAlarmNotifications(), 'autoSnooze.clearAlarmNotifications', 2500);
  dismissAlarm();
}
```

Ses durduruluyor, bildirimler temizleniyor, ekran kapatılıyor — **hiçbir doz kaydı yazılmadan.**

### Sonuç: sessiz kaçırılan doz

| Katman | Durum |
|---|---|
| Yerel `medicineLogs` | ❌ kayıt yok |
| Bulut (Firestore) | ❌ kayıt yok |
| Bakıcı bildirimi | ❌ uyarı yok |
| Uyum raporu / PDF hekim raporu | ❌ doz hiç yaşanmamış gibi |

### Neden sonradan da onarılamıyordu

`utils/missedReminders.ts` `markMissedReminders` iki kısıtla çalışıyor:

- `:36` `const today = format(now, 'yyyy-MM-dd')` ve `:47` `log.scheduledTime.startsWith(today)` → **yalnızca BUGÜNÜN** slotları
- `DEFAULT_GRACE_PERIOD_MINUTES = 60` → planlanan saatten 60 dk geçmeden `missed` yazmıyor

Yani uygulama aynı gün bir daha açılmazsa o doz **hiçbir zaman** `missed` durumuna geçmiyor. Bakıcı hiç haberdar olmuyor. Bu, uygulamanın var olma amacının tam tersi.

### İhlal edilen belgelenmiş invariant

Aynı dosyada 85 satır yukarıda, v1.7.7'de "SESSIZ ATLAMA KALDIRILDI" başlığıyla yazılmış karar:

> *"Erteleme hakki bitince yapilacak dogru is: hicbir sey yazmamak, **alarmi acik tutmak** ve kullaniciyi 'Aldim' / 'Atla' arasinda secim yapmaya birakmak."*

`handleSnooze` bu kurala uyuyordu (`!canSnooze` iken erken dönüyor). Auto-snooze'un `else` dalı **tam tersini** yapıyordu — ve v1.7.7'nin kaldırdığı hatadan **daha kötüydü**: o en azından `skipped` yazıyordu, bu hiçbir iz bırakmıyordu.

### Neden yakalanmadı

Efekt `if (isTestMode) return` ile korunuyor. Yani **bu klinik yol tamamen test dışıydı.** Ayrıca deps `[canSnooze, isTestMode]` iken gövde `dismissAlarm`, `handleSnooze`, `stopAlarmAudio` kapatıyordu → zamanlayıcı **bayat closure** çalıştırıyordu.

---

## 2. Çözümün tasarım kararı: `missed` mi, alarmı açık bırakmak mı?

İki invariant çatışıyordu:

- **v1.7.7:** otomatik yolla klinik karar yazma; alarmı açık tut, kullanıcı seçsin.
- **v2.0.1:** alarm sonsuza dek çalıp pili bitirmesin.

Seçenek (a) — v1.7.7'ye dönüş — pil kaygısını geri getiriyordu. Seçenek (b) — kaydet ve kapat — **kritik bir ayrımla** ikisini birden karşılıyor:

> **`skipped` hastanın verdiği KLİNİK BİR KARARDIR.** Doktora giden uyum raporuna yazılır ve v1.7.7 gereği **yalnızca kullanıcı açıkça seçerse** yazılmalıdır.
>
> **`missed` bir KARAR DEĞİL, BİR SONUÇTUR:** "hasta bu dozu yanıtlamadı."

Bu ayrım çözümü meşru kılıyor, çünkü **otomatik `missed` bu kod tabanında zaten yerleşik ve onaylanmış bir desen**: `medicineStore.markMissedReminders()` uygulama açılışında ve ana ekran mount'unda kullanıcıdan hiçbir girdi almadan `missed` logları üretiyor, buluta yazıyor ve bakıcıya `'missed'` bildirimi gönderiyor.

Dolayısıyla yeni davranış:

| Kaygı | Karşılanıyor mu |
|---|---|
| Sahte klinik karar üretilmesin (v1.7.7) | ✅ `skipped` **çağrılmıyor**, `missed` yazılıyor |
| Doz kayıtsız kaybolmasın | ✅ yerel + bulut kaydı |
| Bakıcı karanlıkta kalmasın | ✅ `notifyCaregiversAboutMedicineStatus(..., 'missed')` |
| Pil tükenmesin (v2.0.1) | ✅ 3 dk sonra alarm kapanıyor |

---

## 3. Uygulama

### 3.1 Yeni store aksiyonu: `logMedicineMissed`

`stores/medicineStore.ts` — mevcut `logMedicineSkipped`'ın yan-etki sırasını birebir izliyor:

1. **Idempotency / karar koruma guard'ı** (aşağıda)
2. `resolveMedicineLogArgs` → `_createMedicineLog('missed', ...)`
3. Bakıcı bildirimi (`'missed'` — `markMissedReminders` ile aynı semantik)
4. `_cleanupNotifications` (bildirim + kesişen ertelemeler)
5. `normalizeMedicineLogsBySlot` + `deactivateSnoozesIntersectingWith` ile `set`
6. `saveMedicineLogToCloud`
7. Android widget güncellemesi

**Guard — en kritik kısım:**

```ts
const missedSlotKey = buildMedicineLogSlotKey(reminderTimeId, scheduledTime);
const existingForSlot = medicineLogs.find(
  entry => buildMedicineLogSlotKey(entry.reminderTimeId, entry.scheduledTime) === missedSlotKey
);
if (existingForSlot) { return; }
```

Slot için **herhangi bir** kayıt varsa hiçbir şey yazılmıyor. İki ayrı tehlikeyi kapatıyor:

1. `taken`/`skipped` zaten varsa hastanın kararının **üzerine** yazmak, uyum raporunda "aldım" denmiş dozu "kaçırdı" gösterirdi. Kullanıcı zamanlayıcı tetiklenmeden bir an önce "Aldım"a bastıysa tam olarak bu olurdu.
2. `missed` zaten varsa yan etkiler (bulut yazması + bakıcı push) gereksiz tekrarlardı — `logMedicineTaken`'ın v1.7.6'da onardığı "20+ kez açılan tam ekran alarm" sınıfı hata.

### 3.2 Hook: latest-ref deseni

**Tuzak:** `handleSnooze` (`:684`) `useCallback` **değil**, düz `async () => {}` → her render yeni kimlik. `scheduledTime` route'ta yoksa her render yeniden üretilen bir varsayılan (`= new Date().toISOString()`). `canSnooze` store'daki `snoozes`'dan türetiliyor.

Bunları deps'e eklemek 3 dakikalık geri sayımı **her render'da sıfırlar** ve auto-snooze **hiç tetiklenmez**. Eklememek ise bayat closure hatasını korur.

**Çözüm:** tüm değerler her render taze tutulan bir ref'te; zamanlayıcı tetiklendiğinde ref'ten okuyor.

```ts
const autoSnoozeState = { canSnooze, handleSnooze, logMedicineMissed, stopAlarmAudio,
                          clearAlarmNotifications, dismissAlarm, reminderTimeId,
                          scheduledTime, medicineId };
const autoSnoozeRef = useRef(autoSnoozeState);
autoSnoozeRef.current = autoSnoozeState;
```

Sayaç bir kez kuruluyor, deps `[isTestMode]`. Sonuç: bayat closure düzeliyor **ve** geri sayım kesintiye uğramıyor. `react-hooks/exhaustive-deps` uyarısı da üretmiyor (tüm değerler ref üzerinden okunduğu için).

Yeni sıralama: **önce kayıt, sonra kapanış** — `dismiss()` store/ekranı kapattıktan sonra yazılan kayıt yarışa girerdi.

### 3.3 Tip genişletmesi (TypeScript'in yakaladığı gerçek kısıt)

`_createMedicineLog` yalnızca `'taken' | 'skipped'` kabul ediyordu → `'missed'` derlenmedi:

```
src/stores/medicineStore.ts(1437,11): error TS2345:
Argument of type '"missed"' is not assignable to parameter of type '"taken" | "skipped"'.
```

Helper gövdeleri okundu: `buildMedicineLogBase` status'u yalnızca nesneye koyuyor; `withTakenAt` ise `status === 'taken' ? { ...base, takenAt } : base` — yani `'missed'` için davranış **zaten doğruydu**. Üç imza da `MedicineLog['status']`'a genişletildi (parametre tipini genişletmek çağıranlar için güvenli). `withTakenAt`'in docstring'i de netleştirildi: `takenAt` yalnızca hastanın dozu **aldığı** anlamına gelir, kaçırılan/bekleyen doza yazılmaz.

---

## 4. Testler

### 4.1 Davranışsal — `__tests__/stores/medicineStore.test.ts` → `describe('logMedicineMissed')` (7 test)

| Test | Garantilediği |
|---|---|
| `should create a missed log` | `status === 'missed'`, doğru `reminderTimeId` |
| `should not set takenAt for missed logs` | kaçırılan doza alınma damgası basılmıyor |
| ⚠️ **hastanın ALDIM kararının üzerine YAZMAZ** | `taken` korunuyor, tek kayıt kalıyor |
| ⚠️ **hastanın ATLADIM kararının üzerine YAZMAZ** | `skipped` korunuyor — otomatik `missed` klinik kararın yerini alamaz |
| aynı doz iki kez kaçırılırsa tek kayıt kalır | yan etkiler (bulut + push) tekrarlanmıyor |
| FARKLI dozlar birbirini engellemez | guard slot-bazlı, global değil |
| kaçırıldı → alındı geçişi hâlâ çalışır | `missed` terminal durum değil |

### 4.2 Yapısal kapı — `__tests__/screens/AlarmScreen.autoSnooze.contract.test.ts` (8 test, yeni dosya)

Efekt `if (isTestMode) return` ile korunduğu ve `useAlarmController` navigasyon + route + dil + store + ses + native modülleri çektiği için **davranışsal hook testi bu yolu hiç çalıştıramaz.** Bu yüzden `firestoreRules.contract.test.ts` ve `a11y.test.ts` ile aynı desen kullanıldı: kusurun **geri gelmesini** engelleyen yapısal değişmezler.

1. Erteleme hakları bittiğinde doz `missed` olarak **kaydediliyor**
2. Kayıt, alarmı kapatmadan **önce** yazılıyor (sıra garantisi)
3. ⚠️ Otomatik kapanışta `skipped` **yazılmıyor** (v1.7.7 invariantı)
4. Zamanlayıcı güncel değerleri **ref üzerinden** okuyor (bayat closure değil)
5. Deps yalnızca `[isTestMode]` — geri sayım her render'da sıfırlanmıyor
6. Deps arasında `canSnooze` veya `handleSnooze` **yok**
7. `logMedicineMissed` store'dan çözülüyor (kablolama mevcut)
8. Store aksiyonu gerçekten tanımlı ve `'missed'` ile log üretiyor

**Önemli uygulama ayrıntısı:** kapı testi `stripComments` kullanıyor. Auto-snooze bloğundaki yorum, v1.7.7 invariantı gereği `logMedicineSkipped` **ÇAĞRILMADIĞINI** açıklıyor; yorumlar soyulmasa "skipped yazmıyor" iddiası **kendi açıklamamız yüzünden** patlardı. Aynı gerekçe `firestoreRules.contract.test.ts`'te de belgeli.

### 4.3 Kapının ısırdığının kanıtı (mutasyon provası)

Projenin kendi v1.8.8 pratiği (*"Testin ISIRDIGI kanitlandi: errorMessage render blogu gecici olarak {null} yapildi -> 1 test kirildi, geri alindi"*) uygulandı:

- Kusur geçici olarak geri kondu: `logMissed(rtId, schedTime, medId)` çağrısı kaldırıldı **ve** deps `[canSnooze, isTestMode]` yapıldı.
- Sonuç: **4 test kırıldı** — tam beklenenler (kayıt varlığı, kayıt sırası, deps içeriği, deps'te `canSnooze` yasağı).
- Kod geri yüklendi, 8/8 yeşil.

Yani kapı trivially-pass değil; regresyon geri gelirse CI kırılır.

---

## 5. Doğrulama

| Kontrol | Komut | Sonuç |
|---|---|---|
| Tip güvenliği | `npm run typecheck` | ✅ exit 0 |
| Lint (5 değişen dosya) | `npx eslint ... --quiet` | ✅ **0 error** (çıktı boş) |
| Store testleri | `npx jest src/__tests__/stores/medicineStore.test.ts` | ✅ **77 test** (+7 yeni) |
| Sözleşme kapısı | `npx jest .../AlarmScreen.autoSnooze.contract.test.ts` | ✅ **8/8** |
| Mutasyon provası | aynı | ✅ **4 test kırıldı** → kapı ısırıyor |
| Tam paket | `npx jest --ci` | ✅ **221 suite / 2306 test**, 0 FAIL, 39.2s |

Test sayısı 2298 → **2306** (+8), suite 220 → **221** (+1).

---

## 6. Değişen dosyalar

```
 M mobile/src/stores/medicineStore.ts                          (+122)  logMedicineMissed + tip genişletmesi
 M mobile/src/screens/AlarmScreen/hooks/useAlarmController.ts   (+91)  missed kaydı + latest-ref + sıra
 M mobile/src/stores/helpers/builders.ts                        (+6)   status tipi genişletildi
 M mobile/src/__tests__/stores/medicineStore.test.ts           (+103)  7 davranışsal test
?? mobile/src/__tests__/screens/AlarmScreen.autoSnooze.contract.test.ts   8 yapısal kapı testi
```

---

## 7. Neden sürümsüz

`versionName`/`versionCode` **2.4.0 / 82** olarak bırakıldı:

- APK derlenmedi, cihaza kurulmadı.
- Bu düzeltme bir klinik davranış değişikliği; canlı doğrulama (cihazda alarmı 3 dk yanıtsız bırakıp `missed` kaydının ve bakıcı bildiriminin oluştuğunu görmek) **yapılmadı**.

Ortada yayınlanmış ve cihazda kanıtlanmış bir artefakt olmadığı için sürüm damgası basmak yanlış beyan olurdu. Keep a Changelog gereği commit'lenmiş-yayınlanmamış işin doğru yeri `[Unreleased]`. Yayın kararı verildiğinde bu kayıt uygun sürüm başlığına taşınmalı.

---

## 8. Açık kalan ilgili maddeler

Bu düzeltme YENİ-1'i kapatıyor ama aynı aileden olan şu maddeler **açık**:

| # | Madde | İlişki |
|---|---|---|
| **O2** | `markMissedReminders` yalnızca BUGÜNÜ işaretliyor (`missedReminders.ts:36, :47`) | Bu düzeltme auto-snooze yolunu kurtarıyor, ama uygulama 3 gün açılmazsa geçmiş günlerin kaçırılan dozları hâlâ hiç kaydedilmiyor |
| **K5** | Çevrimdışı bakıcı bildirimi kalıcı kayboluyor (`memoryLocalCache` + fire-and-forget) | Yeni `missed` kaydı da `notifyCaregiversAboutMedicineStatus`'a fire-and-forget gidiyor; ağ yoksa uyarı **yine** kaybolur. Kalıcı outbox şart |
| **YENİ-3 / Y4** | Boot yolunda `FOREGROUND_SERVICE_SHORT_SERVICE` izni eksik | Klinik güvenilirlik açısından **en kritik ikinci** bulgu; hâlâ açık |
| **YENİ-2** | Çark tarih seçici doğum tarihini sessizce kaydırıyor | Hâlâ açık |
| **Y3** | RxNav ağ hatası "etkileşim yok" sayılıyor | Tek satırlık düzeltme, hâlâ alınmadı |

---

*Bu kayıt, 2026-09-07 tarihli yeniden doğrulama raporunun YENİ-1 (CRITICAL) bulgusuna verilen yanıttır.*
