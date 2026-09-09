# Changelog

Bu projedeki tüm önemli ve kayda değer değişiklikler bu dosyada belgelenmektedir.

Biçimlendirme standardı [Keep a Changelog](https://keepachangelog.com/tr/1.0.0/) prensiplerine dayanır ve bu proje [Semantic Versioning (SemVer)](https://semver.org/lang/tr/) kurallarına uyar.

---

## [Unreleased]
### Added
- Gelecek sürüm geliştirmeleri ve Ufuk 3 AI Vision yol haritası maddeleri.

### Security
- **🚨 `firestore.rules` — hasta kendi abonelik tier'ını yazabiliyordu (v1.7.4'te "kapatıldı" sanılan açık hiç kapanmamış):** Firestore kuralları eşleşen **tüm** `allow` ifadelerini OR'lar; daha geniş bir kural daha dar bir `allow write: if false`'u **geçersiz kılar**. `users/{uid}/subscription/current` yolu hem `match /subscription/{subscriptionId}` (`allow write: if false`) hem de `match /{allSubcollections=**}` (`allow read, write: if isOwner(userId)`) ile eşleşiyordu — yani catch-all üzerinden **hasta kendi dokümanına `tier:'premium'` yazıp ödemesiz Premium açabiliyordu.** Çözüm: catch-all'a `allSubcollections[0] != 'subscription'` istisnası. Okuma etkilenmedi (`allow read: if isOwner` hâlâ geçerli) ve diğer alt koleksiyonlar sahibi için yazılabilir kaldı.
  - **Nasıl bulundu:** emülatörde **davranışsal** testle. `firestoreRules.contract.test.ts` `allow write: if false` metnini görüp **geçiyordu**; gerçek yazma isteği ise başarılı oluyordu. **Ders: şekil kapısı davranışı kanıtlamaz.**
- **🧪 Firestore kural test altyapısı eklendi:** `mobile/src/__tests__/security/firestoreRules.behavioral.test.ts` — **32 senaryo**, gerçek Firestore emülatöründe (`@firebase/rules-unit-testing` + `firebase.json`'a `emulators.firestore`). K1/K2/K3 sertleştirmesini davranışsal olarak kilitler: anonim kimlikle davet `get`/ilişki kurma reddi, süresi dolmuş davet reddi, `expiresAtMs` olmayan eski davetin sentinel ile kabulü, kabul edilmiş davetin tekrar oynatılamaması, bakıcının `source` olmadan/yanlış `source` ile doz kaydı oluşturamaması, **bakıcının mevcut doz kaydını update edememesi** (K3'ün özü), `hasOnly` alan kısıtı, ilişki kimliği biçimi, `config/` kapalılığı, yetkisi kaldırılan bakıcının kendini yeniden `active` yapamaması. `FIRESTORE_EMULATOR_HOST` tanımlı değilse suite **skip** edilir (CI kırılmaz) ve nedeni loglanır.
  - Çalıştırma: `firebase emulators:exec --only firestore "cd mobile && npx jest src/__tests__/security/firestoreRules.behavioral.test.ts"` — Firebase CLI `JAVA_HOME`'u değil **PATH'teki `java`**'yı kullanıyor ve v15.4.0 **Java 21+** istiyor; bu makinede uygun JDK Android Studio JBR'da (`C:\Program Files\Android\Android Studio\jbr`, 21.0.9).
- **⚠️ Bu kurallar CANLIYA ALINDI:** `firebase deploy --only firestore:rules` → `released rules firestore.rules to cloud.firestore` (`ilachatirlatici-15a71`). Deploy'dan önce 32 davranışsal test yeşildi ve Firestore sunucu tarafında derleme hatası bulmadı.

- **🔒 Firestore Rules Sertleştirmesi — Davet Zinciri ve Doz Kaydı Bütünlüğü (`firestore.rules`):** App Check mobilde fiilen kapalı olduğu için kural dosyası tek koruma katmanı; kapsamlı depo denetiminin K1/K2/K3 bulguları bu yüzden kural tarafında kapatıldı. **Kurallar artık CANLIDA** — bkz. yukarıdaki deploy maddesi.
  - **Anonim kimlik kapatıldı (`isNotAnonymous()`):** `caregiverInvites/{inviteCode}` üzerindeki `allow get: if isAuthenticated()` koşulu, sınırsız ve atfedilemez tek kullanımlık kimliklerle davet kodu uzayının taranmasına imkân veriyordu. `sign_in_provider != 'anonymous'` şartı hem davet okumaya hem ilişki kurmaya eklendi. Kırıcı değil: uygulama anonim girişi hiçbir akışta çağırmıyor (`loginAnonymously`'nin çağıranı yok).
  - **Davet süresi dolumu kuralda bağlayıcı (`inviteNotExpired()`):** süre kontrolü yalnızca istemcideydi, SDK'yı doğrudan kullanan herkes atlıyordu ve süresi dolmuş ama `pending` kalmış davet sonsuza dek çalışıyordu. `expiresAt` ISO string olduğu ve Rules `Timestamp`'te `toISOString()` bulunmadığı için string↔Timestamp karşılaştırması **tüm kabulleri reddederdi**; bu yüzden sayısal `expiresAtMs` alanı eklendi. Alanı olmayan eski davetler sentinel ile korunuyor (kırıcı olmayan geçiş).
  - **Bakıcı davet güncellemesi kısıtlandı:** `pending → accepted` geçişi ve `affectedKeys().hasOnly(['status','caregiverId','caregiverName','acceptedAt'])` zorunlu. Eskiden bekleyen bir davette `caregiverId`'sini kendi UID'sine eşitleyen herkes keyfi alan yazabiliyordu.
  - **Doz kaydı bakıcı için APPEND-ONLY:** `medicineLogs`'ta bakıcının `update` hakkı kaldırıldı, `source == 'caregiver_action'` beyanı zorunlu kılındı. Eskiden bakıcı hastanın kaydettiği bir `missed` logu `taken`'a çevirip `source`'u aynı yazımda değiştirerek düzenlemenin izini örtebiliyordu; hiçbir yerde aktör kimliği tutulmuyordu. KVKK m.6 kapsamında bütünlüğü yasal yükümlülük olan özel nitelikli veri. `actorUid` istemciye eklendi ama kural şartı **saha yayılımı beklenerek** Faz 2'ye bırakıldı.
- **🔒 `scripts/` fail-closed gitignore:** dizindeki iki ayrı betikte (`qwen_alarm_audit.js:5`, `qwen_general_codebase_audit.js:5`) düz metin canlı bir API anahtarı bulundu. Anahtar git geçmişine **hiç girmedi** (`git log --all -S` boş) ve `scripts/*` + iki doğrulanmış araç istisnasıyla yok sayılıyor; böylece yeni eklenen her dosya otomatik dışlanır. ⚠️ **Anahtarın kendisi hâlâ diskte ve iptal edilmesi gerekiyor** — gitignore sızıntıyı önler ama mevcut anahtarı geçersiz kılmaz.

### Fixed
- **🚨 `AIClinicalShieldCard.tsx` + `aiMedicineService.ts` — AI'ın ürettiği klinik tavsiye doğrulanmadan ve feragat metinsiz hastaya gösteriliyordu (K6):** Gemini çıktısı `JSON.parse` + tek bir `typeof` kontrolüyle hastaya gidiyordu. Skor **yoksa 85 uyduruluyordu**, 0-100 dışına çıkabiliyordu, hata yolunda `success: false` ile birlikte **80** dönüyordu ve kart `report ?` ile kapı kurduğu için `report.success` ekranın **hiçbir yerinde okunmuyordu** — yani BAŞARISIZ bir analiz, uydurma skoruyla hastaya **geçerli bir klinik hüküm** olarak render ediliyordu. Dizi elemanları yalnızca `Array.isArray` ile kontrol ediliyor, `fw.timingRule`/`fw.severity` ham okunuyordu. Kartta hiçbir "hekime/eczacıya danışın" veya "tıbbi tavsiye değildir" ibaresi yoktu; tek AI işareti "🤖 Gemini 3.6 Flash" rozetiydi, oysa prompt modeli "klinik farmakolog ve tıp doktoru" olarak sunmaya yönlendiriyordu.
  - **Çözüm:** Zod şeması eklendi (`safetyScoreSchema` = `z.number().min(0).max(100)`, `foodDrinkWarningSchema` eleman şekli, `MAX_LIST_ITEMS = 20` tavanı). **Skor zorunlu**: yoksa veya aralık dışındaysa rapor BAŞARISIZ sayılıyor ve **asla varsayılan skor uydurulmuyor** — üç başarısızlık yolunun hepsi artık `success: false` + `overallSafetyScore: 0` dönüyor (0 bir skor değil, "skor yok" işareti). Diziler **eleman eleman** doğrulanıyor, bozuk eleman düşürülüyor ve düşme adedi loglanıyor (tek hatalı besin önerisi tüm raporu çöpe atmıyor, ama bozuk eleman da hastaya gösterilmiyor). Kart skoru `report.success` ile kapılıyor, başarısızlıkta ayrı bir "Klinik analiz tamamlanamadı — bu bir güvenlik değerlendirmesi DEĞİLDİR" dalı çiziyor ve **zorunlu feragat metni** (TR+EN) başarı durumunda da her zaman görünüyor. Yenile butonuna `accessibilityRole`/`Label`/`Hint`/`State` eklendi (denetimde etiketsizdi).
- **🚨 K5 — çevrimdışı yazımlar KALICI olarak kayboluyordu; artık kalıcı outbox var:** `config/firebase.ts` Firestore'u `memoryLocalCache()` ile kurduğu için offline kalıcılık YOK ve kritik yazımlar fire-and-forget gidiyordu: `medicineStore.ts`'te 4 yerde `saveMedicineLogToCloud(...).catch(err => log.error(...))`, `caregiverNotificationService.ts`'te `setDoc(caregiverAlerts)` → catch → `log.warn`. Sonuç: telefon çekmeyen bir ortamda atlanan/kaçırılan doz **bakıcıya asla ulaşmıyordu**. Doz logu yerelde kalıp bir sonraki `syncToCloud` ile buluta gidiyordu ama **anlık bakıcı uyarısı geri gelmiyordu** — uygulamanın birincil güvenlik vaadi tam da en ihtiyaç duyulan senaryoda sessizce düşüyordu. `utils/syncQueue.ts` bu işi göremez: o bir mutex, `dispose()` bekleyenleri **reject** ediyor ve hiçbir şey diskte tutmuyor; `offlineResilience.test.ts`'in söz ettiği "caller retry queue" prod'da hiç yoktu.
  - **Çözüm:** `utils/outboxStore.ts` (AsyncStorage'da kalıcı, idempotent, tavanlı, backoff'lu kuyruk) + `utils/outboxFlusher.ts` (teslim koordinatörü). Tetikleyiciler: uygulama açılışı, **NetInfo** bağlantı dönüşü, **AppState** `active`, ve kuyrukta iş kaldığı sürece kendini zamanlayan yeniden deneme — **polling değil**, boşalınca duruyor (doz alarmı uygulamasında pil bütçesi klinik bir kısıt). 5 fire-and-forget yazım noktası bağlandı. `@react-native-community/netinfo` bağımlılığı eklendi (**yerel modül: yeniden derleme gerekir**).
  - **Tasarım kararları:** teslim `setDoc` ile sabit doküman kimliğine yazdığı için **idempotent** (çift kayıt üretmez); başarısızlıkta giriş **silinmiyor** (doz kaydı klinik veridir, vazgeçilmez) yalnızca üstel backoff uygulanıyor; `MAX_ENTRIES = 200` tavanı aşıldığında en eski giriş düşürülür ve bu **`log.error` ile kaydedilir** (sessiz veri kaybı olmasın — O1'den alınan ders); bozuk disk verisi şekil kontrolünden geçirilir (O3'ten alınan ders). Bakıcı uyarısında outbox anahtarı `alertId__caregiverId` çünkü döngü birden çok bakıcı için aynı milisaniyede aynı `alertId`'yi üretebiliyor — Firestore doküman kimliği değiştirilmedi.
  - **KVKK:** outbox sağlık verisi taşıdığı için anahtar `MEDICINE_STORE_STORAGE_KEYS`'e eklendi; hesap silme / "tüm verileri temizle" akışı artık kuyruğu da temizliyor (aksi halde hasta hesabını sildikten sonra doz kayıtları cihazda kalırdı — KVKK m.7 / GDPR Art. 17).
  - **Test:** 16 birim testi (kalıcılık, idempotency, backoff, tavan, bozuk veri, eşzamanlı flush mutex'i, kısmi teslim). `netinfo` için `__mocks__/@react-native-community/netinfo.js` + `jest.config.js` `moduleNameMapper` eklendi — paketin kendi jest mock klasörü bu sürümde yok ve native modül test ortamında bulunmadığı için `medicineStore`'u import eden **5 suite çalışamaz** hale gelmişti.
- **🚨 `firestoreSync.ts` — bayat cihaz başka cihazın kaydını BULUTTAN SİLİYORDU (Y1):** `syncMedicinesToCloud` ve `syncReminderTimesToCloud`, bulutta olup **yerel listede olmayan** her dokümanı siliyordu. `medicineStore` her mutasyonda `scheduleBackgroundSync(() => syncToCloud())` çağırıyor ve öncesinde `syncFromCloud` zorunluluğu **yok**. Senaryo: tablet yeni ilaç ekler → buluta yazar; telefon o gün hiç açılmamış (yerel liste bayat), kullanıcı telefonda **tek bir ayar** değiştirir → `syncToCloud` → tabletin ilacı **ve hatırlatma saatleri buluttan silinir** → tablet sonraki açılışta ilacı kaybeder. Sonuç sessiz ilaç/alarm kaybı = kaçırılan doz. Tombstone sistemi (`domain/deletions.ts`, v1.7.8) yalnızca kasıtlı silmeleri taşıyordu ama bu yol onu **bypass** ediyordu.
  - **Çözüm:** silme kararı artık **tombstone'a bağlı**, "yerelde yok" tahminine değil. İki fonksiyon opsiyonel `deletedIds?: DeletionRegistry` alıyor; `uploadAllDataToCloud` bunları `data.deletions`'tan geçiriyor (store zaten gönderiyordu — `medicineStore.ts:408`, `:635`). Tombstone'u olmayan bir eksik "bu cihaz bilmiyor" demektir, "silinmiş" değil → dokümana dokunulmuyor ve bir sonraki `syncFromCloud` onu bu cihaza getiriyor. Kasıtlı silmeler aynen yayılmaya devam ediyor (aksi halde v1.7.8'in çözdüğü hayalet-alarm kusuru geri gelirdi). Hatırlatma kaybı doğrudan **alarm kaybı** olduğu için bu yol ilaçlardan bile kritik.
- **🚨 `firestoreSync.ts` — bulut doz geçmişi her full-sync'te 30 GÜNE BUDANIYORDU (Y2):** `syncMedicineLogsToCloud` içinde `newIds` yalnızca 30 günlük filtreli `recentLogs`'tan kuruluyor, ardından onda olmayan **tüm** bulut logları `batch.delete` ile siliniyordu. Yani 31+ günlük bulut doz geçmişi her senkronda **aktif olarak yok ediliyordu**. Cihaz değişimi / veri temizleme / yeniden kurulumda 30 günden eski doz geçmişi, adherans istatistikleri ve PDF hekim raporu için gereken veri kalıcı olarak kayboluyordu. Yerel `medicineLogs` sınırsız büyürken bulut kopyasının budanması asimetrik ve belgelenmemiş bir veri kaybıydı.
  - **Çözüm:** toplu silme **tamamen kaldırıldı**; 30 günlük **yükleme** filtresi korundu. Bu ikisi birlikte zarif bir sonuç veriyor: her sync o anki pencereyi yüklediği ve silme olmadığı için bulut **zamanla tüm geçmişi kendiliğinden biriktiriyor** — arşiv oluşuyor ama ilk-sync hacmi şişmiyor. Gerekçe: `medicineLogs` klinik bir kayıttır (K3 ile bakıcı yolu zaten append-only yapıldı) ve `DeletionRegistries` yalnızca `medicines` + `reminderTimes` içeriyor, yani loglar için tombstone sinyali zaten taşınmıyor — tombstone'u olmayan bir silmeyi buluta yaymak tahmindir. Hastanın tekil bir logu silmesi hâlâ mümkün (`allow delete: if isOwner`); kaldırılan yalnızca senkronun toplu silmesi.
  - **Test:** eski `should delete medicines that no longer exist locally` testi kusurlu davranışı kodluyordu; iki teste ayrıldı (tombstone **yoksa** silme / **varsa** sil). Y2 için yeni test: 60 günlük bulut logu yerel listede yokken `batch.delete` çağrılmamalı. **Kapının ısırdığı mutasyon provasıyla kanıtlandı** — tombstone kontrolü geçici kaldırılınca 1 test kırıldı, sonra geri alındı. Toplam **223 suite / 2350 test** yeşil, `tsc` 0, `eslint` 0 error.
- **`BootTaskService.kt` — Kotlin derleme hatası (Gradle ile yakalandı):** `TASK_TIMEOUT_MS` sabiti `Int` olarak bildirilmişti ama `HeadlessJsTaskConfig` timeout parametresi `Long` bekliyor. Kotlin tamsayı **literallerinde** örtük Int→Long dönüşümüne izin verir, **tipli sabitlerde vermez** — bu yüzden orijinal `180000` literali çalışırken sabite çıkarmak `:app:compileReleaseKotlin`'i kırdı (`Argument type mismatch: actual type is 'Int', but 'Long' was expected`). `120_000L` olarak düzeltildi ve tuzağın tekrarlanmaması için gerekçe koda yorumlandı. Kaynak-tarama sözleşme testi bunu **yakalayamazdı**; yalnızca gerçek derleme yakaladı. `:app:compileReleaseKotlin` artık **BUILD SUCCESSFUL**.
- **🚨 `BootTaskService.kt` — boot yolunda ANR riski (shortService süre marjı sıfırdı):** Android 14+ `foregroundServiceType="shortService"` için 3 dakikalık saat `startForeground()` çağrısından (yani `onCreate`'ten) itibaren işliyor; aşılırsa sistem `Service.onTimeout()` çağırıyor ve servis durdurulmazsa uygulama cached duruma düşüp **ANR** alıyor — uygulamanın başka geçerli foreground servisi olsa bile. `getTaskConfig` ise **180000 ms** veriyordu, yani tavanna tam eşit; üstelik görev saati `startForeground`'dan daha geç başladığı için tavan her zaman görevden önce doluyordu ve `onTimeout()` override'ı yoktu. Bu, reboot / saat dilimi değişikliği / uygulama güncellemesi sonrası alarmları yeniden kaydeden **tek JS yolu** — burada bir ANR hastanın doz alarmlarının sessizce kaybolması demek. Görev bütçesi `120000 ms`'e indirildi (60 s marj) ve RN'in görev-zaman-aşımı yolundan **bağımsız** bir emniyet supabı eklendi (`HARD_STOP_MS = 150000`, `Handler.postDelayed`) + tek idempotent `shutdown()`. `onTimeout()` override'ı **bilinçli olarak eklenmedi**: API 34'te eklendi, `androidx @RequiresApi` gerektiriyor, bu projede hiçbir Kotlin dosyası `androidx.annotation` kullanmıyor ve derleme doğrulaması yapılamadı — boot yolunda körlemesine API-34 kodu eklemek çözdüğünden büyük risk olurdu.
  - **Denetim düzeltmesi:** bu bulgu raporda *"eksik `FOREGROUND_SERVICE_SHORT_SERVICE` izni → `startForeground()` `SecurityException` fırlatır"* olarak teşhis edilmişti ve bu **yanlıştı**. Resmî Android 14 dokümanına göre `shortService` için manifest'te bildirilecek alt-tip izni **yok** ("None"); temel `FOREGROUND_SERVICE` yeterli ve o `AndroidManifest.xml:7`'de zaten mevcut. Yani eksik izin yoktu; gerçek kusur sıfır süre marjı ve başıboş timeout'tu.
- **🚨 `WheelDatePicker.tsx` — çark tarih seçici doğum tarihini sessizce kaydırıyordu:** `handleSelect` doğru aksiyonu reducer ile **hesaplıyor** ama ardından `dispatch({ type: 'reset', parts: nextState.parts })` yapıyordu. `case 'reset'` ise `lastExplicitDay: action.parts.day` yazıyor — yani halihazırda **kırpılmış** günü; oysa `case 'setMonth'`/`case 'setYear'` onu koruyor. Sonuç: koruma her sütun kaydırmasında çöpe gidiyordu. **31 Ocak 1975** → ayı Şubat yap (gün 28'e kırpılır, `lastExplicitDay` 28 olur) → ayı geri Ocak yap → `resolveDay(1975,1,28)` = 28 → kaydedilen doğum tarihi **1975-01-28, üç gün yanlış** ve hiçbir uyarı yok. Yaş `calculateAge` üzerinden doz/yaş bazlı karar desteğini ve acil tıbbi kimlik rozetini beslediği için bu bir klinik veri bozulması. Hesaplanan aksiyonun kendisi dispatch edilecek şekilde düzeltildi. `wheelDateModel.test.ts` kusuru yakalamıyordu çünkü `setMonth`'i doğrudan dispatch ediyor; bileşen yolu hiç test edilmiyordu.
- **🚨 `drugInteraction.ts` — RxNav ağ hatası "etkileşim yok" sayılıp yerel fallback'i atlıyordu:** `checkInteractionsFromAPI`'nin catch bloğu hata sinyali vermeden `{ hasInteractions: false, interactions: [] }` dönüyordu ve çağıran taraf koşulsuz `apiSuccess = true` set ediyordu. Fallback kapısı `if (!apiSuccess || rxcuis.length < drugNames.length)` olduğundan, tüm ilaçlar RxCUI'ye çevrilmişse ve API ağ hatası verdiyse yerel veritabanı **hiç sorgulanmıyordu** → çevrimdışı/kötü ağda kullanıcı aspirin+varfarin gibi yerel DB'de kayıtlı **yüksek riskli** bir çift için bile "etkileşim bulunamadı" görüyordu. **Ek kusur:** `response.ok` hiç kontrol edilmiyordu; 500 / 429 / bir HTML hata sayfası da sessizce `hasInteractions:false` üretiyordu. Yeni `ApiInteractionCheckResult.ok` bayrağı eklendi (`ok=false` → "API'ye ulaşılamadı", `hasInteractions=false` → "gerçekten etkileşim yok" — ikisi aynı şey değil), `response.ok` kontrolü eklendi ve çağıran taraf `apiSuccess = apiResult.ok` okuyor.
- **🧪 Test kapsaması:** +22 test, +2 suite. `drugInteraction.fallback.test.ts` (7 test — etkileşim servisinin CI kapsaması ana paket `describe.skip` olduğu için bu dosyaya kadar **sıfırdı**), `WheelDatePicker` gün-koruma (4 test — çark öğeleri a11y ağacından gizli olduğu için `root.findAll` ile ham ağaçtan iniliyor), `bootTaskService.contract.test.ts` (11 test — Kotlin jest ile çalıştırılamadığı için sayısal invariantlar kaynak üzerinden kilitleniyor). **Üç kapının da ısırdığı mutasyon provasıyla kanıtlandı:** kusurlar geçici olarak geri konduğunda sırasıyla 3, 1 ve 2 test kırıldı. Toplam **223 suite / 2328 test** yeşil, `tsc` 0, `eslint` 0 error. ⚠️ Kotlin **derlenmedi** — davranışsal doğrulama için cihazda `BOOT_COMPLETED` senaryosu ve logcat gerekiyor.
- **🚨 `useAlarmController.ts` — erteleme hakları biten doz KAYITSIZ kapanıyordu (v2.0.1 klinik regresyonu):** Auto-snooze, kullanıcı 3 dakika yanıt vermeyip erteleme hakları tükendiğinde alarm sesini durdurup bildirimleri temizleyip ekranı kapatıyordu — **hiçbir doz kaydı yazmadan**. Sonuç sessiz kaçırılan dozdu: yerel kayıt yok, bulut kaydı yok, bakıcı uyarısı yok. Üstelik sonradan da onarılamıyordu, çünkü `markMissedReminders` yalnızca **bugünü** ve 60 dk grace ile dolduruyor; uygulama aynı gün bir daha açılmazsa doz hiç kaydedilmiyordu. Bu, v1.7.7'nin aynı dosyadaki açık invariantını da ihlal ediyordu (*"alarmi acik tutmak ve kullaniciyi 'Aldim' / 'Atla' arasinda secim yapmaya birakmak"*).
  - **Çözüm:** yeni `logMedicineMissed` store aksiyonu ile doz **`missed`** olarak kaydediliyor, sonra alarm kapatılıyor. Kritik ayrım: **`missed` bir SONUÇTUR** ("hasta bu dozu yanıtlamadı"), **`skipped` hastanın KLİNİK KARARIDIR** ve v1.7.7 gereği yalnızca kullanıcı açıkça seçerse yazılır. Bu yüzden otomatik yolda `logMedicineSkipped` **çağrılmıyor**. `missed` bu kod tabanında zaten otomatik yazıldığı için (`markMissedReminders`) desen yerleşik. Böylece hem sahte klinik karar üretilmiyor, hem doz kayıtsız kaybolmuyor, hem bakıcı haberdar oluyor, hem de v2.0.1'in meşru pil kaygısı korunuyor.
  - **Guard:** slot için herhangi bir kayıt (`taken`/`skipped`/`missed`) varsa **hiçbir şey yazılmıyor** — kullanıcı zamanlayıcı tetiklenmeden bir an önce "Aldım"a bastıysa alınmış doz uyum raporunda kaçırılmış görünmüyor ve yan etkiler (bulut yazması + bakıcı push) tekrarlanmıyor.
  - **Bayat closure düzeltmesi:** deps `[canSnooze, isTestMode]` idi ama gövde `handleSnooze`/`stopAlarmAudio`/`dismissAlarm`'ı kapatıyordu. Bunlar deps'e eklenemedi, çünkü `handleSnooze` `useCallback` değil ve `scheduledTime` route'ta yoksa her render yeniden üretilen bir varsayılan — deps'e koymak 3 dakikalık geri sayımı her render'da sıfırlar ve auto-snooze **hiç tetiklenmezdi**. "Latest ref" deseniyle sayaç bir kez kuruluyor, tetiklendiğinde güncel değerleri okuyor. Deps artık `[isTestMode]` ve `exhaustive-deps` uyarısı üretmiyor.
  - **Tip genişletmesi:** `_createMedicineLog`, `buildMedicineLogBase` ve `withTakenAt` `'taken' | 'skipped'`'a daraltılmıştı; `MedicineLog['status']`'a genişletildi. `withTakenAt` yalnızca `status === 'taken'` iken `takenAt` eklediği için `missed` davranışı zaten doğruydu.
  - **Test:** 7 store testi (`logMedicineMissed`: taken/skipped kararının üzerine yazmaz, yan etkileri tekrarlamaz, `takenAt` koymaz, `missed → taken` geçişi çalışır) + 8 sözleşme kapısı testi (`AlarmScreen.autoSnooze.contract.test.ts`). Kapının **ısırdığı mutasyon provasıyla kanıtlandı**: kusur geçici olarak geri konduğunda 4 test kırıldı. Efekt `if (isTestMode) return` ile korunduğu için davranışsal hook testi bu yolu çalıştıramaz; bu yüzden `firestoreRules.contract.test.ts` ve `a11y.test.ts` ile aynı kaynak-tarama kapısı deseni kullanıldı. Toplam **221 suite / 2306 test** yeşil, `tsc` 0, `eslint` 0 error.
- **`domain/wheelDateModel.ts` — `no-fallthrough`:** iç `switch`'te `default` olmadığı için `case 'step'` bloğu dönüşsüz tamamlanıp `case 'reset'`'e düşüyordu; orada bir step aksiyonunda `action.parts` tanımsız olduğundan `TypeError` üretirdi.
- **`hooks/useResponsiveLayout.ts` — `react-hooks/rules-of-hooks`:** `useWindowDimensions` bir `if` içinde çağrılıyordu. Koşul render'lar arasında değişirse React hook sırası bozulur ve "Rendered fewer hooks than expected" ile çöker; kanca 9 ekranda kullanılıyor. Çağrı koşulsuz hale getirildi, v2.4.0'ın savunmacı test kalkanı korundu.
- **8 lint error temizlendi:** yukarıdaki iki gerçek kusur + 6 kullanılmayan import (`WheelColumn`, `WheelDatePicker`, `WheelDatePickerModal`, `MedicalIdModal`, `dateParts.test`, `caregiverService`). `npm run lint` artık **0 error**.

## [2.4.0] - 2026-09-07
### Added
- **📱 İlaçlarım Ekranı Tablet 2'li Akıllı Izgara Mimarisi (`MedicinesScreen.tsx` & `MedicineRow.tsx`):**
  - Samsung Galaxy Tab S7 FE (12.4" 1600x2560 WQXGA) ve tüm tabletlerde aktif/pasif ilaç kartları tek bir uzun satır yerine yan yana 2 sütunlu (`width: '49%'`, `flexWrap: 'wrap'`) modern ve kompakt bir ızgarada listelendi.
  - Kart dış kenar boşlukları (`tabletMedicineCard`) dengelendi; kart içi 3 nokta işlem menüsü dokunma alanı (`moreButton`) WCAG 2.5.5 erişilebilirlik standardına uygun olarak minimum 44dp genişliğe yükseltildi.
- **📅 Aylık Uyum Takvimi Split-Pane & Entegre Detay Paneli (`MonthCalendarView.tsx`):**
  - Tablet geniş ekranında açılır modal sheet yerine Sol Pano'da tam kare 7x5 takvim ızgarası, Sağ Pano'da ise seçili günün tüm ilaç doz kartları ve uyum rozetleri eşzamanlı olarak gösterildi.
  - Tıklanan günün ilaçları, saatleri ve "Bekliyor / Alındı" durumları modal açmaya gerek kalmadan doğrudan sağ kolonda dinamik ve interaktif olarak incelenebilir hale getirildi.
- **📝 İlaç Ekleme Ekranı Dual-Pane Form Mimarisi (`AddMedicineScreen.tsx`):**
  - Tablet form boyunu %50 kısaltarak dikey kaydırma ihtiyacını ortadan kaldıran 2 sütunlu form mimarisi kuruldu:
    - **Sol Sütun (%49):** E-Reçete Hızlı İçe Aktarma, İlaç Adı (TİTCK Canlı Arama), Dozaj ve İlaç Form Seçici (2x3 Izgara).
    - **Sağ Sütun (%49):** Sezgisel Kullanım Planı (Günde kaç kez, hatırlatıcı saatleri, aç/tok durumu) ve Gelişmiş Seçenekler Akordeonu (Kür, SKT, Stok, Renk, Titreşim).
- **⚡ Ana Sayfa Tablet Sağ Sütun Widget & Hızlı Erişim Paneli (`HomeScreen.tsx` & `StatsGrid.tsx`):**
  - Tablet ana sayfasında Haftalık Takvim Çubuğu altına 2x2 Özet Bilgiler Grid'i (`StatsGrid` - Bugün, Alınan, Bekleyen, Stok Uyarısı) ve 3'lü Hızlı Erişim Kartı (🏥 Nöbetçi Eczane, 👥 Refakatçi Canlı Takip, 📊 Raporlar) eklenerek sağ sütundaki ölü boşluklar tamamen giderildi.
- **🎯 Ayarlar ve Refakatçi Ekranı Tablet Merkezleme (`SettingsScreen.tsx` & `CaregiverScreen.tsx`):**
  - `useResponsiveLayout` entegrasyonu ile tabletlerde içerik maksimum 960dp genişlikte merkezlenerek kenarlarda rahat göz hizalama marjinleri sağlandı.

### Changed
- **🛡️ Klinik Erişilebilirlik ve Minimum Yazı Boyutu Güvencesi (`HomeScreen.tsx`):**
  - Ana ekran hızlı erişim butonlarındaki yazı boyutu klinik güvenlik kapısı kuralı gereğince `14pt` standardına yükseltildi (`a11y.test.ts` %100 uyum).

### Fixed
- **🧪 Test Ortamında `useResponsiveLayout` Çökme Koruması (`useResponsiveLayout.ts`):**
  - Jest ve mocksuz test ortamlarında `useWindowDimensions` veya `Dimensions` tanımsız olsa dahi güvenli varsayılan değerlerle (390x844) çalışmasını sağlayan savunmacı kalkan eklendi.
### Added
- **🎬 Tema Değişiminde Ani Parlama Önleyici Geçiş Animasyonu (`ThemeTransitionOverlay.tsx`):**
  - Ayarlar'dan açık/koyu tema değiştirildiğinde ekranın aniden bembeyaz veya simsiyah parlamasını (özellikle gece vakti fotofobi ve göz kamaşmasını) önlemek amacıyla `250ms` süreli yumuşak native cross-fade geçiş katmanı eklendi. `pointerEvents="none"` ile kullanıcı etkileşimini asla bloklamaz.
- **🖥️ Tablet 2 Sütunlu Responsive Dashboard Mimarisi (`HomeScreen.tsx`):**
  - Samsung Galaxy Tab S7 FE ve 600dp+ geniş ekranlı tabletlerde yatay alan israfını ve devasa boşlukları ortadan kaldıran 2 sütunlu (Split View) dashboard kuruldu:
    - **Sol Sütun (1.1 flex):** AI Reçete/İlaç Tarama Kartı, Sıradaki Doz Kahraman Kartı ("Hero Card") ve 2x2 Zaman Dilimleri (Sabah, Öğle, Akşam, Gece).
    - **Sağ Sütun (0.9 flex):** Haftalık Takvim Çizelgesi & İlaç Uyum Kartı.
  - Telefonlarda tek sütunlu orijinal düzen eksiksiz korunarak sıfır regresyon sağlandı.
- **👓 Yaşlı ve Uzaktan Okuma İçin Tablet Yazı Ölçekleyici (`useResponsiveLayout.ts` & `ThemedText.tsx`):**
  - Tabletlerde hastaların ekranı masaya veya sehpaya koyup uzaktan okuduğu senaryolarda klinik talimatların rahat okunması için `fontSizeMultiplier: 1.15` dinamik ölçeği entegre edildi. Tipografi ve satır yükseklikleri otomatik ölçeklenir.
- **📱 Tablet Form Seçici Dengeli 2x3 Izgarası (`DosageInput.tsx`):**
  - İlaç ekleme ekranında tablet yatayında tek satıra dizilip sığmayan veya dengesiz duran ilaç form butonları (Tablet, Kapsül, Damla, Şurup, Merhem, Toz) 3 sütun x 2 satırlık şık ve dengeli bir ızgaraya dönüştürüldü.
  - WCAG 2.5.5 uyumlu minimum 48dp dokunma hedefi ile motor kontrol güçlüğü olan hastalar için tıklama ergonomisi maksimize edildi.

### Changed
- **🎨 Tasarım Sistemi & Statik Renk Temizliği (`HomeScreen.tsx` & `AppearanceSection.tsx`):**
  - `HomeScreen` ve `AppearanceSection` bileşenlerindeki statik/hardcoded hex kodları (`#0F172A`, `#38BDF8`, `#E2E8F0`, `#F8FAFC`) temizlendi; dinamik `useTheme().colors` tasarım sistemi token'larına bağlandı.

### Fixed
- **🛡️ Katı Tip Güvenliği & Test İzolasyonu (`ThemedText.tsx`):**
  - `ThemedText` içindeki isteğe bağlı `TextStyle.fontSize` için `multiplier > 1 && baseStyle.fontSize` koruması getirilerek TypeScript derleme güvenliği sağlandı; izole testlerde tema eksikliğinde de güvenli fallback sağlandı.

## [2.2.0] - 2026-09-07
### Added
- **🖥️ Tablet & Geniş Ekran Adaptif Yerleşim Mimarisi (`useResponsiveLayout.ts`):**
  - Samsung Galaxy Tab S7 FE ve tüm Android tabletlerde (ekran genişliği >= 768dp veya minDimension >= 600dp) dashboard ve ilaç listesinin ekranda aşırı esneyip okunabilirliği bozmasını önleyen adaptif container motoru kuruldu (`maxWidth: 960`, `alignSelf: 'center'`).
  - Tablet yöneliminde içerik merkezlenerek göz ergonomisi ve klinik odaklanma sağlandı.

### Changed
- **🎨 Gündüz / Dış Mekan Yüksek Kontrast Çerçeve İyileştirmesi (`ThemeContext.tsx`):**
  - Açık mod sınır rengi (`lightColors.border`), `outlineVariant` ve `inputBorder` token'ları `#E2E8F0` (Slate 200) seviyesinden `#CBD5E1` (Slate 300) seviyesine yükseltilerek doğrudan güneş ışığı altında ve parlak ekranlarda kart ve buton sınırlarının WCAG AAA kontrastında net görünmesi sağlandı.
- **👆 WCAG 2.5.5 Uyumlu Tema Seçim Butonları (`AppearanceSection.tsx`):**
  - Ayarlar altındaki "Açık", "Koyu", "Oto" segment düğmeleri dar 15dp dokunma alanından kurtarılarak `minHeight: 40`, `minWidth: 52`, `paddingVertical: 8`, `paddingHorizontal: 14`, `borderRadius: 16` ve `hitSlop: 8` ile 56dp efektif dokunma hedefine genişletildi. Yaşlı ve titreyen parmaklar için hedeflenebilirlik garanti edildi.

### Fixed
- **💊 Klinik İlaç İsimlerinin Kırpılması & Doz Görünürlüğü (`MedicineRow.tsx` & `CurrentDoseCard.tsx`):**
  - Xiaomi ve dar ekranlı telefonlarda tek satıra sığmayan ve kesilen uzun klinik formülasyonlar (örn: `BLEPHAMIDE LIQUIFILM 5 ML DAMLA`, `NERUDA 300 MG FILM KAPLI TABLET (50 TABLET)`) için `numberOfLines={2}` ve `lineHeight: 21` esnekliği getirildi. Hiçbir klinik doz ve ilaç adı kırpılmayacak şekilde kilitlendi.
- **⚛️ ThemedText React Hook İhlali & Güvenli Tema Tüketimi (`ThemedText.tsx` & `ThemeContext.tsx`):**
  - `ThemedText` içindeki koşullu hook çağrısı (`react-hooks/rules-of-hooks`) temizlendi. `ThemeContext`'ten bağımsız çalışabilen `useThemeSafe` ve `useThemeSafeFallback` mekanizması ile hem prodüksiyon çalışma zamanı hem de izole test suite'leri %100 uyumlu hale getirildi.

## [2.1.4] - 2026-09-07
### Fixed
- **🚨 Kritik SOS Veri Sızıntısı & Fallback Açığı (`caregiverService.ts`):**
  - `sendEmergencySosToCaregivers` içindeki acil durum SOS bildirimlerinde `targetCaregivers.length > 0 ? targetCaregivers : caregivers` fallback'i tamamen kaldırıldı.
  - Sadece ve kesin olarak `c.status === 'active'` durumundaki aktif refakatçilere acil durum bildirimleri, telefon ve canlı konum koordinatları iletilecek şekilde kilitlendi; iptal edilmiş veya duraklatılmış bakıcılara veri sızması önlendi.
- **🛡️ Yetkisiz İstemci Push Bildirim Çağrılarının Temizlenmesi (`caregiverService.ts`):**
  - Hem `sendEmergencySosToCaregivers` hem de `sendRemoteReminderToPatient` içerisindeki ham HTTP Expo Push istekleri (`fetch('https://exp.host/--/api/v2/push/send')`) kaldırıldı. Bildirim dağıtımı tam yetkili Cloud Functions (`server/functions/notify.js`) ve Firestore tetikleyicilerine devredildi.
- **⚡ Agresif Polling ve Kota Tüketim Döngüsünün Kaldırılması (`CaregiverEventBridge.tsx`):**
  - Saatte ~7.200 adet lüzumsuz Firestore okuması yaparak kotaları tüketen ve pili yıpratan `1500ms` aralıklı `setInterval(pollActiveEmergencyAlerts, 1500)` döngüsü tamamen silindi; tüm acil durum bildirimleri optimize `onSnapshot` akışına devredildi.
- **🔕 Çift Alarm / Çoklu Bildirim Kapatma Senkronizasyonu (`CaregiverEventBridge.tsx`):**
  - İlaç alındığında Notifee bildirim kapatma mekanizması (`dismissNotification`), hem ana ilaç kimliği (`med.id`), hem hatırlatıcı kimliği (`rt.id`), hem de bileşik alarm kimliğini (`alarm-${med.id}-${rt.id}`) iptal edecek şekilde güçlendirildi.
- **📱 Notifee Arka Plan Olay Çakışması (`caregiverEventHandler.ts` & `mobile/index.ts`):**
  - `useCaregiverEventHandler` hook'u içerisindeki izole `notifee.onBackgroundEvent` kaydı kaldırılarak global olay çatışması önlendi; bakıcı arka plan aksiyonları (`CAREGIVER_ACTION_TAKEN`, `CAREGIVER_ACTION_CALL`) doğrudan kök `mobile/index.ts`'teki ana Notifee arka plan işleyicisine bağlandı.
- **🎯 Deterministik Firestore Log Kimliği (`caregiverService.ts`):**
  - `logMedicineTakenByCaregiver` fonksiyonuna `medicineId?: string` parametresi eklendi ve rastgele Firestore ID yerine deterministik `${patientId}_${medicineId}_${scheduledTime}` kimliğiyle mükerrer kayıtlar engellendi.
- **🔑 Dinamik Davet Kodu Doğrulaması (`useCaregiverController.ts`):**
  - 6 haneli katı kısıtlama yerine merkezi `isValidInviteCode(cleanCode)` doğrulayıcısı entegre edildi.
- **🛡️ Firestore Davet Kodu Çalınma / Tekrar Kullanım Koruması (`firestore.rules`):**
  - `caregiverInvites` kuralına `status == 'pending'` kontrolü eklenerek kabul edilmiş veya süresi geçmiş davetlerin tekrar talep edilmesi yasaklandı.
- **📲 Gerçek Cihaz FCM Token Entegrasyonu (`useCaregiverController.ts` & `useCaregiver.ts`):**
  - Davet kabul akışında cihazın gerçek FCM belirteci dinamik olarak alınarak bakıcı ilişkisine işlendi.

## [2.1.3] - 2026-09-06
### Added
- **Tarih Çarkı Mekanik Tıkırtı Sesi & Dokunsal Ses Animasyonu (`WheelSoundModule.kt` & `wheelSound.ts`):**
  - **Mekanik Çark / Mandal Sesi ("Çıt Çıt Çıt"):** Tarih tamburu kaydırılırken her bir gün, ay veya yıl öğesi merkez seçim penceresinden geçerken son derece gerçekçi, net ve akustik olarak tatmin edici mekanik mandal (ratchet wheel / rotary bezel click) tıkırtı sesi entegre edildi.
  - **Sıfır Gecikmeli (Zero-Latency) Android Donanım Ses Motoru (`SoundPool`):** 60 FPS kaydırma akıcılığını korumak ve ses gecikmesini 0ms seviyesinde tutmak amacıyla RAM üzerinde önceden çözülmüş 16-bit PCM ses örneği (`res/raw/wheel_tick.wav`) ve 6 eşzamanlı ses akış kanalı (`SoundPool`, maxStreams: 6) mimarisi kuruldu.
  - **Hızlı Fırlatmalarda Akustik Koruma (Acoustic Throttle):** 25ms koruma penceresi (`WHEEL_SOUND_THROTTLE_MS = 25ms`) ile yüksek hızlı kaydırmalarda ses boğulması ve aşırı doygunluk önlenirken 40Hz frekansa kadar gerçekçi mekanik dişli hissi sunuldu.
  - **Eşzamanlı Ses & Dokunsal Geri Bildirim:** `WheelColumn.tsx` içerisindeki görsel odaklanma animasyonu, haptik titreşim darbesi (`selection`) ve mekanik klik sesi mikro-saniye hassasiyetinde birleştirilerek tam teşekküllü fiziksel bir mekanik kadran deneyimi oluşturuldu.
  - **Android Sistem Sesi Fallback Mekanizması:** Donanım ses havuzu yüklenme aşamasında veya kaynak bulunamadığında `AudioManager.playSoundEffect(SoundEffectConstants.CLICK)` ile kesintisiz yedek ses desteği sağlandı.
  - **Kaynak & Bellek Temizliği:** React Native bağlamı yok edildiğinde `SoundPool` otomatik serbest bırakılarak (`release`) bellek sızıntısı riski sıfırlandı.

## [2.1.2] - 2026-09-06
### Fixed
- **Koyu Mod Kan Grubu Kontrastı & Okunabilirlik Optimizasyonu (`MedicalIdModal.tsx`):**
  - **Karanlık Temada Görünmezlik Hatası Giderildi:** Koyu temada unselected kan grubu butonlarının (`A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `0+`, `0-`) metin renginin tanımsız olması sebebiyle siyah görünerek koyu lacivert kart arka planında kaybolması sorunu çözüldü.
  - **WCAG AAA Yüksek Kontrast Desteği:** Seçili olmayan butonlar için koyu modda `#334155` (Slate-700) zemin, `#475569` (Slate-600) kenarlık ve `#F8FAFC` (Slate-50) parlak beyaz metin (kontrast oranı: 11.8:1); açık modda `#F1F5F9` zemin, `#CBD5E1` kenarlık ve `#1E293B` metin tanımlandı.
  - **Klinik Vurgulu Seçim Durumu:** Seçilen kan grubu için acil durum tıbbi kırmızı zemin (`#DC2626`), koyu kırmızı sınır (`#B91C1C`) ve kalın beyaz tipografi (`#FFFFFF`, font weight `700`) ile anında ayırt edilebilir görsel teyit sağlandı.
  - **Erişilebilirlik (A11y) & Dokunma Ergonomisi:** Butonlara `accessibilityRole="button"`, `accessibilityState={{ selected }}` ve yerelleştirilmiş TalkBack etiketleri (`"A+ kan grubu"`) eklendi; minimum dokunma alanı `minWidth: 44px` ve dikey merkezleme ile güçlendirildi.
  - **Form Ayırıcı Uyumlaştırması:** `addContactBlock` üst ayırıcı çizgisi koyu temaya duyarlı hale getirildi (`isDark ? '#334155' : '#CBD5E1'`).

## [2.1.1] - 2026-09-06
### Fixed
- **Çark Kaydırma & Momentum Koruma Optimizasyonu (`WheelColumn.tsx`):**
  - **Geri Sekme / Yanlış Yıla Atlama Hatası Çözüldü:** Kullanıcı tekeri 1989'a doğru kaydırırken Android `velocity.y` değerinin `undefined` dönmesi sebebiyle `onScrollEndDrag` anında parmağın kalktığı ara koordinatta (1985) momentumu erken durduran ve yapay `scrollToOffset` ile geri fırlatan mantık hatası tamamen giderildi.
  - **Android `OverScroller` Uyumlu Deterministik `snapOffsets`:** Önceden kullanılan çakışmalı `snapToAlignment="center"` kaldırıldı; her satırın tam koordinatını hesaplayan `snapToOffsets` dizisi entegre edilerek yerel donanım ivmeli sönümleme sağlandı.
  - **Canlı ve Akıcı (60 FPS) Görsel Odaklama:** Donuk ve hareketsiz görünen statik render yerine, kaydırma sırasında parmağın altındaki ortadaki satırın gerçek zamanlı olarak büyümesini (`tier 0, 1, 2`) sağlayan hafifletilmiş yerel indeks (`localIndex`) durum takibi ve hız kısıtlamalı haptik geri bildirim eklendi.
  - **Akıllı `settle()` ve Sınır Koruması:** Teker doğal duruş noktasına ulaştığında hedef indeks zaten geçerli sınırlar içindeyse yapay kaydırma çağrılmayarak sıfır titreşimli, doğal ve ipeksi bir duruş sağlandı.
  - **FlatList Performans & Batching Optimizasyonu:** `windowSize={11}`, `initialNumToRender=30`, `maxToRenderPerBatch=30` ve `updateCellsBatchingPeriod=16` ile hızlı kaydırmalarda boş hücre oluşması ve takılmalar önlendi.
  - **Ebeveyn State İzolasyonu (`WheelDatePicker.tsx`):** Seçim işleyicileri `useRef` ve `useCallback` ile referans olarak donduruldu; bir sütun kaydırılırken diğer sütunların gereksiz yere render olması engellendi.

## [2.1.0] - 2026-09-06
### Added
- **Özel 3 Sütunlu Çark / Tambur Doğum Tarihi Seçici (`WheelDatePickerModal.tsx` & `WheelDatePicker.tsx`):**
  - Kullanıcı referans görseliyle %100 birebir uyumlu, koyu pencereli (`#1E293B`), ortasında çift camgöbeği (`#38BDF8`) seçim çizgisi ve dokunmatik sönümlemeli 3 sütunlu dikey tambur (wheel/drum) tarih seçici mimarisi geliştirildi.
  - Gün (`1..31`), Ay (`Oca..Ara` / `Jan..Dec`), Yıl (`1901..2026`, 125 yıllık dinamik pencere) bağımsız kaydırmalı tamburlar.
  - Seçilen doğum tarihine göre anlık yaş rozeti (`"46 Yaşında"`) hesaplama ve görsel teyit.
  - Acil Tıbbi Kimlik Kartı (`MedicalIdModal.tsx`) içerisine entegre edildi; eski `DateTimePicker` ve kuşak çipleri emekliye ayrıldı.
  - TalkBack erişilebilirlik entegrasyonu: Sütun bazlı tek düğümlü `accessibilityRole="adjustable"` ve tek parmak yukarı/aşağı kaydırmayla değer artırma/azaltma.
  - Haptic geri bildirim (`triggerHapticTick` & 70ms hız sınırlayıcı).

### Fixed
- **Android Sistem Dili ile Uygulama Dili Ayrımı:** Yerel `DateTimePicker` bileşeninin uygulama dili Türkçe seçilse dahi Android OS dilinde açılması engellendi; statik Türkçe ve İngilizce ay dizileriyle tam dil tutarlılığı sağlandı.
- **Tarih Kayması & UTC/Zaman Dilimi Güvenliği (`dateParts.ts`):** `new Date()` nesnesinin UTC+3 diliminde gün kayması ve artık yıl kırılmaları yaratmasını önlemek amacıyla saf tam sayı aritmetiği (`year, month, day`) ve Gregoryen artık yıl formülü uygulandı.
- **Yıl Değerleri Görünümü:** Tambur listesinde indeks yerine 4 basamaklı gerçek takvim yılları (`1978, 1979, 1980...`) eksiksiz eşleştirildi.

## [2.0.2] - 2026-09-06
### Added
- **Acil Tıbbi Kimlik Doğum Tarihi Seçici & Kuşak Atlama Motoru (`MedicalIdModal.tsx`):**
  - Manuel metin girişinin (`YYYY-AA-GG`) yerini alan modern, erişilebilir ve yerel `DateTimePicker` (`@react-native-community/datetimepicker`) bileşeni entegre edildi.
  - **Akıllı Başlangıç Yılı:** Tarih girilmemişse takvim 2026 yerine yetişkin/yaşlı hastalar için ideal referans olan 1980 yılından başlatılır; yüzlerce ay geriye kaydırma zorunluluğu ortadan kaldırıldı.
  - **Hızlı Yıl Kuşağı (Decade Chips):** `1940'lar`, `1950'ler`, `1960'lar`, `1970'ler`, `1980'ler`, `1990'lar`, `2000'ler` yatay kayar butonlarıyla tek dokunuşla ilgili döneme atlama ve takvim açma desteği sağlandı.
  - **Anlık Yaş Rozeti:** Seçilen doğum tarihi üzerinden hesaplanan yaş (`56 Yaşında`) rozet olarak anında gösterilerek kullanıcı teyidi sağlandı.
  - **Profil Görüntüleme Zenginleştirmesi:** Okuma modunda doğum tarihi biçimlendirilmiş Türkçe metin ve yaş bilgisiyle (`Doğum: 15 Ocak 1970 (56 yaş)`) sunuldu.
  - Tek dokunuşla doğum tarihini sıfırlayan temizleme butonu (`close-circle`) eklendi.

## [2.0.1] - 2026-09-06
### Added
- **DirectBoot DE Depolama Temizliği (`DirectBootAlarmHelper.kt` & `AlarmModule.kt`):** `clearAllAlarms` metodu eklenerek tüm alarmlar iptal edildiğinde veya veriler sıfırlandığında Device Protected Storage (DE) alanındaki `direct_boot_alarms` temizliği güvenceye alındı; silinen alarmların cihaz yeniden başladığında hortlaması (zombie alarms) engellendi.
- **Yerel Alarm & Tam Ekran İzin Köprüleri (`AlarmModule.kt` & `nativeAlarm.ts`):** `cancelAllNativeAlarms`, `clearAllDirectBootAlarms`, `canUseFullScreenIntent` ve `openFullScreenIntentSettings` native köprüleri sisteme kazandırıldı.
- **3 Dakikalık Otomatik Erteleme Koruması (`useAlarmController.ts`):** Alarm çaldığında kullanıcının müdahale etmemesi durumunda alarmın sonsuza kadar çalarak pili bitirmesini ve cihazı aşırı ısıtmasını önleyen 180 saniyelik (`AUTO_SNOOZE_TIMEOUT_MS = 180_000`) otomatik erteleme koruması devreye alındı.

### Changed
- **Çift Ses & Yankı Önleme (Audio Loop Race Fix - `schedule.ts`):** Tam ekran alarm tetiklendiğinde Notifee taşıyıcı bildirimindeki `loopSound: true` bayrağı `loopSound: false` yapılarak ses döngüsünün kontrolü tamamen `AlarmScreen` / `useAlarmController` ses motoruna devredildi; Notifee ile React Native arasındaki çift ses çalma ve yankı yarışı ortadan kaldırıldı.
- **Alarm İptal Zinciri Senkronizasyonu (`cancel.ts` & `actions.ts`):** `cancelMedicineNotifications` doğrudan `cancelNotification` üzerinden hem Notifee hem native `AlarmManager` alarmlarını iptal edecek şekilde güncellendi; `cancelAllNotifications` içine native alarm iptali entegre edildi.
- **Yetim Önbellek Anahtarlarının Temizlenmesi (`builders.ts`):** `MEDICINE_STORE_STORAGE_KEYS` içine `'medicine-storage'`, `'ilac_medical_id_v1'`, `'ilac_symptom_logs_v1'` ve `'@ilachatirlatici_prescriptions_v1'` eklenerek verilerin sıfırlanması veya hesap silme durumunda tüm AsyncStorage alanlarının eksiksiz temizlenmesi sağlandı.

### Fixed
- **Firestore `updatedAt` Timestamp Tip Uyuşmazlığı (`firestoreSync.ts`):** Firestore'dan gelen `Timestamp` nesneleri (`toDate()` veya `{ seconds, nanoseconds }`) ISO string formatına dönüştürülerek TypeScript tip sözleşmesi ve zaman damgası mutabakatı güvenceye alındı.

## [2.0.0] - 2026-09-06
### Added
- **TİTCK Genişletilmiş İlaç-Gıda Etkileşim Motoru (`clinicalSafetyEngine.ts`):** Potasyum zengini gıdalar (ACE/ARB), K Vitamini / Yeşil yapraklı sebzeler (Warfarin/Coumadin) ve Tiramin içerikli gıdalar (MAO inhibitörleri) için klinik etkileşim kuralları ve hasta rehberliği eklendi.
- **Acil Durum Tıbbi Kimlik Kartı (ICE - In Case of Emergency - `medicalIdStore.ts` & `MedicalIdModal.tsx`):**
  - Kan grubu (A+, B+, AB+, 0+, Rh+/-), kronik hastalıklar, kayıtlı alerjiler ve özel protez/kalp pili notları.
  - Tek dokunuşla 112 Acil Çağrı Merkezi ve acil irtibat kişilerini arama entegrasyonu.
  - Kilit ekranında açık rıza ile tıbbi kimlik gösterme tercihi ve yerel şifrelenmiş kalıcı depolama (`ilac_medical_id_v1`).
- **Vital Bulgular & İlaç Korelasyon Kartı (`VitalCorrelationCard.tsx`):**
  - İlaç tedavisiyle eşzamanlı tansiyon (sistolik/diyastolik), açlık/tokluk kan şekeri ve nabız trend analizi.
  - İlaç uyum skoru (`adherence`) ile vital ölçümler arasındaki klinik korelasyon özeti ve doğrudan semptom/ölçüm ekleme kısayolu.
- **Kapsamlı Test Kapsamı:** Toplam 212 test paketi ve 2.211 birim/entegrasyon/stres testi (%100 yeşil, 0 hata).
- **SemVer Major Sürüm Yükseltmesi:** `v2.0.0` (Android `versionCode: 72`).

## [1.9.4] - 2026-09-06
### Added
- **Hayati İlaç Ses Seviyesi İadesi (Volume Restore Engine - `AlarmModule.kt` & `nativeAlarm.ts`):** Alarm susturulduğunda veya kullanıcı dozu onayladığında/ertelediğinde, duyulabilirlik amacıyla yükseltilmiş olan `STREAM_ALARM` ses seviyesi otomatik olarak kullanıcının önceki ses tercihine iade edilir.
- **Kritik İlaç Dinamik Ses Eşiği:** Hayati (`isCritical`) işaretli ilaçlarda alarm çaldığı anda minimum güvenli ses tabanı %80'e yükseltilir (standart ilaçlarda %70).
- **Alarm Ekranı Güvenlik Rozeti (`AlarmMedicineCard.tsx`):** Kritik ilaçlarda kalkan rozeti "Hayati İlaç — Israrlı Alarm & Ses Kalkanı" olarak güncellendi.
- **Volume Restore Birim Testleri (`directBootAlarm.test.ts`):** 3 yeni birim testi eklendi (toplam 12 test %100 yeşil).

## [1.9.3] - 2026-09-06
### Added
- **DirectBoot Sentinel — Device Protected Storage (DE) Aynalama (`DirectBootAlarmHelper.kt`):** Cihaz yeniden başladığında kullanıcı ilk kilit açmayı (PIN/desen) yapana kadar kilitli kalan Credential Encrypted (CE) depolama engelini aşmak için `createDeviceProtectedStorageContext()` ile şifrelenmemiş SharedPreferences aynası oluşturuldu.
- **Kilit Açılmadan Önce Otomatik Kernel Alarm Kurulumu (`BootReceiver.kt`):** `LOCKED_BOOT_COMPLETED` veya `BOOT_COMPLETED` alındığında React Native ve HeadlessJS'in başlatılmasını beklemeden DE alanındaki tüm geçerli alarmlar doğrudan `AlarmManager.setAlarmClock` ile kurulur.
- **Kritik Alarm Ses Seviyesi Kalkanı (`AlarmModule.kt` & `nativeAlarm.ts`):** `ensureSafeAlarmVolume` ve `getAlarmStreamVolume` native köprüleri eklendi. Alarm tetiklendiğinde `STREAM_ALARM` ses seviyesi sıfırsa veya çok kısıksa otomatik olarak güvenli %70 seviyesine yükseltilir (`useAlarmController.ts`).
- **DirectBoot & Volume Shield Birim Testleri (`directBootAlarm.test.ts`):** 9 yeni birim testi eklendi; toplam test paketi 209'a, test sayısı 2.195'e yükseldi (%100 yeşil).

---

## [1.9.2] - 2026-09-06
### Added
- **Ana Ekran Alarm İzin & Sağlık Kalkanı (`AlarmHealthBanner.tsx`):** Android 12+ kesin alarm (`canScheduleExactAlarms`), Android 14+ kilit ekranında tam ekran alarm (`canUseFullScreenIntent`), bildirim izni veya pil optimizasyonu muafiyeti kapalı olduğunda Ana Ekranda uyarı gösterilerek tek dokunuşla ilgili üretici/sistem ayarına yönlendirme sağlandı.
- **Alarm Kalkanı & Kaçırılan Doz Kapsamlı Testleri:** `AlarmHealthBanner.test.tsx` (6 test) ve `missedReminders.test.ts` (9 test) eklendi.

### Changed
- **Uygulama Açılışı ve Ön Planda Otomatik Kaçırılan Doz Mutabakatı (`markMissedReminders`):** `useHomeController.ts` (`AppState` active) ve `App.tsx` startup temizliğine `markMissedReminders()` entegre edildi. 60 dakikalık klinik tolerans süresini aşan ve alınmamış dozlar otomatik olarak `missed` işaretlenir, hasta uyum skoru (`adherence.ts`) ve bakıcı canlı senkronizasyonu güncellenir.

### Fixed
- **Özel Gün & Tedavi Bitiş Tarihi Kaçırılan Doz Hatası (`missedReminders.ts`):** `isMedicineScheduledForDate` entegrasyonu ile yalnızca o gün için planlanmış ilaçların (`specificDays`, `intervalDays`, `cycle`, `endDate`) kaçırıldı olarak kaydedilmesi sağlandı; ara günlerdeki ilaçların yanlışlıkla kaçırıldı sayılması engellendi.
- **Kalıcı Bildirim Kapalıyken Ön Plan Yaşam Döngüsü Engeli (`useHomeController.ts`):** `AppState` dinleyicisi kalıcı bildirim ayarından bağımsız hale getirilerek her ön plana gelişte widget yenilenmesi ve mutabakat güvenceye alındı.

---

## [1.7.0] - 2026-08-31
### Added
- **14 Günlük Kayar Ufuk Doz Zamanlama Algoritması (`rollingHorizonScheduler.ts`):** iOS 64 bekleyen yerel bildirim sınırını (`MAX_PENDING = 60`) ve Android aşırı alarm bellek şişmesini engelleyen akıllı kayar pencere projeksiyon motoru.
- **Canlı Alarm & Sistem Teşhis Paneli (`AlarmDiagnosticCard.tsx`):** Ayarlar ekranında `USE_EXACT_ALARM` yetkisi, pil tasarrufu muafiyeti, 14 günlük toplam planlanan doz ve bir sonraki alarmın anlık takibi.
- **5 Saniyelik Canlı Alarm Simülasyonu:** Kullanıcının tek dokunuşla kilit ekranı uyanma ve ses tepkisini anında doğrulayabilmesi.

---

## [1.6.2] - 2026-08-31
### Fixed
- **Tablet ve Navigasyon Çubuğu Güvenli Alan Desteği (`ModalSheet` & `ConfirmDialog`):** Samsung One UI Görev Çubuğu (Taskbar) ve 3 tuşlu Android navigasyon barlarının alt modal butonlarının (`Vazgeç`, `Evet, Erken Aldım`) üzerini kapatması engellendi. `useSafeAreaInsets` ile dinamik alt padding uygulandı (`ModalSheet.tsx`, `TimeSlotModal.tsx`).

---

## [1.6.1] - 2026-08-31
### Added
- **Klinik Erken Doz Güvenlik Kalkanı (Early Dose Guard):** İlaç saatine 45 dakikadan fazla olduğunda kazara alımı ve aşırı doz birikmesini engelleyen akıllı zaman kilidi ve klinik onay penceresi (`CurrentDoseCard.tsx`, `TimelineItem.tsx`).
- **Dinamik Açık/Koyu Mod Korumalı Buton Durumları:** 
  - Vakti gelmemiş ilaçlarda sakin, yüksek kontrastlı ve gözü yormayan `⏳ Erken Al` tasarımı (Açık ve Koyu tema uyumlu).
  - Vakti gelen veya geciken ilaçlarda dikkat çeken `✅ Şimdi Al` birincil yeşil butonu.
- **Akıllı Erteleme Filtresi:** Henüz alarmı çalmamış gelecek ilaçlarda kafa karışıklığını önlemek amacıyla `Ertele` butonu otomatik olarak gizlendi.

### Fixed
- **Bildirim Olay Dinleyicisi Düzeltmesi:** `notifee.cancelNotification` fonksiyonu için güvenli opsiyonel zincirleme koruması (`listeners.ts`).
- **Jest Test Paketleri:** 183 test paketi (1828 test) %100 geçecek şekilde güncellendi ve yeni bileşen testleri eklendi (`CurrentDoseCard.test.tsx`, `TimelineItem.test.tsx`).

---

## [1.6.0] - 2026-08-31
### Added
- **100k Ölçekli Hibrit AI Reçete ve İlaç Okuyucu:** 5 katmanlı akıllı reçete okuma mimarisi (`smartPrescriptionScanner.ts`).
- **Cihaz İçi PII ve KVKK Maskeleme:** Reçete fotoğraflarındaki TCKN, ad, soyad ve hekim bilgileri cihazda otomatik maskelenir (`prescriptionPreprocessService.ts`).
- **TİTCK Levenshtein Güvenlik Doğrulayıcısı:** 18.000+ resmi ilaç veri tabanıyla yazım hatalarını düzelten ve gıda etkileşimlerini eşleyen kalkan (`prescriptionSafetyMatcher.ts`).
- **AI Tarama Kotası & Hız Sınırlayıcı:** Ücretsiz kullanıcılar için günlük 5 tarama, Premium için sınırsız kota yöneticisi (`aiScanRateLimiter.ts`).
- **Klinik Hekim PDF Raporu:** Hasta ilaç geçmişi ve uyum grafiğini tek dokunuşla dışa aktaran resmi hekim rapor modülü (`pdfReportService.ts`).
- **Kristal Bildirim Melodisi:** WhatsApp ve mesajlaşma kalitesinde net ve tatlı bildirim sesi (`sound_crystal_bell`, kanal versiyonu `v7`).

### Fixed
- **3 Kademeli Sahte/Gereksiz Alarm Engelleme Kalkanı:** Günlük tüm dozlar alındığında arka plan veya sistem kaynaklı zamansız alarmların çalması tamamen engellendi (`index.ts`, `App.tsx`, `useAlarmController.ts`).
- **Bildirim Metni Temizliği:** Kayan bildirim gövdesinde ham enum kodu olan `any_time` metninin görünmesi engellendi, Türkçe açıklamalar standardize edildi (`schedule.ts`).
- **Anında Bildirim Kapatma:** Bildirim üzerindeki '✅ Aldım' veya '❌ Atla' butonuna basıldığı anda bildirimin durum çubuğundan anında silinmesi sağlandı (`listeners.ts`, `App.tsx`, `index.ts`).

### Security
- **6 Vektörlü Güvenlik ve Penetrasyon Denetimi:** XSS, SQLi/NoSQLi, ReDoS, KVKK/HIPAA, Şifreli Kasa (`healthVaultCrypto`) ve Android Network Security onaylandı.

---

## [1.5.0] - 2026-08-25
### Added
- **Refakatçi & Bakıcı Canlı Takip Modülü:** Firestore üzerinden anlık ilaç alma/atlama bildirimleri ve FCM High Priority uyarıları.
- **Acil Durum (SOS) ve Panik Butonu:** Yakınlara anında konum ve acil durum bildirimi fırlatan kalkan.
- **Doze Mode & Samsung/Xiaomi Pil Koruma Kalkanı:** Android 14/15 `USE_EXACT_ALARM` ve kilit ekranı tam ekran uyandırma entegrasyonu.

### Changed
- Ana ekran kart tasarımları ve günlük doz ilerleme çubuğu modernleştirildi.
- Alarm melodileri için 6 farklı frekans ayarlı stüdyo sesi eklendi.

### Security
- Biyometrik (Parmak İzi / Yüz Tanıma) ve 6 Haneli PIN Kodu güvenlik kapısı (`useSecurityGate.ts`).
