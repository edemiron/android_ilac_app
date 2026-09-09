# ⚖️ Teknik Sözleşme — Wheel/Spinner Date Picker (Tambur Tarih Seçici)

| Alan | Değer |
| :--- | :--- |
| **Sözleşme No** | `TS-2026-09-06-WHEELDATE` |
| **Hazırlayan** | ⚡ Qwen 3.8 Max — Baş Mimar, Kodlama Otoritesi & Baş Denetçi |
| **Tarih** | 2026-09-06 |
| **Hedef Sürüm** | `v2.1.0` (MINOR) / `versionCode 75` |
| **İcracı** | 🛡️ Anti Agent (Antigravity) |
| **Klinik/Android Onayı** | 🧠 ZCode (GLM-5.3 Flash High) — §12'deki 6 soruya cevap bekleniyor |
| **Durum** | ✅ Mimari onaylandı — icraya hazır |
| **Kapsam** | `WheelColumn` jenerik primitifi, `WheelDatePicker`, `WheelDatePickerModal`, `domain/dateParts`, `domain/wheelDateModel`, `MedicalIdModal` entegrasyonu |

---

## 0. Keşif Bulguları — Sözleşme Bu Kanıtlara Dayanır

Bu sözleşme spekülasyon değil, deponun canlı durumunun okunmasıyla yazılmıştır. Tespit edilen ve tasarımı **doğrudan şekillendiren** bulgular:

### 0.1 Depoda zaten bir tambur seçici var (ve yeniden kullanılamaz durumda)
`mobile/src/components/common/WheelTimePicker.tsx` — `FlatList` + `snapToInterval` tabanlı, **Reanimated kullanmayan** bir saat/dakika tamburu. 5 yerden çağrılıyor:
`ReminderTimes.tsx:105`, `QuietHoursSection.tsx:93,116`, `DailyScheduleSection.tsx:63,83`.

Ancak bu bileşen tarih seçimine **genişletilemez**, çünkü:
- `WheelColumn` modül-içi (export edilmemiş), `data: number[]` ile sınırlı, `ITEM_HEIGHT`/`VISIBLE_COUNT` sabit.
- Renkler hardcoded hex (`isDark ? '#475569' : '#CBD5E1'`) — token sistemini baypas ediyor.
- **Sıfır erişilebilirlik özelliği var.** Tek bir `accessibilityRole`/`Label`/`State` yok (bkz. §9, BUG-9).
- Ay adı gibi metin etiketleri, dinamik liste uzunluğu ve devre dışı öğe kavramı yok.

### 0.2 Reanimated/Gesture Handler kurulu ama depoda HİÇ kullanılmıyor
`react-native-reanimated ~4.1.0`, `react-native-worklets 0.8.1`, `react-native-gesture-handler ~2.28.0` kurulu;
`App.tsx:1572`'de `GestureHandlerRootView` en dışta doğru şekilde sarılmış; `babel.config.js` worklets plugin'ini **son sırada** içeriyor.

**Ama** `mobile/src/` genelinde `useSharedValue`, `useAnimatedStyle`, `withSpring`, `Gesture.Pan`, `GestureDetector`, `useAnimatedScrollHandler` için **sıfır eşleşme** var. Kullanılan tek animasyon katmanı `MotiView` (8 dosya) ve `theme/moti-config.ts` preset'leri.

Kritik kısıt — `mobile/jest.setup.js` Reanimated'ı resmi mock yerine elle yazılmış bir **noop** ile mockluyor:
```js
useSharedValue: (v) => ({ value: v }),
useAnimatedStyle: (cb) => cb(),     // <-- eager değerlendirme
withTiming: (v) => v, withSpring: (v) => v,
```
→ Reanimated ile yazılan hiçbir yay/snap fiziği **test edilemez**. Animasyonlar özdeşlik fonksiyonuna indirgeniyor.

### 0.3 Uygulama zaten "native picker → wheel" göçünün ortasında
`@react-native-community/datetimepicker` 6 dosyada görünüyor, ama **5'i yalnızca `DateTimePickerEvent` TİPİNİ** import ediyor ve sahte event objeleri sentezliyor:
```ts
onWakeUpChange({ type: 'set', ... } as unknown as DateTimePickerEvent);   // DailyScheduleSection.tsx:74
```
Gerçek native `<DateTimePicker>` bileşenini render eden **yalnızca 2 yer** kaldı:
1. `MedicalIdModal.tsx:550` — doğum tarihi (**bu görev**)
2. `ExpirySection.tsx:188` — ilaç son kullanma tarihi

→ Bu bir "tek seferlik doğum tarihi bileşeni" değildir. **İkinci bir tüketicisi hazır olan jenerik bir tarih tamburu** tasarlanmalıdır. `ExpirySection` zıt yönde bir aralık kullanıyor (`minimumDate={new Date()}` — yalnızca gelecek), bu da aralık modelinin iki yönlü olması gerektiğini kanıtlıyor.

### 0.4 🔴 Kök neden bulgusu — kullanıcının ekran görüntüsündeki "Jan/Oca" tutarsızlığı
`ExpirySection.tsx:194` native picker'a `locale={language === 'tr' ? 'tr-TR' : 'en-US'}` geçiyor.
`MedicalIdModal.tsx:549-557` ise **hiç `locale` prop'u geçmiyor.**

```tsx
<DateTimePicker
  value={getInitialDatePickerDate()}
  mode="date"
  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
  maximumDate={new Date()}
  minimumDate={new Date(1910, 0, 1)}
  onChange={handleDateChange}
/>   // <-- locale YOK
```

Sonuç: doğum tarihi seçicisi **cihaz yerel ayarına** göre render oluyor, uygulama diline göre değil. Cihaz dili İngilizce, uygulama dili Türkçe olan bir kullanıcı Türkçe formun içinde `Jan/Feb/Mar` görür. Kullanıcının tarif ettiği "Jan/Oca" karışıklığının en olası teknik açıklaması budur.

**Bu sözleşme bu hata sınıfını yapısal olarak ortadan kaldırır:** ay etiketleri uygulama dilinden (`useLanguage()`) türetilen **statik const dizilerdir**, cihaz locale'ine ve `Date` nesnesine hiç dokunulmaz (bkz. INV-1, §5.3).

### 0.5 Depoda gün-sayısı/artık-yıl yardımcısı YOK
`daysInMonth`, `isLeapYear`, `getDaysInMonth` için `mobile/src/` genelinde **sıfır eşleşme**. `mobile/src/utils/dateUtils.ts` ve `mobile/src/helpers/` dizini **mevcut değil**. Tek inline kullanım `MonthCalendarView.tsx:53-66`'da `eachDayOfInterval({start: startOfMonth(...), end: endOfMonth(...)})` — yani takvim üretimi için `Date` nesnesi kuruyor.

### 0.6 UTC gün tuzağı bu deponun belgelenmiş üretim hatası sınıfıdır
`mobile/eslint.config.mjs`, `toISOString().split('T')[0]` desenini **proje genelinde `error` seviyesinde** yasaklıyor. Kural mesajı gerçek üretim hatalarını listeliyor:
> *"cok dozlu ilacin dozu yanlis gune yazildi, islenmis alarm anahtari kaydi, bakici takibi yanlis gunu izledi, `endDate` bir gun erken doldu (ve v1.7.7'den beri `endDate` alarmi SUSTURUYOR)"*

Türkiye UTC+3 olduğundan 00:00–03:00 arası önceki güne çözülüyor. **Bu sözleşme, seçicinin içinde tek bir `Date` nesnesi bile kurulmasını yasaklayarak bu hata sınıfını yapısal olarak imkânsız kılar.**

### 0.7 Test altyapısı gerçekleri
`mobile/jest.config.js`: `testEnvironment: 'node'` (jsdom **değil**), `setupFilesAfterEnv: ['<rootDir>/jest.setup.js']`.
`WheelTimePicker.test.tsx` `react-native`'i elle mockluyor ve `FlatList`'i **tüm öğeleri eager render** eden bir bileşene indirgiyor → kaydırma/snap fiziği test edilemez, yalnızca ayrık sonuçlar doğrulanabilir.
`mobile/src/__tests__/helpers/themeMock.ts` → `createThemeMock()` / `mockUseTheme()` gerçek `lightColors`/`darkColors`'ı import ediyor; **18 test dosyası bunu kullanıyor** ve tercih edilen yol bu.

---

## 1. Mimari Karar Kaydı (ADR)

### ADR-01 — Kaydırma motoru: `FlatList` + `snapToInterval` (Reanimated DEĞİL)

| Ölçüt | FlatList + snap | Reanimated worklets + `Gesture.Pan` |
| :--- | :--- | :--- |
| Depoda emsal | ✅ `WheelTimePicker` fiziksel cihazlarda çalışıyor | ❌ Sıfır kullanım — ilk olurdu |
| Test edilebilirlik | ✅ Ayrık sonuçlar doğrulanabilir | ❌ jest mock'u fiziği özdeşliğe indirgiyor |
| Risk | Düşük | Yüksek — `GestureHandlerRootView` + `Modal` etkileşimi doğrulanmamış |
| Performans | Yeterli (bkz. §7 kovalama stratejisi) | Teorik olarak üstün |

**Karar: `FlatList` + `snapToInterval`.**

**Gerekçe:** Reanimated'ın teorik üstünlüğü (UI thread'inde kesintisiz transform) bu projede **doğrulanamaz**. `jest.setup.js`'in noop mock'u, yay fiziğiyle yazılan bir bileşenin regresyon testinin yazılamaması demektir. İlaç hatırlatıcı gibi kritik bir uygulamada *test edilemeyen* bir etkileşim motoru, *biraz daha az akıcı ama test edilebilir* bir motora tercih edilemez. Ayrıca `WheelTimePicker` aynı yaklaşımın Samsung Galaxy Tab S7 FE'de çalıştığını zaten kanıtlamış durumda.

**Kayıt:** `GestureHandlerRootView` zaten `App.tsx:1572`'de mevcut, dolayısıyla bu karar teknik bir engel değil, bilinçli bir risk/kazanç tercihidir. İleride Reanimated'a geçilirse `WheelColumn`'un iç yapısı değişir, **public API'si değişmez** (§4).

### ADR-02 — Sabit uzunluklu sütunlar + "devre dışı öğe" modeli (değişken uzunluk DEĞİL)

Tambur seçicilerde gün sayısını yönetmenin iki yolu vardır:

**Seçenek A — Değişken uzunluk (reddedildi):** Şubat'ta gün listesi `[1..28]` olur. Liste uzunluğu ay değiştikçe değişir.
> Sonuç: `data` ve `snapToOffsets` dizilerinin kimliği her ay değişiminde yenilenir → FlatList prop değişikliği → kaydırma konumu içerik uzunluğunun dışına düşebilir (`31*48 = 1488px` offset, `28*48 = 1344px` içerik) → RN offset'i kırpar → görünür sıçrama/boş satır titremesi. Bunu çözmek için sütunu `key` ile yeniden monte etmek gerekir, bu da kaydırma konumunu kaybettirir ve flaş yaratır.

**Seçenek B — Sabit uzunluk + devre dışı öğe (KABUL EDİLDİ):** Gün sütunu **her zaman** `[1..31]`, ay sütunu **her zaman** `[1..12]`, yıl sütunu **her zaman** `[minYear..maxYear]`. Geçersiz değerler listeden *çıkarılmaz*, **soluk + seçilemez** olarak render edilir.

**Karar: Seçenek B.**

**Gerekçe:**
1. `data`, `labels`, `snapToInterval`, `getItemLayout` ve öğe sayısı **etkileşim boyunca asla değişmez**. §7'deki tüm referans-kararlılığı ve kaydırma-sıfırlanması tehlikeleri *yapısal olarak* ortadan kalkar — kodla korunmalarına gerek kalmaz.
2. Kullanıcı 31'in neden seçilemediğini **görür**. Kör bir şekilde kaybolan bir seçenek yerine soluk bir seçenek, özellikle yaşlı hastalar için çok daha anlaşılırdır.
3. Erişilebilirlik için doğru modeli verir: TalkBack `"31, kullanılamaz"` diyebilir (§8).
4. Sınırlandırılmış aralık modeliyle (§5.2) doğal olarak birleşir — `ExpirySection`'ın "bugünden önce seçilemez" kuralı aynı mekanizmayla ifade edilir.

**Değişen tek şey** hangi indekslerin *etkin* olduğudur. Bu da iki tamsayıyla temsil edilir (§5.4), diziyle değil — böylece `React.memo` satırların çoğunu atlar.

### ADR-03 — Durum yönetimi: saf `useReducer`, kaydırma fiziğinden ayrık

Gün-klampalama mantığı bir **saf, toplam (total), birim-test edilebilir redüksiyon fonksiyonu** olarak `domain/` katmanına konur. Kaydırma/snap kodu bunu yalnızca çağırır; klampalama kuralları hakkında hiçbir şey bilmez.

**Gerekçe:** "Artık yıl + 28/30/31 dinamik senkronizasyonu" bu görevin algoritmik çekirdeğidir ve **kaydırma olaylarından bağımsız olarak** test edilebilmelidir. `jest.setup.js` FlatList'i eager mockladığı için fizik test edilemiyor; ama redüksiyon fonksiyonu saf olduğundan 1900/2000/2100/2024 artık yılları, ay sınırları ve klamp kaskadları **RN mock'u olmadan** `testEnvironment: 'node'` altında eksiksiz doğrulanabilir.

### ADR-04 — İki katmanlı bileşen ayrımı: presentational gövde + ince modal kabuğu

Depoda iki çakışan konvansiyon var: `ModalSheet`/`OptionPicker` `useTheme()` çağırıyor; `MedicalIdModal`/`MonthCalendarView` `colors`/`isDark`/`language`'ı **prop olarak** alıyor (test edilebilir yaprak bileşen kalıbı).

**Karar:** Çakışma bölünerek çözülür.
- `WheelDatePicker` — presentational. `colors`, `isDark`, `isTr` **prop olarak enjekte edilir**. Context bağımlılığı yok → `themeMock.ts` ile trivial test edilir.
- `WheelDatePickerModal` — ince kabuk. `ModalSheet`'i kullanır ve context'ten beslenir.

**Gerekçe:** Algoritmik olarak yoğun olan ve test edilmesi gereken katman `WheelDatePicker`'dır. Context'i oradan çıkarmak, testleri `jest.mock('../../contexts/...')` cambazlığından kurtarır.

### ADR-05 — `ModalSheet` yeniden kullanılır, yeni kabuk yazılmaz

`ModalSheet` (`components/common/ModalSheet.tsx`) kanonik alt sayfa kabuğudur: `animationType="slide"`, `statusBarTranslucent`, `useSafeAreaInsets()` ile `bottomPadding = Math.max(insets.bottom, 20) + 24`, `radius.xl` üst köşeler, backdrop `Pressable` → `onClose`, ve yapışkan alt bilgi için `actions` slotu. Kullanıcının tarif ettiği **İptal (sol) / Tamam (sağ)** düzeni doğrudan `actions` slotuna oturur.

`WheelTimePickerModal` bundan **önce** yazılmış ve kabuğu `animationType="fade"` ile (alt-çıpalı bir sayfa için tutarsız) yeniden üretmiştir. Bu sözleşme o hatayı tekrarlamaz.

### ADR-06 — Mevcut `WheelTimePicker` bu sürümde DEĞİŞTİRİLMEZ

Yeni `WheelColumn` primitifi, mevcut `WheelTimePicker`'ın içindeki kopyasını **faz 2'de** tüketmek üzere tasarlanır. Faz 1'de mevcut dosyaya dokunulmaz.

**Gerekçe:** `WheelTimePickerModal` **ilaç hatırlatma zamanlama yolunda** 5 yerden çağrılıyor (`ReminderTimes` dahil). Kullanıcıya bu sürümde hiçbir fayda sağlamayan bir refactor için alarm/doz yolunu regresyon riskine açmak, sürüm güvenliği ilkesine aykırıdır. Geçici kod tekrarı **bilinçli ve takip edilen** bir borçtur (§11, faz 2).

**Zorunlu koşul:** Yeni `WheelColumn`'un API'si, faz 2 göçünün *drop-in* olmasını sağlayacak şekilde jenerik tasarlanmalıdır (`label` tabanlı, sayıya özel değil).

### ADR-07 — Zod KULLANILMAZ

`zod ^4.3.6` kurulu ama depoda **tek bir dosyada** var: `utils/syncDataValidator.ts`, ve başlık yorumu kapsamını açıkça *"cloud sync'ten gelen veriyi doğrulamak"* olarak tanımlıyor. `medicalIdStore.ts`'te sıfır zod var; UI-katmanı tarih doğrulaması regex + `date-fns` `parse`/`isValid` veya düz TS union tipleriyle (`BloodType` kalıbı) yapılıyor.

**Karar:** Bir UI bileşeni için zod şeması tanıtmak, depodaki **ikinci** ve sync-sınırı dışındaki **ilk** zod kullanımı olurdu — konvansiyon dışı. Bunun yerine **ayrıştırılmış birleşim (discriminated union)** döndüren saf bir doğrulayıcı kullanılır (§5.6). Bu hem Strict TypeScript zorunluluğuna uyar hem de hata kodlarını tüketicinin `switch` ile tüketmesine olanak tanır.

---

## 2. Modül Haritası

```
mobile/src/domain/                          # saf mantık — React Native importu YASAK
├── dateParts.ts                            # YENİ — DateParts, artık yıl, ISO dönüşümü
└── wheelDateModel.ts                       # YENİ — DateRange, sütun modelleri, reducer, doğrulama

mobile/src/components/common/wheel/         # YENİ dizin
├── index.ts                                # barrel
├── constants.ts                            # ITEM_HEIGHT, VISIBLE_COUNT, GUTTER, tier eşikleri
├── WheelItem.tsx                           # React.memo satır
├── WheelColumn.tsx                         # jenerik tek sütun: FlatList + snap + a11y adjustable
├── WheelDatePicker.tsx                     # 3 sütun + reducer (presentational, prop-enjekte)
├── WheelDatePickerModal.tsx                # ModalSheet kabuğu + İptal/Tamam
└── useScreenReader.ts                      # AccessibilityInfo hook (cleanup'lı)

mobile/src/components/medicalId/MedicalIdModal.tsx   # DEĞİŞTİRİLİR — §10.1
mobile/src/components/common/index.ts                # DEĞİŞTİRİLİR — barrel'e ekle

mobile/src/__tests__/
├── domain/dateParts.test.ts                         # YENİ
├── domain/wheelDateModel.test.ts                    # YENİ — kritik kütle burada
└── components/common/WheelDatePicker.test.tsx       # YENİ
```

**Katman kuralı (bağlayıcı):** `domain/dateParts.ts` ve `domain/wheelDateModel.ts` **yalnızca** TypeScript import edebilir. `react`, `react-native`, `date-fns` importu **yasaktır**. Bu kural, saf mantığın `testEnvironment: 'node'` altında hiçbir mock olmadan test edilmesini garanti eder.

> `date-fns` yasağının gerekçesi: `getDaysInMonth()` bir `Date` ister ve `new Date(year, month, 1)` kurmak hem INV-1'i ihlal eder hem de JS'in `new Date(50, 0, 1) → 1950` iki-basamaklı yıl tuzağını taşır. Artık yıl mantığı üç satırlık saf tamsayı aritmetiğidir; bir bağımlılığa gerek yoktur.

---

## 3. Adlandırma ve Dil Konvansiyonları

| Konu | Zorunluluk |
| :--- | :--- |
| Dosya/bileşen adı | `PascalCase.tsx`, mevcut `WheelTimePicker` kalıbıyla uyumlu |
| Sabitler | `SCREAMING_SNAKE_CASE`, modül seviyesi, `as const` |
| Tip adları | `DateParts`, `DateRange`, `WheelColumnModel` — `I` öneki **yasak** |
| Kod yorumları | Türkçe (depo konvansiyonu) — `WheelTimePicker.tsx` ile aynı stil |
| `it()` test başlıkları | İngilizce (depo konvansiyonu — `MedicalIdModal.test.tsx` ile aynı) |
| Renk | **Yalnızca** `colors.*` token'ları + `withAlpha()`/`ALPHA` (`utils/colors.ts`). Hardcoded hex **yasak** |
| Boşluk/yarıçap/gölge | `theme/tokens.ts` → `spacing`, `radius`, `elevation` |
| Animasyon süreleri | `theme/moti-config.ts` → `motiTransitions` (elle sayı yazmak yasak) |
| Dokunma hedefi | `theme/a11y.ts` → `MIN_TOUCH_TARGET = 44`, `touchTargetHitSlop()`, `clampFontSize()` |
| Yerel tarih anahtarı | `domain/doseLog.ts` → `getLocalDateKey()` (ESLint tarafından zorunlu kılınmış, `doseLog.ts:52`'de doğrulandı) |

---

## 4. Public API Sözleşmesi

Bu imzalar **bağlayıcıdır**. Faz 2'de `WheelTimePicker` göçünün drop-in olması buna bağlıdır.

### 4.1 `WheelColumn` — jenerik tek sütun

```tsx
export type WheelColumnId = 'day' | 'month' | 'year';

export interface WheelColumnProps {
  /** A11y etiketi ve hata ayıklama için sütun kimliği. */
  readonly id: WheelColumnId;

  /**
   * Görünen etiketler. SABİT UZUNLUK ve SABİT DİZİ KİMLİĞİ zorunlu (ADR-02, INV-3).
   * Render sırasında türetilmiş yeni bir dizi GEÇİRİLEMEZ.
   */
  readonly labels: readonly string[];

  /**
   * Etkin aralık — KAPALI aralık, indeks cinsinden.
   * Süreklilik invariantı: firstEnabled <= i <= lastEnabled olan her i seçilebilir.
   * Bu aralığın dışındaki öğeler soluk render edilir ve seçilemez.
   */
  readonly firstEnabled: number;
  readonly lastEnabled: number;

  /** Seçili indeks. Kontrollü (controlled) prop. */
  readonly selectedIndex: number;

  /**
   * YALNIZCA kullanıcı kaynaklı yerleşimde çağrılır (sürükle, fling, dokun, a11y adımı).
   * Prop kaynaklı programatik hizalama ASLA çağırmaz (INV-4).
   * Aynı indeks için ardışık çağrılar tekilleştirilir (INV-5).
   */
  readonly onSelect: (index: number) => void;

  /** A11y: ekran okuyucuya okunan sütun adı. Örn. isTr ? 'Gün' : 'Day' */
  readonly accessibilityLabel: string;
  /** A11y: ekran okuyucuya okunan güncel değer. Örn. '15' veya 'Mart' */
  readonly accessibilityValue: string;

  readonly colors: ThemeColors;
  readonly isDark: boolean;

  /** Yerleşimde seçim dokunuşu. Varsayılan: true */
  readonly hapticsEnabled?: boolean;
  /** Satır yüksekliği override. Varsayılan: WHEEL_ITEM_HEIGHT */
  readonly itemHeight?: number;
}
```

**Post-koşullar:**
- `onSelect(i)` çağrıldığında `firstEnabled <= i <= lastEnabled` **her zaman** doğrudur. Bileşen, devre dışı bir indekse yerleşirse otomatik olarak en yakın etkin indekse düzeltir ve *düzeltilmiş* indeksi yayınlar (§7.4).
- `selectedIndex` prop'u `[firstEnabled, lastEnabled]` dışındaysa bileşen çökmez; en yakın etkin indekse hizalar ve bir dev döngüsü yaratmaz.

### 4.2 `WheelDatePicker` — presentational gövde

```tsx
export interface WheelDatePickerProps {
  /** 'yyyy-MM-dd' veya '' (seçim yok). Date NESNESİ KABUL ETMEZ (INV-1). */
  readonly value: string;

  /** KAPALI aralık, 'yyyy-MM-dd'. Varsayılan: { min: bugünden 125 yıl önce, max: bugün } */
  readonly range?: { readonly min: string; readonly max: string };

  /** Yalnızca Tamam'da çağrılır. Taslak değişiklikleri SIZMAZ (INV-2). */
  readonly onChange: (iso: string, parts: DateParts) => void;

  readonly colors: ThemeColors;
  readonly isDark: boolean;
  readonly isTr: boolean;

  /** Sütun sırası. Varsayılan: ['day', 'month', 'year'] (TR/almanak düzeni) */
  readonly columnOrder?: readonly WheelColumnId[];
  readonly hapticsEnabled?: boolean;
}

export const WheelDatePicker: React.FC<WheelDatePickerProps>;
```

> **`value` neden `string` de `Date` değil:** `medicalIdStore.ts:24` `birthDate: string; // YYYY-MM-DD` saklıyor. `Date` kabul etmek, tüketicinin `new Date('1970-03-15')` yazmasına yol açar — bu **UTC gece yarısına** ayrıştırılır ve UTC+3'te bir gün geriye kayar. Tam olarak §0.6'da belgelenen hata sınıfı. String sözleşmesi bu hatayı API seviyesinde imkânsız kılar.

### 4.3 `WheelDatePickerModal` — kabuk

```tsx
export interface WheelDatePickerModalProps {
  readonly visible: boolean;
  readonly value: string;
  readonly range?: { readonly min: string; readonly max: string };
  readonly title?: string;          // varsayılan: isTr ? 'Doğum Tarihi' : 'Birth Date'

  /** Tamam → DOĞRULANMIŞ 'yyyy-MM-dd'. */
  readonly onConfirm: (iso: string) => void;
  /** İptal, backdrop dokunuşu, Android geri tuşu → HİÇBİR ŞEY commit edilmez. */
  readonly onCancel: () => void;

  readonly columnOrder?: readonly WheelColumnId[];
}

export const WheelDatePickerModal: React.FC<WheelDatePickerModalProps>;
```

**İşlemsellik zorunluluğu (INV-2):** `onCancel` çağrıldığında `onConfirm` **çağrılmamalıdır** ve iç taslak durumu atılmalıdır. Backdrop dokunuşu, Android donanım geri tuşu (`Modal.onRequestClose`) ve İptal butonu **üçü de** `onCancel`'a yönlenir.

> Bu doğrudan mevcut bir hatayı düzeltir: `MedicalIdModal.tsx:524-531`'deki kuşak çipleri, kullanıcı hiçbir şey onaylamadan `setBirthDate('1980-01-01')` yazıp **sonra** seçiciyi açıyor. Kullanıcı native diyaloğu iptal ettiğinde onaylanmamış tarih form durumunda kalıyor.

---

## 5. Çekirdek Algoritma Sözleşmesi

### 5.1 `domain/dateParts.ts` — saf tamsayı çekirdeği

```ts
/**
 * dateParts.ts — Takvimin SAF TAMSAYI temsili.
 *
 * INV-1: Bu modülde ve WheelDatePicker'da HİÇBİR ZAMAN `new Date(...)` kurulmaz.
 * Tüm hesaplar tamsayı aritmetiğidir; ISO çıktısı string birleştirmedir.
 * Gerekçe: eslint.config.mjs'in proje genelinde yasakladığı UTC gün tuzağı
 * (TR = UTC+3, 00:00–03:00 önceki güne çözülür) yalnızca Date kurularak
 * tetiklenebilir. Date kurmazsak hata sınıfı yapısal olarak yok olur.
 */

export interface DateParts {
  readonly year: number;   // tam sayı, 4 basamak
  readonly month: number;  // 1..12  (1 = Ocak). Date.getMonth() DEĞİL — 0 tabanlı değil.
  readonly day: number;    // 1..31
}

/** Gregorian artık yıl kuralı. Saf, yan etkisiz. */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

const DAYS_IN_MONTH_NON_LEAP: readonly number[] = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** month 1..12. Geçersiz girdi için 0 döner (asla throw etmez — toplam fonksiyon). */
export function daysInMonth(year: number, month: number): number {
  if (month === 2 && isLeapYear(year)) return 29;
  return DAYS_IN_MONTH_NON_LEAP[month - 1] ?? 0;
}

/** Sözlüksel (lexicographic) karşılaştırma. Date'e gerek kalmadan sıralama verir. */
export function compareParts(a: DateParts, b: DateParts): -1 | 0 | 1 {
  if (a.year !== b.year) return a.year < b.year ? -1 : 1;
  if (a.month !== b.month) return a.month < b.month ? -1 : 1;
  if (a.day !== b.day) return a.day < b.day ? -1 : 1;
  return 0;
}

export function partsToIso(p: DateParts): string {
  return (
    String(p.year).padStart(4, '0') + '-' +
    String(p.month).padStart(2, '0') + '-' +
    String(p.day).padStart(2, '0')
  );
}

export const ISO_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Geçersizse null. Asla throw etmez, asla Date kurmaz. */
export function isoToParts(iso: string): DateParts | null {
  const m = ISO_DATE_REGEX.exec(iso);
  if (!m) return null;
  const parts: DateParts = { year: +m[1], month: +m[2], day: +m[3] };
  return isValidParts(parts) ? parts : null;
}

/** month 1..12 VE day gerçek takvim günü (artık yıl dahil) VE year 4 basamak. */
export function isValidParts(p: DateParts): boolean {
  return (
    Number.isInteger(p.year) && p.year >= 1000 && p.year <= 9999 &&
    Number.isInteger(p.month) && p.month >= 1 && p.month <= 12 &&
    Number.isInteger(p.day) && p.day >= 1 && p.day <= daysInMonth(p.year, p.month)
  );
}

export function clampInt(value: number, min: number, max: number): number {
  if (max < min) return min;      // INV-6: dejenere aralıkta deterministik davranış
  return value < min ? min : value > max ? max : value;
}
```

**Zorunlu birim test matrisi** (`__tests__/domain/dateParts.test.ts`):

| Vaka | Beklenen |
| :--- | :--- |
| `isLeapYear(2024)` | `true` (4'e bölünür, 100'e bölünmez) |
| `isLeapYear(2000)` | `true` (400'e bölünür — yüzyıl istisnasının istisnası) |
| `isLeapYear(1900)` | **`false`** (100'e bölünür, 400'e bölünmez — en sık atlanan vaka) |
| `isLeapYear(2100)` | **`false`** |
| `isLeapYear(2023)` | `false` |
| `daysInMonth(2024, 2)` | `29` |
| `daysInMonth(2023, 2)` | `28` |
| `daysInMonth(1900, 2)` | **`28`** |
| `daysInMonth(2000, 2)` | **`29`** |
| `daysInMonth(y, m)` tüm `m ∈ [1..12]`, `y ∈ [1910..2026]` | `[31,28/29,31,30,31,30,31,31,30,31,30,31]` |
| `daysInMonth(2026, 0)` / `(2026, 13)` | `0` (çökmez) |
| `isoToParts('2024-02-29')` | `{2024,2,29}` |
| `isoToParts('2023-02-29')` | **`null`** (artık yıl değil — takvimde yok) |
| `isoToParts('1900-02-29')` | **`null`** |
| `isoToParts('2026-04-31')` | **`null`** (Nisan 30 çeker) |
| `isoToParts('2026-1-5')` | `null` (sıfır dolgusu zorunlu) |
| `isoToParts('')` / `'abc'` / `'2026-13-01'` | `null` |
| `partsToIso({1970,3,5})` | `'1970-03-05'` |
| `compareParts` | tam sıra tutarlılığı; `{2024,2,29}` vs `{2024,3,1}` → `-1` |

### 5.2 `domain/wheelDateModel.ts` — sınırlandırılmış kaskad

```ts
import {
  type DateParts, clampInt, compareParts, daysInMonth, isValidParts, partsToIso,
} from './dateParts';

/** KAPALI, sıralı aralık. min <= max invariantı makeDateRange ile zorlanır. */
export interface DateRange {
  readonly min: DateParts;
  readonly max: DateParts;
}

/**
 * range.max.year için SABİT üst sınır.
 * ÖNEMLİ: Bu bir "bugün" değeri DEĞİLDİR — mutlak bir güvenlik tavanıdır.
 * Varsayılan max her render'da `getLocalDateKey(new Date())` ile hesaplanır (§10.2),
 * böylece Ocak 2027'de bayatlamaz.
 */
export const ABSOLUTE_MAX_YEAR = 2100;
/** calculateAge()'in `age <= 125` sınırıyla hizalı (MedicalIdModal.tsx:38). */
export const MAX_AGE_YEARS = 125;

/** min > max ise null döner — sessizce takas ETMEZ. */
export function makeDateRange(min: DateParts, max: DateParts): DateRange | null {
  if (!isValidParts(min) || !isValidParts(max)) return null;
  if (compareParts(min, max) > 0) return null;
  return { min, max };
}

/**
 * YIL sütunu: her zaman tam aralık. Sabit uzunluk (ADR-02).
 */
export function buildYearValues(range: DateRange): readonly number[] {
  return buildContiguous(range.min.year, range.max.year);
}

/**
 * AY sütunu: her zaman 1..12 (sabit uzunluk). Sınır dışı aylar devre dışıdır.
 */
export const MONTH_VALUES: readonly number[] = buildContiguous(1, 12);

/**
 * GÜN sütunu: her zaman 1..31 (sabit uzunluk). Geçersiz günler devre dışıdır.
 */
export const DAY_VALUES: readonly number[] = buildContiguous(1, 31);

function buildContiguous(from: number, to: number): number[] {
  const out: number[] = [];
  for (let v = from; v <= to; v++) out.push(v);
  return out;
}

/** (year, month) için ay seçilebilir mi? */
export function isMonthSelectable(year: number, month: number, range: DateRange): boolean {
  const lo: DateParts = { year, month, day: 1 };
  const hi: DateParts = { year, month, day: daysInMonth(year, month) };
  // Aralıkla kesişiyor mu? (ayın tamamı dışında kalması durumu elenir)
  return compareParts(hi, range.min) >= 0 && compareParts(lo, range.max) <= 0;
}

/** (year, month, day) seçilebilir mi? Takvim geçerliliği + aralık sınırı birlikte. */
export function isDaySelectable(
  year: number, month: number, day: number, range: DateRange
): boolean {
  if (day > daysInMonth(year, month)) return false;         // 31 Şubat asla
  const p: DateParts = { year, month, day };
  return compareParts(p, range.min) >= 0 && compareParts(p, range.max) <= 0;
}

/**
 * Süreklilik invariantı (ADR-02'nin matematiksel temeli):
 * Seçilebilir değerler kümesi HER sütunda bitişik bir aralıktır.
 * Bu sayede `enabled: boolean[]` yerine iki tamsayı yeter → React.memo etkin çalışır.
 *
 * İspat taslağı:
 *  - Yıl: tümü etkin → [0, len-1].
 *  - Ay: isMonthSelectable(y, m) ⇔ m ∈ [ (y===min.y ? min.m : 1), (y===max.y ? max.m : 12) ].
 *        Her iki sınır da m'de monoton → bitişik.
 *  - Gün: isDaySelectable ⇔ day ∈ [ (y,m === min.y,min.m ? min.d : 1),
 *                                   min(daysInMonth(y,m), (y,m === max.y,max.m ? max.d : ∞)) ].
 *        daysInMonth sabit (y,m) için → bitişik.  ∎
 */
export interface EnabledSpan {
  readonly first: number;  // indeks (değer değil)
  readonly last: number;   // indeks, kapalı
}

export function yearEnabledSpan(range: DateRange): EnabledSpan {
  const len = range.max.year - range.min.year + 1;
  return { first: 0, last: len - 1 };
}

export function monthEnabledSpan(year: number, range: DateRange): EnabledSpan {
  const first = year === range.min.year ? range.min.month : 1;
  const last  = year === range.max.year ? range.max.month : 12;
  return { first: first - 1, last: last - 1 };   // MONTH_VALUES 1 tabanlı → indeks 0 tabanlı
}

export function dayEnabledSpan(year: number, month: number, range: DateRange): EnabledSpan {
  const calendarMax = daysInMonth(year, month);
  const atMin = year === range.min.year && month === range.min.month;
  const atMax = year === range.max.year && month === range.max.month;
  const firstValue = atMin ? range.min.day : 1;
  const lastValue  = Math.min(calendarMax, atMax ? range.max.day : calendarMax);
  // Dejenere koruma: span asla boş olamaz, çünkü parts her zaman geçerli bir tarihtir.
  return { first: firstValue - 1, last: Math.max(lastValue, firstValue) - 1 };
}
```

### 5.3 Ay etiketleri — statik veri, `Date` yok, cihaz locale'i yok

```ts
/**
 * §0.4'teki kök nedenin çözümü: etiketler UYGULAMA dilinden gelir.
 * date-fns `format(d,'MMM',{locale})` KULLANILMAZ — o yol bir Date kurmayı
 * gerektirir (INV-1 ihlali) ve 12 gereksiz tahsis yapar.
 * Cihaz locale'i HİÇ okunmaz; böylece cihazı İngilizce, uygulaması Türkçe olan
 * kullanıcının Türkçe formda "Jan" görmesi imkânsızlaşır.
 *
 * TR kısaltmaları date-fns `tr` locale'inin 'MMM' çıktısıyla birebir aynıdır.
 */
export const MONTH_LABELS_TR: readonly string[] = [
  'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara',
];

export const MONTH_LABELS_EN: readonly string[] = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** Gün ve yıl etiketleri: INV-3 gereği module-level cache'ten, render'da üretim YASAK. */
const labelCache = new Map<number, readonly string[]>();
export function numericLabels(count: number, pad = false): readonly string[] {
  const key = count * 2 + (pad ? 1 : 0);
  const hit = labelCache.get(key);
  if (hit) return hit;
  const built: string[] = [];
  for (let i = 1; i <= count; i++) built.push(pad ? String(i).padStart(2, '0') : String(i));
  const frozen = Object.freeze(built);
  labelCache.set(key, frozen);
  return frozen;
}
```

**INV-3 (bağlayıcı):** `WheelColumn`'a geçen `labels` dizisinin kimliği render'lar arasında **değişmemelidir**. `labels.map(...)`, `Array.from(...)` veya şablon literal üretimini render gövdesinde yapmak **yasaktır**. Günler için `numericLabels(31)`, aylar için `MONTH_LABELS_TR`/`_EN`, yıllar için `numericLabels(yearCount)` modül-seviyesi cache'ten gelir.

> Yılların etiket uzunluğu aralığa bağlıdır (`2026 - (2026-125) + 1 = 126`). `labelCache` bunu `count` anahtarıyla çözer → aynı aralık için her zaman aynı dizi kimliği.

### 5.4 Reducer — dinamik gün senkronizasyonunun kalbi

```ts
export interface WheelDateState {
  /** HER ZAMAN geçerli bir takvim tarihi (isValidParts === true). */
  readonly parts: DateParts;
  /**
   * Kullanıcının BİLEREK seçtiği son gün.
   * Amaç: 31 Ocak → Şubat klamplanır (28), ama OCAK'a dönünce 31 GERİ GELİR.
   * iOS UIDatePicker bunu yapmaz (31'i unutur); burada bilinçli olarak daha
   * iyi bir davranış seçildi, çünkü maliyeti bir tamsayı.
   *
   * KRİTİK AYRIM: Yalnızca setDay/step('day') günceller. Türetilmiş klamplama
   * GÜNCELLEMEZ — aksi halde 31 Ocak → Şubat(28) → Ocak zinciri 28'de kilitlenir
   * ve geri yükleme özelliği ölür.
   */
  readonly lastExplicitDay: number;
}

export type WheelDateAction =
  | { readonly type: 'setDay';   readonly day: number }
  | { readonly type: 'setMonth'; readonly month: number }
  | { readonly type: 'setYear';  readonly year: number }
  /** A11y increment/decrement ve dokunmatik adım butonları için. */
  | { readonly type: 'step'; readonly column: WheelColumnId; readonly delta: 1 | -1 }
  | { readonly type: 'reset'; readonly parts: DateParts };

/**
 * `range` closure'a alınır: reducer saf kalır (state, action) -> state
 * ve useReducer ile doğrudan kullanılabilir.
 */
export function createWheelDateReducer(range: DateRange) {
  /** Ay/yıl değiştiğinde günü yeni takvime KLAMPLA. lastExplicitDay'i KORU. */
  function resolveDay(year: number, month: number, preferredDay: number): number {
    const span = dayEnabledSpan(year, month, range);
    // span indeksleri DAY_VALUES (1..31) üzerinde → değer = indeks + 1
    return clampInt(preferredDay, span.first + 1, span.last + 1);
  }

  return function wheelDateReducer(
    state: WheelDateState, action: WheelDateAction
  ): WheelDateState {
    switch (action.type) {

      case 'setDay': {
        const span = dayEnabledSpan(state.parts.year, state.parts.month, range);
        const day = clampInt(action.day, span.first + 1, span.last + 1);
        // Kullanıcı bilerek seçti → lastExplicitDay GÜNCELLENİR.
        return { parts: { ...state.parts, day }, lastExplicitDay: day };
      }

      case 'setMonth': {
        const monthSpan = monthEnabledSpan(state.parts.year, range);
        const month = clampInt(action.month, monthSpan.first + 1, monthSpan.last + 1);
        // Ay değişti → gün sayısı değişmiş olabilir → klampala.
        // lastExplicitDay KORUNUR (türetilmiş değişiklik).
        const day = resolveDay(state.parts.year, month, state.lastExplicitDay);
        return { parts: { ...state.parts, month, day }, lastExplicitDay: state.lastExplicitDay };
      }

      case 'setYear': {
        const year = clampInt(action.year, range.min.year, range.max.year);
        const day = resolveDay(year, state.parts.month, state.lastExplicitDay);
        return { parts: { ...state.parts, year, day }, lastExplicitDay: state.lastExplicitDay };
      }

      case 'step': {
        // A11y adımı = sınırda klamplanmış ±1. SARMALAMA (wrap) YOKTUR:
        // 31 Aralık'ta "artır" 1 Ocak'a dönmez, yerinde kalır. Görme engelli bir
        // kullanıcının yanlışlıkla 100 yıl geriye sarması kabul edilemez.
        switch (action.column) {
          case 'year':
            return wheelDateReducer(state, {
              type: 'setYear', year: state.parts.year + action.delta,
            });
          case 'month':
            return wheelDateReducer(state, {
              type: 'setMonth', month: state.parts.month + action.delta,
            });
          case 'day':
            return wheelDateReducer(state, {
              type: 'setDay', day: state.parts.day + action.delta,
            });
        }
        return state;   // erişilemez — exhaustiveness guard
      }

      case 'reset': {
        const day = resolveDay(action.parts.year, action.parts.month, action.parts.day);
        return { parts: { ...action.parts, day }, lastExplicitDay: action.parts.day };
      }
    }
  };
}
```

**Zorunlu durum makinesi test matrisi** (`__tests__/domain/wheelDateModel.test.ts` — bu görevdeki test kütlesinin merkezi):

| # | Başlangıç | Eylem | Beklenen `parts` | Beklenen `lastExplicitDay` |
| :-- | :--- | :--- | :--- | :--- |
| 1 | `2024-01-31`, led=31 | `setMonth(2)` | **`2024-02-29`** (artık yıl) | **31** (korunur) |
| 2 | `2023-01-31`, led=31 | `setMonth(2)` | **`2023-02-28`** | **31** |
| 3 | vaka 2 sonucu | `setMonth(1)` | **`2023-01-31`** ← geri yükleme | 31 |
| 4 | vaka 2 sonucu | `setDay(28)` | `2023-02-28` | **28** ← artık bilinçli |
| 5 | vaka 4 sonucu | `setMonth(1)` | **`2023-01-28`** ← 31 DEĞİL | 28 |
| 6 | `2023-01-31`, led=31 | `setYear(2024)` | `2024-01-31` | 31 |
| 7 | `2024-02-29`, led=29 | `setYear(2023)` | **`2023-02-28`** | 29 |
| 8 | `2024-02-29`, led=31 | `setYear(2023)` | **`2023-02-28`** | 31 |
| 9 | `2023-02-28`, led=31 | `setYear(2024)` | **`2024-02-29`** ← artık yıla yükseltme | 31 |
| 10 | `1900-01-31`, led=31 | `setMonth(2)` | **`1900-02-28`** ← 1900 artık yıl DEĞİL | 31 |
| 11 | `2000-01-31`, led=31 | `setMonth(2)` | **`2000-02-29`** ← 2000 artık yıl | 31 |
| 12 | `2026-03-31`, led=31 | `setMonth(4)` | **`2026-04-30`** | 31 |
| 13 | `2026-01-31`, led=31 | `setMonth(2)` → `setMonth(3)` | **`2026-03-31`** ← iki adımlı geri yükleme | 31 |
| 14 | range.max=`2026-09-06`, `2026-09-06` | `step('day', +1)` | **`2026-09-06`** ← sarmaz | 6 |
| 15 | range.max=`2026-09-06`, `2026-09-06` | `setMonth(12)` | **`2026-09-06`** ← ay tavana klamplanır | 6 |
| 16 | range.max=`2026-09-06`, `2026-08-31` | `setMonth(9)` | **`2026-09-06`** ← çift sınır (takvim 30 + aralık 6) | 31 |
| 17 | range.min=`1901-09-06`, `1901-09-06` | `step('month', -1)` | **`1901-09-06`** ← tabanda sarmaz | 6 |
| 18 | range.min=`2026-09-06` (ExpirySection) | `buildDay*` span | yalnızca 6..30 etkin (Eylül 2026) | — |
| 19 | her `m ∈ [1..12]`, `y ∈ [1910..2026]` | `setMonth(m)` | `isValidParts(parts) === true` | — |
| 20 | `reset({2023,2,29})` (geçersiz girdi) | `reset` | gün 28'e klamplanır, **çökmez** | 29 |

> Vaka 19–20 bir **özellik testi (property test)** olarak yazılmalıdır: tüm `(yıl, ay)` kombinasyonları üzerinden döngü, her adımdan sonra `isValidParts(state.parts)` assert edilir. Bu, redüksiyonun *toplam* (total) fonksiyon olduğunu — hiçbir girdide geçersiz tarih üretmediğini — kanıtlar. 117 yıl × 12 ay = 1404 durum, `testEnvironment: 'node'` altında milisaniyeler içinde koşar.

### 5.5 Sütun modeli üretimi

```ts
export interface WheelColumnModel {
  readonly id: WheelColumnId;
  readonly labels: readonly string[];   // INV-3: sabit kimlik
  readonly firstEnabled: number;        // indeks
  readonly lastEnabled: number;         // indeks
  readonly selectedIndex: number;       // indeks
  readonly accessibilityValue: string;
}

export function buildColumns(
  state: WheelDateState, range: DateRange, isTr: boolean
): readonly [WheelColumnModel, WheelColumnModel, WheelColumnModel] {
  const { year, month, day } = state.parts;

  const yearValues = buildYearValues(range);
  const ySpan = yearEnabledSpan(range);
  const mSpan = monthEnabledSpan(year, range);
  const dSpan = dayEnabledSpan(year, month, range);

  const monthLabels = isTr ? MONTH_LABELS_TR : MONTH_LABELS_EN;

  return [
    {
      id: 'day',
      labels: numericLabels(31),
      firstEnabled: dSpan.first,
      lastEnabled: dSpan.last,
      selectedIndex: day - 1,
      accessibilityValue: String(day),
    },
    {
      id: 'month',
      labels: monthLabels,
      firstEnabled: mSpan.first,
      lastEnabled: mSpan.last,
      selectedIndex: month - 1,
      accessibilityValue: monthLabels[month - 1],
    },
    {
      id: 'year',
      labels: numericLabels(yearValues.length),   // cache'ten — sabit kimlik
      firstEnabled: ySpan.first,
      lastEnabled: ySpan.last,
      // yearValues[0] === range.min.year olduğundan indeks doğrudan çıkarmadır
      selectedIndex: year - range.min.year,
      accessibilityValue: String(year),
    },
  ];
}
```

### 5.6 Doğrulama — ayrılmış birleşim (ADR-07)

```ts
export type WheelDateValidation =
  | { readonly ok: true;  readonly iso: string; readonly parts: DateParts; readonly age: number | null }
  | { readonly ok: false; readonly code: WheelDateErrorCode; readonly messageTr: string; readonly messageEn: string };

export type WheelDateErrorCode =
  | 'INVALID_PARTS'    // takvimde yok (31 Şubat vb.)
  | 'OUT_OF_RANGE'     // range dışında
  | 'FUTURE_DATE';     // bugünden ileride — doğum tarihi için imkânsız

export function validateParts(parts: DateParts, range: DateRange): WheelDateValidation;

/**
 * Yaş hesabı — Date KURMADAN, saf tamsayı.
 * `calculateAge` (MedicalIdModal.tsx:31-42) date-fns `differenceInYears` kullanıyor;
 * burada aynı sonucu üreten Date'siz sürüm zorunlu, çünkü INV-1 bunu gerektirir.
 */
export function ageFromParts(birth: DateParts, today: DateParts): number | null {
  if (compareParts(birth, today) > 0) return null;         // gelecek tarih → yaş yok
  let age = today.year - birth.year;
  const hadBirthdayThisYear =
    today.month > birth.month ||
    (today.month === birth.month && today.day >= birth.day);
  if (!hadBirthdayThisYear) age -= 1;
  return age >= 0 && age <= MAX_AGE_YEARS ? age : null;
}
```

**Zorunlu test:** `ageFromParts({1970,3,15}, {2026,9,6})` → `56`.
Sınır vakaları: doğum günü **bugün** → `age` artar; doğum günü **yarın** (aynı yıl içinde henüz gelmedi) → `age - 1`; `2024-02-29` doğumlu, `2025-02-28` bugün → `0` değil doğru yaş; `2024-02-29` doğumlu, `2026-02-28` → henüz doğum günü gelmedi.

> **Klinik not (ZCode'a):** `29 Şubat` doğumlu hastalarda "doğum günü" tanımı artık olmayan yıllarda 28 Şubat mı 1 Mart mı? Bu sözleşme `today.day >= birth.day` kuralıyla **28 Şubat'ı doğum günü kabul eder** (yani artık yıl doğumlular artık olmayan yıllarda bir gün erken yaş alır). Tıbbi dozaj/yetişkin-çocuk sınırı bu tarihe bağlıysa ZCode onayı gerekir.

---

## 6. Görsel Sözleşme

Kullanıcının tarif ettiği referans: koyu temalı pencere, 3 dikey tambur, ortada iki yatay mavi çizgi arasında seçili değer, üst/alt soluk değerler, altta İptal (sol) / Tamam (sağ).

| Öğe | Zorunlu değer | Kaynak |
| :--- | :--- | :--- |
| Satır yüksekliği | `WHEEL_ITEM_HEIGHT = 48` | `WheelTimePicker` ile hizalı |
| Görünür satır | `WHEEL_VISIBLE_COUNT = 5` | 2 üst + seçili + 2 alt |
| Tambur yüksekliği | `48 * 5 = 240` | türetilmiş |
| Ortalama boşluğu | `paddingVertical: 48 * 2` (`GUTTER = floor(5/2)`) | offset 0 → öğe 0 merkezde |
| Seçim çizgileri | **2 mutlak konumlu hairline**, üst `top: 96`, alt `top: 144`, `pointerEvents="none"` | `WheelTimePicker:296-311` kalıbı |
| Çizgi rengi | `colors.borderFocused` veya `withAlpha(colors.primary, ALPHA.tint)` | Hardcoded `#475569` **yasak** |
| Panel arka planı | `colors.card` | `ModalSheet` zaten uyguluyor |
| Backdrop | `colors.overlay` | `ModalSheet`'in hardcoded `rgba(0,0,0,0.5)`'i token'a çevrilmeli (faz 2) |
| Sütun genişliği | gün `64`, ay `88`, yıl `96` — `flexDirection: 'row'`, `justifyContent: 'center'` | Ay adı 3 harf + Türkçe karakter genişliği |
| Seçili satır | `fontSize: 30`, `fontWeight: '700'`, `color: colors.text` | tier 0 |
| ±1 satır | `fontSize: 22`, `fontWeight: '400'`, `color: colors.textSecondary` | tier 1 |
| ±2 satır | `fontSize: 18`, `fontWeight: '300'`, `color: colors.textMuted` | tier 2 |
| **Devre dışı satır** | tier 2 renk + `withAlpha(..., ALPHA.haze)`, `textDecorationLine: 'line-through'` **yasak** (okunabilirlik), dokunma reddedilir | ADR-02 |
| Rakam titremesi | `fontVariant: ['tabular-nums']` **tüm** satırlarda zorunlu | `WheelTimePicker:322` — orantılı rakamlar kaydırma sırasında yatay zıplama yapar |
| Metin ölçeği | `maxFontSizeMultiplier={1.3}`, `numberOfLines={1}`, `adjustsFontSizeToFit` | §8.5 |
| İptal/Tamam | `ModalSheet.actions` slotu, `flexDirection: 'row'`, `justifyContent: 'space-between'` | ADR-05 |
| Tamam rengi | `colors.primary` metin, `withAlpha(colors.primary, ALPHA.wash)` zemin | Kullanıcı vurgu rengini değiştirirse (`AccentContext`) otomatik uyum — teal **hardcode edilmez** |
| İptal rengi | `colors.textSecondary` metin, şeffaf zemin | İkincil eylem hiyerarşisi |
| Buton yüksekliği | `minHeight: MIN_TOUCH_TARGET` (44) | `theme/a11y.ts` |
| Başlık | `ModalSheet.title`, ortalanmış, `fontSize: 18`, `fontWeight: '700'` | `ModalSheet:161` |
| Yaş rozeti (opsiyonel) | Başlığın altında `ageFromParts` çıktısı, `colors.primary` | `MedicalIdModal`'daki mevcut `ageBadge` ile görsel süreklilik |

**Koyu tema referans değerleri** (yalnızca doğrulama için — koda yazılmaz, token'dan okunur):
`background #0F172A`, `card #1E293B`, `border #334155`, `text #F8FAFC`, `textSecondary #94A3B8`, `textMuted #64748B`, `primary #14B8A6` (vurgu rengiyle geçersiz kılınabilir).

---

## 7. Performans Sözleşmesi — Kaydırma/Snap

### 7.1 FlatList prop zorunlulukları

```tsx
<FlatList
  ref={listRef}
  data={labels}                              // INV-3: sabit kimlik
  keyExtractor={keyByIndex}                  // module-level: (_, i) => String(i) — render'da lambda YASAK
  renderItem={renderItem}                    // useCallback ile stabilize
  extraData={renderKey}                      // tier/enabled değişimini FlatList'e bildir
  getItemLayout={getItemLayout}              // ZORUNLU — O(1) kaydırma, initialScrollIndex ön koşulu
  initialScrollIndex={selectedIndex}         // YALNIZCA mount'ta anlamlı
  snapToInterval={itemHeight}                // tek snap mekanizması
  snapToAlignment="center"
  decelerationRate="fast"
  disableIntervalMomentum={false}            // 126 yıllık çarkta çok-öğeli fling istenir
  scrollEventThrottle={16}
  showsVerticalScrollIndicator={false}
  overScrollMode="never"
  nestedScrollEnabled                        // MedicalIdModal'ın ScrollView'i içinde gerekli
  bounces={Platform.OS === 'ios'}
  windowSize={3}                             // 5 görünür satır için 3 pencere yeterli
  initialNumToRender={WHEEL_VISIBLE_COUNT}
  maxToRenderPerBatch={8}
  updateCellsBatchingPeriod={32}
  removeClippedSubviews={false}              // küçük liste; Android'de boş-satır titremesi yapar
  contentContainerStyle={contentPadding}     // useMemo([itemHeight]) — render'da obje literal YASAK
  importantForAccessibility="no-hide-descendants"   // §8.2 — KRİTİK
  onScroll={handleScroll}
  onScrollBeginDrag={handleScrollBeginDrag}
  onScrollEndDrag={handleScrollEndDrag}
  onMomentumScrollBegin={handleMomentumBegin}
  onMomentumScrollEnd={handleMomentumEnd}
/>
```

**Yasaklar:**
- ❌ `snapToInterval` **ve** `snapToOffsets` birlikte. Mevcut `WheelTimePicker.tsx:130-136` ikisini birden geçiriyor; `snapToOffsets` kazanır ve `snapToInterval` sessizce yok sayılır. Tekdüze satır yüksekliğinde `snapToInterval` tek başına yeterlidir ve 31/126 elemanlık ek bir dizi tahsisini ortadan kaldırır.
- ❌ `renderItem` içinde inline arrow function veya obje literal (her karede yeni kimlik → `React.memo` çalışmaz).
- ❌ `data`/`labels` dizisini render gövdesinde üretmek.

### 7.2 Tier kovası — gereksiz yeniden render'ı kesen asıl mekanizma

Kaydırma sırasında her karede `setState` çağrısı FlatList'in tamamını yeniden render eder. Çözüm sürekli animasyon değil, **mesafeyi 3 ayrık kovaya indirmek**tir:

```ts
export type WheelItemTier = 0 | 1 | 2;

/** |index - selectedIndex| → 3 kova. Saf, tahsissiz. */
export function tierFor(distance: number): WheelItemTier {
  return distance <= 0 ? 0 : distance === 1 ? 1 : 2;
}
```

```tsx
interface WheelItemProps {
  readonly label: string;
  readonly tier: WheelItemTier;
  readonly enabled: boolean;
  readonly colors: ThemeColors;
  readonly itemHeight: number;
  readonly onPress: (index: number) => void;
  readonly index: number;
}

const WheelItem = React.memo(function WheelItem({ ... }: WheelItemProps) { ... });
```

**Neden işe yarar:** Merkez bir satır kaydığında, 5 görünür satırdan yalnızca **2'sinin** tier'i değişir; kalan 3'ü aynı prop'ları korur ve `React.memo` bunları atlar. Kovasız (sürekli `fontSize`/`opacity` interpolasyonu) bir tasarım 5 satırın **hepsini** her karede yeniden render eder. Ayrık kovalar burada sürekli animasyondan **daha hızlıdır** — bu, sezgiye aykırı ama FlatList tabanlı çarklar için doğru olan sonuçtur.

**Tier→stil eşlemesi modül seviyesinde sabit bir tabloda tutulur** (render'da obje üretmek yasak):
```ts
const TIER_STYLE: Record<WheelItemTier, { fontSize: number; fontWeight: '700'|'400'|'300'; token: 'text'|'textSecondary'|'textMuted' }> = { ... };
```

### 7.3 Yerleşim (settle) algoritması — mevcut koddaki çift-yayın hatasının düzeltimi

🔴 **Mevcut kusur:** `WheelTimePicker.tsx:80-86`, hem `onScrollEndDrag` hem `onMomentumScrollEnd` içinde `settleToIndex` çağırıyor.

`onScrollEndDrag` **parmak kalktığı anda** ateşlenir — momentum çarkı nihai konumuna taşımadan **önce**. Yani mevcut kod, kullanıcının hiç durmadığı bir *ara* indeksi hesaplayıp `onSelect` ile yayınlıyor, sonra momentum bitince gerçek indeksi tekrar yayınlıyor. Sonuç: tek fling için iki yayın, ara değerde durum titremesi, yanlış dokunsal geri bildirim ve ebeveyn reducer'ına iki dispatch.

Zaman çarkında bu zararsızdır (değerler idempotent, klampalama yok). **Tarih çarkında zararlıdır**, çünkü ara değer geçersiz bir gün olabilir ve klampalama kaskadını tetikler.

✅ **Zorunlu algoritma — zamanlayıcısız, deterministik:**

```ts
const VELOCITY_SETTLE_THRESHOLD = 0.05;

const handleScrollEndDrag = useCallback(
  (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    isUserScrolling.current = true;
    // velocity, onScrollEndDrag nativeEvent'inde mevcuttur.
    const vy = e.nativeEvent.velocity?.y ?? 0;
    if (Math.abs(vy) < VELOCITY_SETTLE_THRESHOLD) {
      // Fling YOK → momentum olayları ateşlenmeyecek → şimdi yerleş.
      settle(e.nativeEvent.contentOffset.y, 'user');
    }
    // Aksi halde BEKLE: onMomentumScrollEnd yerleşecek.
    // Ara indeksi YAYINLAMA.
  }, [settle]
);

const handleMomentumEnd = useCallback(
  (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    settle(e.nativeEvent.contentOffset.y, 'user');
  }, [settle]
);
```

**Zamanlayıcı yok** → sızıntı yok, `jest.useFakeTimers()` cambazlığı yok, yarış durumu yok. Tek bir fling tam olarak **bir** yayın üretir.

### 7.4 Yerleşim çekirdeği

```ts
const indexFromOffset = (offsetY: number, count: number, itemHeight: number): number =>
  clampInt(Math.round(offsetY / itemHeight), 0, count - 1);

const settle = useCallback((offsetY: number, source: 'user' | 'programmatic') => {
  const count = labels.length;
  const landed = indexFromOffset(offsetY, count, itemHeight);

  // ADR-02 / §4.1 post-koşulu: devre dışı bir indekse yerleşilemez.
  const target =
    landed >= firstEnabled && landed <= lastEnabled
      ? landed
      : nearestEnabledIndex(landed, firstEnabled, lastEnabled, count);

  if (target !== landed) {
    // Düzeltici snap. 'programmatic' olarak işaretlenir → INV-4 gereği
    // bu scrollToOffset onSelect YAYINLAMAZ; aşağıdaki emit yayınlar.
    listRef.current?.scrollToOffset({ offset: target * itemHeight, animated: true });
  }

  isUserScrolling.current = false;
  if (source === 'user') emit(target);
}, [labels.length, itemHeight, firstEnabled, lastEnabled, emit]);

/**
 * En yakın etkin indeks. Sırayla: hedefin kendisi → ileri → geri.
 * Etkin küme bitişik olduğundan (ADR-02 süreklilik invariantı) bu O(1)'dir:
 *   landed < first → first ; landed > last → last
 * Bitişiklik invariantı bozulursa (gelecekteki bir değişiklik) deterministik
 * kalması için yine de doğrusal tarama yapılır ve -1 durumunda 0'a düşülür.
 */
export function nearestEnabledIndex(
  landed: number, first: number, last: number, count: number
): number {
  if (count === 0) return 0;
  if (first > last) return clampInt(landed, 0, count - 1);   // INV-6
  if (landed < first) return first;
  if (landed > last) return last;
  return landed;
}
```

### 7.5 Yayın tekilleştirme ve programatik-kaydırma ayrımı

```ts
const lastEmittedIndex = useRef(selectedIndex);

const emit = useCallback((index: number) => {
  if (index === lastEmittedIndex.current) return;   // INV-5: çift yayın yok
  lastEmittedIndex.current = index;
  onSelect(index);
}, [onSelect]);
```

**Prop senkronizasyon efekti** — ebeveyn değeri değiştiğinde hizala, **asla yayınlama**:
```ts
useEffect(() => {
  if (isUserScrolling.current) return;              // kullanıcı sürüklerken kavga ETME
  if (selectedIndex === lastEmittedIndex.current) return;   // zaten burada
  lastEmittedIndex.current = selectedIndex;         // INV-4: programatik = yayın yok
  listRef.current?.scrollToOffset({
    offset: selectedIndex * itemHeight,
    animated: false,                                // false ZORUNLU: true momentum olayı
  });                                               // tetikler → çift yayın riski
}, [selectedIndex, itemHeight]);
```

> **INV-4 neden kritik:** Reducer `setMonth(2)` üzerine günü 31→28'e klamplar. Bu, Gün sütununa yeni bir `selectedIndex` prop'u olarak iner. Eğer bu programatik hizalama `onSelect` yayınlarsa → reducer'a `setDay(28)` dispatch edilir → `lastExplicitDay` **31'den 28'e bozulur** → §5.4 vaka 3'teki "Ocak'a dönünce 31 geri gelir" davranışı **ölür**. Bu, tambur seçicilerde en sık yapılan ve en zor ayıklanan hatadır; test matrisinin 3., 5. ve 13. vakaları tam olarak bunu yakalar.

**`isUserScrolling` bayrağının yaşam döngüsü** (mevcut koddaki sıralama hatasının düzeltimi):
```
onScrollBeginDrag    → true
onMomentumScrollBegin→ true
settle(...)          → false  (emit'ten SONRA değil, ÖNCE sıfırlanmaz — bkz. aşağı)
prop efekti          → true ise ATLA
```
Mevcut `WheelTimePicker.tsx:62-64` `isUserScrolling.current = false` satırını `onSelect` çağrısından **önce** çalıştırıyor. Bu, ebeveyn prop'u geri geldiğinde efektin korumasını zaten düşürmüş oluyor ve gereksiz bir `scrollToOffset` tetikliyor. Zaman çarkında zararsız; tarih çarkında `lastExplicitDay` bozulması riski taşır. **Zorunlu sıra:** `emit(target)` → sonra `isUserScrolling.current = false`.

### 7.6 Dokunsal geri bildirim — pil ve his koruması

`haptics.selection()` her indeks değişiminde ateşlenirse, 126 yıllık bir çarkta hızlı bir fling **40+ titreşimi 300 ms içinde** üretir. Bu hem hoşa gitmez hem de pil tüketir.

```ts
const HAPTIC_MIN_INTERVAL_MS = 70;
const lastHapticAt = useRef(0);

const maybeHaptic = useCallback(() => {
  const now = Date.now();
  if (now - lastHapticAt.current < HAPTIC_MIN_INTERVAL_MS) return;
  lastHapticAt.current = now;
  haptics.selection();
}, [haptics]);
```

- `setTimeout` **kullanılmaz** → sızıntı yok, cleanup gerekmez, `Date.now()` karşılaştırması deterministik.
- **Yerleşimde** (`settle`, kaynak `user`) throttle **atlanır** ve her zaman tam bir `selection()` tetiklenir — kullanıcının nihai değeri hissetmesi garanti edilir.
- `useHaptics()` sarmalayıcısı **zorunludur** (`hooks/useHaptics.ts`), doğrudan `ReactNativeHapticFeedback` importu **yasaktır**. Sarmalayıcı kullanıcının `profile.hapticsEnabled` ayarına saygı gösterir; doğrudan import göstermez. Depoda bu kuralı ihlal eden 5 dosya var (`VoiceAddMedicineModal`, `MedicinePhotoChip`, `MedicineAddedCelebrationModal`, `useAlarmController`, `useTtsSettingsController`) — yeni kod bu hatayı tekrarlamaz.

### 7.7 Performans bütçesi

| Metrik | Hedef | Ölçüm yöntemi |
| :--- | :--- | :--- |
| Kaydırma sırasında JS-thread `setState` | indeks başına ≤1, kare başına değil | `onScroll` içinde tier değişmiyorsa setState çağrılmaz |
| Yeniden render edilen satır / indeks değişimi | ≤2 (5 görünürden) | `React.memo` + tier kovası |
| Render gövdesinde dizi/obje tahsisi | **0** | Kod incelemesi — INV-3 |
| Mount → ilk etkileşim | < 100 ms | `initialNumToRender={5}`, `windowSize={3}` |
| Tek fling → yayın sayısı | **tam olarak 1** | §7.3 velocity kapısı |
| Toplam öğe sayısı (3 sütun) | 31 + 12 + ~126 = 169 | FlatList pencereleme ile ~15'i canlı |

---

## 8. Erişilebilirlik (a11y) Sözleşmesi

### 8.1 🔴 Önce mevcut kusurun tespiti

`mobile/src/components/common/WheelTimePicker.tsx` **tamamen a11y-sessizdir**: 329 satırda tek bir `accessibilityRole`, `accessibilityLabel`, `accessibilityState` veya `accessible` prop'u yok.

Bu bileşen **ilaç zamanlama yolunda 5 yerden** çağrılıyor: `ReminderTimes.tsx:105` (ilaç hatırlatma saatleri), `QuietHoursSection.tsx:93,116`, `DailyScheduleSection.tsx:63,83`. Yani TalkBack kullanan görme engelli bir hasta **bugün uygulama içinde ilaç saati seçemiyor**.

Depoda ayrıca:
- `accessibilityRole="adjustable"` / `"spinbutton"` / `"slider"` için **sıfır** kullanım.
- `AccessibilityInfo` / `announceForAccessibility` / `accessibilityLiveRegion` için **sıfır** kullanım.
- Kullanılan roller: `"button"` (~100+), `"text"`, `"tab"`, `"alert"`, `"image"`.

Bu, hedef kitlesi yaşlı ve engelli hastalar olan bir ilaç hatırlatıcı için **ciddi bir uyum kusurudur** ve §11'de ayrı bir bulgu olarak raporlanmıştır. Yeni `WheelColumn` primitifi **a11y-tam** tasarlanır ki faz 2 göçü bu kusuru da kapatsın.

### 8.2 En kritik karar: TalkBack'in 126 yılı bir liste olarak okumasını engelle

Bir `FlatList` ekran okuyucuya doğal olarak *kaydırılabilir öğe listesi* olarak görünür. 126 yıllık bir çarkta TalkBack kullanıcısı, seçmek istediği yıla ulaşmak için **126 kez swipe** yapmak zorunda kalır. Bu kullanılamaz demektir.

**Zorunlu çözüm:**
```tsx
{/* Dış kapsayıcı = TEK a11y düğümü, "adjustable" rolü */}
<View
  accessible
  accessibilityRole="adjustable"
  accessibilityLabel={accessibilityLabel}          // 'Gün' | 'Ay' | 'Yıl'
  accessibilityValue={accessibilityValue}          // '15' | 'Mart' | '1970'
  accessibilityState={{ disabled: firstEnabled > lastEnabled }}
  onAccessibilityAction={handleAccessibilityAction}
  style={columnContainerStyle}
>
  <FlatList
    importantForAccessibility="no-hide-descendants"   // Android: alt ağacı gizle
    accessibilityElementsHidden                        // iOS: aynı etki
    ...
  />
  {/* çizgiler zaten pointerEvents="none" */}
</View>
```

`accessibilityRole="adjustable"` ile TalkBack/VoiceOver **dikey kaydırmayı** increment/decrement jestine dönüştürür ve `onAccessibilityAction`'a yönlendirir — `FlatList` hiç kaydırmaz. Bu tam olarak istenen davranıştır: görme engelli bir kullanıcının çarkı *fling* etmesi anlamsızdır, **deterministik tek adım** anlamlıdır.

### 8.3 `onAccessibilityAction` — zorunlu eylem sözleşmesi

```ts
const handleAccessibilityAction = useCallback(
  (e: NativeSyntheticEvent<AccessibilityActionNativeEvent>) => {
    switch (e.nativeEvent.actionName) {
      case 'increment':
        stepAndScroll(+1);
        break;
      case 'decrement':
        stepAndScroll(-1);
        break;
      case 'activate':            // TalkBack çift dokunuş
        // Seçili değeri onayla — modal bağlamında Tamam'a eşdeğer DEĞİLDİR,
        // yalnızca dokunsal geri bildirim verir. Sessiz no-op kabul edilebilir.
        haptics.selection();
        break;
    }
  }, [stepAndScroll, haptics]
);

const stepAndScroll = useCallback((delta: 1 | -1) => {
  const next = clampInt(selectedIndex + delta, firstEnabled, lastEnabled);
  if (next === selectedIndex) return;          // sarmalama YOK (§5.4 step)
  listRef.current?.scrollToOffset({ offset: next * itemHeight, animated: true });
  lastEmittedIndex.current = next;             // programatik → ama BİLİNÇLİ kullanıcı eylemi
  onSelect(next);                              // bu yüzden YAYINLANIR
  haptics.selection();
}, [selectedIndex, firstEnabled, lastEnabled, itemHeight, onSelect, haptics]);
```

> **İnce ama önemli ayrım:** `stepAndScroll` programatik bir `scrollToOffset` yapar **ve** yayınlar. INV-4'ün "programatik kaydırma yayınlamaz" kuralı *ebeveyn prop değişimi* için geçerlidir; burada kaynak doğrudan kullanıcı jestidir. Bu ayrım kodda yorumla belgelenmelidir, aksi halde gelecekteki bir geliştirici "INV-4 ihlali" sanıp yayını kaldırır ve a11y adımını öldürür.

**Sarmalama yasağının gerekçesi:** 31 Aralık'ta "artır" 1 Ocak'a dönerse, görme engelli bir kullanıcı yönünü kaybettiğinde **100+ yıl geriye** sarabilir ve bunu fark etmeyebilir. Klampalanmış adım her zaman güvenlidir.

### 8.4 `useScreenReader` — sızıntısız abonelik

```ts
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Ekran okuyucu durumunu izler. RN 0.81'de addEventListener bir
 * EmitterSubscription döner; remove() useEffect cleanup'ında ÇAĞRILMALIDIR.
 * `mounted` bayrağı unmount sonrası setState uyarısını engeller.
 */
export function useScreenReaderEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isScreenReaderEnabled()
      .then(v => { if (mounted) setEnabled(v); })
      .catch(() => { /* kritik değil — sessiz düş, varsayılan false kalır */ });

    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderStatusChanged',
      v => { if (mounted) setEnabled(v); }
    );

    return () => {
      mounted = false;
      subscription.remove();     // <-- ZORUNLU. Eksikse her modal açılışında bir dinleyici sızar.
    };
  }, []);

  return enabled;
}
```

**Bellek sızıntısı denetimi (Baş Denetçi zorunluluğu):** `WheelDatePickerModal` her açılışta mount, her kapanışta unmount olur. Cleanup'sız bir `addEventListener` kullanıcı doğum tarihini her düzenlediğinde kalıcı bir dinleyici biriktirir. Bu hook'un testi, `unmount()` sonrası ikinci bir `screenReaderStatusChanged` yayınının `setState` tetiklemediğini doğrulamalıdır.

### 8.5 Ekran okuyucu açıkken ek geri bildirim

Tambur görsel bir bileşendir; `adjustable` rolü değeri okur ama **bağlamı** okumaz. Ekran okuyucu etkinse tamburların üstüne bir özet satırı render edilir:

```tsx
{screenReaderEnabled && (
  <Text
    style={[styles.a11ySummary, { color: colors.text }]}
    accessibilityLiveRegion="polite"      // Android: değer değişince otomatik oku
    accessibilityRole="text"
  >
    {isTr
      ? `${day} ${MONTH_LABELS_TR_FULL[month - 1]} ${year}${age !== null ? `, ${age} yaşında` : ''}`
      : `${MONTH_LABELS_EN_FULL[month - 1]} ${day}, ${year}${age !== null ? `, ${age} years old` : ''}`}
  </Text>
)}
```

- `accessibilityLiveRegion="polite"` depoda ilk kullanımdır; Android'e özgüdür ve düşük risklidir (iOS'ta yok sayılır).
- Özet **tam** ay adını kullanır (`Mart`, değil `Mar`) — ekran okuyucu kısaltmaları yanlış telaffuz eder. Bunun için `MONTH_LABELS_TR_FULL` / `_EN_FULL` sabitleri eklenir (yine statik dizi, yine `Date` yok).
- Görsel olarak da gösterilir (yalnızca `sr-only` yapılmaz) — 1.3x yazı ölçeğinde tamburu takip edemeyen az gören kullanıcılar için de değerlidir.
- **`announceForAccessibility` yalnızca `onConfirm`'da** çağrılır, her tick'te değil. Her adımda duyuru yapmak ekran okuyucuyu kilitler.

### 8.6 Dokunma hedefleri ve yazı ölçeği

| Öğe | Zorunluluk |
| :--- | :--- |
| İptal / Tamam | `minHeight: MIN_TOUCH_TARGET` (44). Görsel kutu küçülmek zorundaysa `touchTargetHitSlop(görselYükseklik)` — kutuyu büyütmek **değil**, çünkü 130% yazı ölçeğinde sabit yükseklikli kutu metni kırpar (`theme/a11y.ts` belgelenmiş gerekçesi) |
| Satır dokunma alanı | 48px ≥ 44 ✅ — ek `hitSlop` gerekmez |
| Tüm metin | `clampFontSize()` tabanı 14. Tier-2 satır 18px ✅ |
| Yazı ölçeği | `maxFontSizeMultiplier={1.3}` tüm çark metinlerinde. `30 * 1.3 = 39px` → 48px satıra sığar, dolayısıyla satır yüksekliğini `PixelRatio` ile ölçeklendirmeye **gerek yoktur** (bu, INV-3 sabit dizi kimliğini de korur) |
| Kapatma/geri | `Modal.onRequestClose={onCancel}` — Android donanım geri tuşu zorunlu |

### 8.7 Kontrast

| Öğe | Zemin | Metin | Oran | Hüküm |
| :--- | :--- | :--- | :--- | :--- |
| Seçili (tier 0) | `card #1E293B` | `text #F8FAFC` | ~15.4:1 | ✅ AAA |
| ±1 (tier 1) | `card #1E293B` | `textSecondary #94A3B8` | ~6.4:1 | ✅ AA |
| ±2 (tier 2) | `card #1E293B` | `textMuted #64748B` | ~3.9:1 | ⚠️ AA-large (18px+ kalın değil, ama 18px ≥ 14pt → "large text" eşiği 18.66px normal / 14px kalın) |
| Devre dışı | `card #1E293B` | `textMuted` + `ALPHA.haze` | < 3:1 | ✅ **kasıtlı** — aşağıya bakın |

**Karar:** Seçili ve ±1 satırlar WCAG 1.4.3 AA'yı karşılamak **zorundadır**. ±2 satır 18px olduğundan "large text" eşiğine sınırda; token'lar `ThemeContext`'ten geldiği için kullanıcının vurgu/tema seçimine göre değişir ve statik bir hüküm verilemez. **Zorunluluk:** tier-2 için `textMuted` **taban** kabul edilir; `withAlpha` ile daha da soluklaştırılması yalnızca **devre dışı** öğelerde uygulanır.

Devre dışı öğelerin düşük kontrastı **WCAG 1.4.3 istisnasıdır** ("inactive user interface component") — bilinçli ve doğru bir tasarım kararıdır, kusur değildir. Ancak devre dışı durumu **yalnızca renkle** iletilmez: `accessibilityState={{ disabled: true }}` ekran okuyucuya, dokunmanın reddedilmesi ise dokunsal olarak iletir. WCAG 1.4.1 (Use of Color) böylece karşılanır.

### 8.8 A11y kabul kriterleri

- [ ] TalkBack ile 3 sütunun her biri tek odak düğümü olarak okunur; 126 yıl tek tek okunmaz.
- [ ] Her sütun için okunan değer: `"Gün, 15, ayarlanabilir"` / `"Ay, Mart, ayarlanabilir"` / `"Yıl, 1970, ayarlanabilir"`.
- [ ] TalkBack yukarı/aşağı swipe → değer ±1 değişir, sarmalama yapmaz, dokunsal geri bildirim verir.
- [ ] `2024-01-31` iken Ay sütununda decrement → `"Ay, Şubat"` ve özet satırı `"29 Şubat 2024"` (gün otomatik klamplandı).
- [ ] Devre dışı bir güne dokunulduğunda en yakın etkin güne düzelir.
- [ ] İptal/Tamam `"İptal, düğme"` / `"Tamam, düğme"` olarak okunur, dokunma alanı ≥44dp.
- [ ] Android geri tuşu İptal ile aynı davranır ve hiçbir şey commit etmez.
- [ ] Yazı ölçeği 130% iken hiçbir satır metni kırpılmaz.
- [ ] Ekran okuyucu KAPALI iken özet satırı görünür ama davranış değişmez.

---

## 9. Mevcut Kodda Tespit Edilen Hatalar (Bug Register)

Bu görev sırasında okunan kodda bulunan gerçek kusurlar. **B1, B3, B6 ve B9 bu sözleşmenin kapsamındadır**; diğerleri takip maddesidir.

| # | Konum | Şiddet | Kusur | Bu sözleşmedeki çözüm |
| :-- | :--- | :--- | :--- | :--- |
| **B1** | `MedicalIdModal.tsx:549-557` | **Yüksek** | Native `<DateTimePicker>`'a `locale` prop'u geçilmiyor → seçici **cihaz** locale'inde render oluyor, uygulama dilinde değil. Cihazı İngilizce olan Türkçe kullanıcı formda `Jan/Feb` görür. `ExpirySection.tsx:194` bunu doğru yapıyor — iki dosya tutarsız. | **§0.4 kök neden.** Ay etiketleri `useLanguage()`'tan türetilen statik diziler; cihaz locale'i hiç okunmaz. |
| **B2** | `WheelTimePicker.tsx:130-136` | Düşük | `snapToInterval` **ve** `snapToOffsets` birlikte geçirilmiş; ikincisi kazanır, birincisi sessizce yok sayılır. `snapOffsets` `useMemo([data])` her `data` kimlik değişiminde 60 elemanlık dizi tahsis eder. | §7.1 — yalnızca `snapToInterval`. |
| **B3** | `WheelTimePicker.tsx:80-86` | **Yüksek** | `onScrollEndDrag` **parmak kalkma anında** `settleToIndex` çağırıyor — momentum nihai konuma taşımadan önce. Tek fling → iki `onSelect` yayını, ilki kullanıcının hiç durmadığı bir *ara* indeks. | **§7.3** velocity kapısı (`velocity.y < 0.05` ise yerleş, aksi halde momentum bekle). Zamanlayıcısız, deterministik. |
| **B4** | `WheelTimePicker.tsx:62-64` | Orta | `isUserScrolling.current = false` ataması `onSelect` çağrısından **önce**. Ebeveyn prop'u geri döndüğünde senkronizasyon efekti (`:41-52`) koruması zaten düşmüş oluyor → gereksiz `scrollToOffset`. Tarih çarkında bu, `lastExplicitDay` bozulmasına yol açar. | **§7.5** — zorunlu sıra: `emit` → sonra bayrak sıfırla. INV-4 programatik yayını yasaklar. |
| **B5** | `WheelTimePicker.tsx:37` | Düşük | `useRef<FlatList>(null)` → `FlatList<any>`, `renderItem`'da `item: any`. Strict TypeScript kaybı. | §4.1 `labels: readonly string[]` ile tam tipli. |
| **B6** | `MedicalIdModal.tsx:524-531` | **Orta** | Kuşak çipleri `setBirthDate(\`${decadeYear}${currentMonthDay}\`)` çağırıp **sonra** seçiciyi açıyor → kullanıcı hiçbir şey onaylamadan düzenleme-formu durumuna tarih **commit ediliyor**. Native diyalog iptal edilirse onaylanmamış `YYYY-01-01` değeri kalıyor. | **§10.1** — çipler kaldırılır veya `initialYear` ipucuna dönüştürülür; INV-2 işlemselliği. |
| **B7** | `MedicalIdModal.tsx:507` | Kozmetik | `String(decadeYear).slice(0, 3)` → `"198"` önek eşleşmesi. Sonuç doğru ama niyet belirsiz; sayısal aralık kontrolü olmalı. | §10.1 — çip kaldırılırsa moot. |
| **B8** | `WheelTimePicker.tsx:203-224` | Düşük | `parseInitialTime()` render gövdesinde çağrılıyor (her render'da tahsis) ve `useEffect([parseInitialTime])` üzerinden senkronize ediliyor. `value` inline kurulmuş bir `Date` ise her render'da yeniden çalışır. | §4.2 `value: string` — normalize edilmiş string üzerinde tek `useMemo`. |
| **B9** | `WheelTimePicker.tsx` (tüm dosya) | 🔴 **Kritik** | **Sıfır erişilebilirlik.** 329 satırda tek bir `accessibilityRole`/`Label`/`State` yok. İlaç zamanlama yolunda 5 çağrı noktası (`ReminderTimes.tsx:105` dahil) → TalkBack kullanıcısı **ilaç hatırlatma saati seçemiyor**. | **§8** — yeni primitif a11y-tam. Mevcut dosyanın göçü **faz 2** (§11); ayrı bir karar gerektirir. |
| **B10** | `WheelTimePickerModal.tsx` | Düşük | Alt-çıpalı (`justifyContent: 'flex-end'`) ama `animationType="fade"`; `ModalSheet` (kanonik, `"slide"`) kullanılmıyor, safe-area elle tekrarlanıyor. | ADR-05 — yeni modal `ModalSheet` kullanır. |
| **B11** | `MedicalIdModal.tsx:549-557` | Orta | `maximumDate={new Date()}` **ama** yıl tabanı `minimumDate={new Date(1910,0,1)}` → 2026'da 116 yıllık bir çark; ve `new Date()` her render'da yeniden kurulur. 2027'de bir **yenidoğan** (bugün doğmuş) `maximumDate` yüzünden seçilebilir kalır ama bebek dozajı için ay/gün hassasiyeti kritiktir. | **§10.2** — `max = isoToParts(getLocalDateKey(new Date()))`, `min = max.year - 125` (`MAX_AGE_YEARS`, `calculateAge`'in 125 sınırıyla hizalı). Asla bayatlamaz. |
| **B12** | `MedicalIdModal.tsx:513-521` | Orta | Kuşak çipi yalnızca `-01-01` üretiyor: mevcut `birthDate` geçersiz/boşsa `currentMonthDay = '-01-01'`. Kullanıcı "1980'ler"e basınca **1 Ocak 1980** commit ediliyor — ay/gün bilgisi kayboluyor. | §10.1 — çip kaldırılır. |

### 9.1 Bu sözleşmenin kendi sınırları (dürüst beyan)

- **Kaydırma fiziği birim test edilemez.** `jest.setup.js` FlatList'i eager render eden bir mock'a indirgiyor ve Reanimated'ı noop'lıyor. §7'nin velocity kapısı, tier kovası ve snap davranışı **kod incelemesi + fiziksel cihaz doğrulamasıyla** mühürlenmek zorundadır (§10.4). Bu bir test boşluğudur ve kapatılamaz; gizlenmemelidir.
- **`EXACT_ALARM`/Doze/OEM pil etkisi yoktur.** Bu bileşen tamamen UI katmanındadır; alarm zamanlama zincirine dokunmaz. ZCode'un Android çekirdek kalkanı incelemesi gerekmez — yalnızca §12'deki OEM a11y/`PixelRatio` soruları gerekir.
- **Firestore şeması değişmez.** `birthDate` zaten `yyyy-MM-dd` string; INV-1 aynı biçimi üretir. **Migrasyon gerekmez**, dolayısıyla bu bir MAJOR değil MINOR sürümdür.

---

## 10. Entegrasyon Sözleşmesi

### 10.1 `MedicalIdModal.tsx` değişiklikleri

**Kaldırılacak:**
- Satır 23: `import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';`
- Satır 91-103: `handleDateChange`
- Satır 105-113: `getInitialDatePickerDate`
- Satır 494-545: `quickDecadeContainer` bloğu (kuşak çipleri) — **B6/B12'nin kaynağı**. Tambur çarkta 126 yıl zaten tek fling ile kat edilebilir; çipler gereksizdir ve işlemselliği bozar.
- Satır 549-557: `{showDatePicker && <DateTimePicker ... />}`
- İlgili ölü stiller: `quickDecadeContainer`, `quickDecadeTitle`, `decadeScroll`, `decadeChip`, `decadeChipText`
- `Platform` importu başka yerde kullanılmıyorsa temizlenir (`eslint-plugin-unused-imports` zaten kurulu)

**Eklenecek:**
```tsx
import { WheelDatePickerModal } from '../common/wheel';

// state: showDatePicker KALIR (adı artık isBirthDatePickerOpen olabilir — opsiyonel)
// handleDateChange ve getInitialDatePickerDate YERİNE:

const handleConfirmBirthDate = useCallback((iso: string) => {
  setBirthDate(iso);          // taslak form durumu — store'a YAZMAZ
  setShowDatePicker(false);
}, []);

const handleCancelBirthDate = useCallback(() => {
  setShowDatePicker(false);   // INV-2: birthDate DEĞİŞMEZ
}, []);

// render — DateTimePicker'ın olduğu yere:
<WheelDatePickerModal
  visible={showDatePicker}
  value={birthDate}
  range={BIRTH_DATE_RANGE}          // §10.2
  title={isTr ? 'Doğum Tarihi' : 'Birth Date'}
  onConfirm={handleConfirmBirthDate}
  onCancel={handleCancelBirthDate}
/>
```

**Korunacak:**
- `calculateAge` ve `formatBirthDateDisplay` (satır 31-52) — okuma modundaki profil kartı bunları kullanıyor. `ageFromParts` bunların **yerine geçmez**, yalnızca çarkın iç özet satırı için kullanılır. İki implementasyonun tutarlılığı §10.3'te test edilir.
- `datePickerContainer` / `datePickerButton` tetikleyicisi ve `clearDateBtn` — yalnızca açtıkları şey değişir.
- `ageBadge` anlık yaş göstergesi.

### 10.2 Varsayılan aralık — bayatlamayan "bugün"

```ts
import { getLocalDateKey } from '../../domain/doseLog';   // ESLint'in zorunlu kıldığı yardımcı (doseLog.ts:52)
import { isoToParts, partsToIso, clampInt } from '../../domain/dateParts';
import { makeDateRange, MAX_AGE_YEARS, ABSOLUTE_MAX_YEAR } from '../../domain/wheelDateModel';

/**
 * B11'in çözümü: sabit 1910..2026 YAZILMAZ.
 * max = bugün (yerel, UTC tuzağı yok), min = bugünden MAX_AGE_YEARS önce.
 * `calculateAge` (MedicalIdModal.tsx:38) zaten age <= 125 kabul ediyor → hizalı.
 *
 * `useMemo(() => ..., [])` ile modal her açıldığında bir kez hesaplanır.
 * Uygulama gece yarısını crossed ederken açık kalırsa 1 günlük sapma olur;
 * doğum tarihi için önemsiz (ExpirySection için §10.3'te ayrıca ele alınır).
 */
export function useBirthDateRange() {
  return useMemo(() => {
    const todayParts = isoToParts(getLocalDateKey(new Date()));
    if (!todayParts) return null;                      // imkânsız ama toplam fonksiyon
    const minYear = clampInt(todayParts.year - MAX_AGE_YEARS, 1000, ABSOLUTE_MAX_YEAR);
    return makeDateRange(
      { year: minYear, month: 1, day: 1 },
      todayParts                                        // BUGÜN DAHİL — yenidoğan geçerli
    );
  }, []);
}
```

> **Klinik karar (ZCode onayı gerekli):** `max = bugün` **dahil**. Bir yenidoğanın doğum tarihi bugün olabilir ve bebek/çocuk dozajı için bu alan kritiktir. `max = dün` yapmak yenidoğan kaydını imkânsız kılar. Mevcut `maximumDate={new Date()}` de bugünü dahil ediyor → davranış korunur, regresyon yok.

### 10.3 Faz 1 kapsamı DIŞI — ama sözleşmesi hazır

**`ExpirySection.tsx:188`** ikinci tüketicidir ve zıt yönlü bir aralık kullanır:
```ts
range = { min: today, max: shiftYears(today, 10) }   // yalnızca gelecek
```
`shiftYears(parts, n)` saf bir yardımcı olarak `wheelDateModel.ts`'e **faz 1'de eklenir** (maliyeti 6 satır), ama `ExpirySection` entegrasyonu **faz 2'ye** bırakılır. Gerekçe: `ExpirySection` son kullanma hatırlatma alarmı üretiyor (`expiryReminderDays`) ve alarm yoluna aynı sürümde iki ayrı değişiklik yapmak regresyon yüzeyini gereksiz büyütür.

**Bağımlılık temizliği (faz 3):** Her iki native tarih seçicisi de göç edince, kalan 5 dosya yalnızca `DateTimePickerEvent` **tipini** kullanıyor olacak. O tip `{ type: 'set' | 'dismissed' }` şeklindeki sahte event'lerle zaten anlamsızlaşmış durumda. Faz 3'te bu callback imzaları sadeleştirilir (`(iso: string) => void`) ve `@react-native-community/datetimepicker` bağımlılığı **tamamen kaldırılabilir**. Bu bir **kırıcı değişiklik** değildir (iç API) ama 5 dosyayı etkilediğinden ayrı bir MINOR sürümde yapılmalıdır.

### 10.4 Fiziksel cihaz doğrulama protokolü (Anti Agent — zorunlu)

Birim testlerin kapsayamadığı §7 fiziği burada mühürlenir. Her iki cihazda da:

| # | Senaryo | Cihaz | Beklenen |
| :-- | :--- | :--- | :--- |
| D1 | Yıl çarkında hızlı fling (1970 → 2010) | Tab S7 FE + Xiaomi | Tek yerleşim, tek dokunsal, ara değer titremesi yok |
| D2 | `31 Ocak` → Şubat'a kaydır | her ikisi | Gün otomatik `28`'e düşer, çark **zıplamaz**, satır sayısı değişmez |
| D3 | Vaka D2 sonrası → Ocak'a geri kaydır | her ikisi | Gün **`31`'e geri döner** (INV-4 kanıtı — bu geçerse reducer doğru) |
| D4 | Şubat'ta `28`'i **bilerek** seç → Ocak'a git | her ikisi | Gün `28` kalır (31'e dönmez) |
| D5 | Devre dışı `31 Şubat`'a dokun | her ikisi | `28`'e düzelir, çökme yok |
| D6 | TalkBack AÇIK: Ay sütununda yukarı/aşağı swipe | her ikisi | Değer ±1, `126 yıl tek tek okunmuyor` |
| D7 | TalkBack AÇIK: Tamam'a çift dokun | her ikisi | Değer commit, modal kapanır |
| D8 | Yazı ölçeği %130 + Ekran yakınlaştırma açık | Tab S7 FE (Samsung'a özgü) | Satır metni kırpılmıyor, çizgiler hizalı |
| D9 | Karanlık/aydınlık tema geçişi modal açıkken | her ikisi | Renkler anında token'dan güncellenir, hardcoded hex kalıntısı yok |
| D10 | Vurgu rengini teal → turuncu değiştir | her ikisi | İptal/Tamam ve seçim çizgileri yeni vurguya uyar (`AccentContext` kanıtı) |
| D11 | `MedicalIdModal`'ın `ScrollView`'i içinde çarkı kaydır | her ikisi | `nestedScrollEnabled` çalışıyor, dış ScrollView çarkın jestini çalmıyor |
| D12 | Modal açıkken Android geri tuşu | her ikisi | `onCancel` — `birthDate` **değişmiyor** |
| D13 | 00:00–03:00 arasında (TR saati) `max` yılı kontrol | Tab S7 FE, saat elle ayarlanır | Bugünün yılı doğru — **UTC gün tuzağı yok** (INV-1 kanıtı) |
| D14 | Ekran görüntüsü: koyu tema, 3 sütun, mavi seçim çizgileri, İptal/Tamam | her ikisi | Kullanıcının referans görseliyle eşleşir |

---

## 11. Uygulama Sırası ve Sürümleme

### Faz 1 — `v2.1.0` / `versionCode 75` (bu görev)

| Adım | İş | Bağımlılık |
| :-- | :--- | :--- |
| 1.1 | `domain/dateParts.ts` + `__tests__/domain/dateParts.test.ts` | — |
| 1.2 | `domain/wheelDateModel.ts` + `__tests__/domain/wheelDateModel.test.ts` (**20 vaka + property test**) | 1.1 |
| 1.3 | `components/common/wheel/constants.ts`, `useScreenReader.ts` | — |
| 1.4 | `WheelItem.tsx` (React.memo + tier) | 1.3 |
| 1.5 | `WheelColumn.tsx` (FlatList + settle + a11y adjustable) | 1.4 |
| 1.6 | `WheelDatePicker.tsx` (useReducer + 3 sütun) | 1.2, 1.5 |
| 1.7 | `WheelDatePickerModal.tsx` (ModalSheet + İptal/Tamam) + barrel | 1.6 |
| 1.8 | `__tests__/components/common/WheelDatePicker.test.tsx` | 1.7 |
| 1.9 | `MedicalIdModal.tsx` entegrasyonu + kuşak çiplerinin kaldırılması | 1.7 |
| 1.10 | `MedicalIdModal.test.tsx` güncelleme (DateTimePicker mock'u kaldırılır, `1980'ler kuşak seçimi` testi silinir) | 1.9 |
| 1.11 | `components/common/index.ts` barrel'e ekle | 1.7 |
| 1.12 | `npm test` (212 suite / 2213 test) + `npx tsc --noEmit` + `npm run lint` | tümü |
| 1.13 | Fiziksel cihaz doğrulama D1–D14 | 1.12 |
| 1.14 | `CHANGELOG.md`, `docs/archive/v2.1.0_...md`, `ARCHIVE_INDEX.md`, Play Store notu | 1.13 |

> **Adım 1.10 uyarısı:** `MedicalIdModal.test.tsx:63`'te `fireEvent.press(getByLabelText("1980'ler kuşak seçimi"))` var. Kuşak çipleri kaldırılınca bu test **başarısız olur** — silinmeli, yerini çark üzerinden tarih seçme testi almalıdır. Bu beklenen bir değişikliktir, bir regresyon değil.

### Faz 2 — `v2.2.0` (hemen sonra, ayrı sürüm)

| Adım | İş | Risk |
| :-- | :--- | :--- |
| 2.1 | `WheelTimePicker` → paylaşılan `WheelColumn`'a göç (**B9 kritik a11y kusurunu kapatır**) | **Orta** — ilaç zamanlama yolu, 5 çağrı noktası |
| 2.2 | `ExpirySection` → `WheelDatePickerModal` (min = bugün) | Düşük |
| 2.3 | `WheelTimePickerModal` → `ModalSheet` (**B10**) | Düşük |
| 2.4 | `ModalSheet` backdrop rengini `colors.overlay` token'ına taşı | Düşük |

### 🔴 Faz 2 hakkında Baş Denetçi görüşü — karar kullanıcıda

**B9 (WheelTimePicker'ın sıfır a11y'si) bu sözleşmeden bağımsız, önceden var olan kritik bir kusurdur** ve hedef kitlesi yaşlı/engelli hastalar olan bir ilaç hatırlatıcıda TalkBack kullanıcısının **ilaç saati seçememesi** anlamına gelir.

İki seçenek var:

| Seçenek | Gerekçe | Risk |
| :--- | :--- | :--- |
| **A — Faz 2'yi bekle (önerilen)** | Faz 1 temiz, izole ve düşük riskli kalır. Yeni primitif a11y-tam olduğu için faz 2 bir *drop-in* göçtür ve tek başına `v2.1.1` PATCH olarak hızla çıkarılabilir. | B9 bir sürüm daha canlıda kalır |
| **B — B9'u faz 1'e çek** | Kritik a11y kusuru hemen kapanır. | İlaç zamanlama yoluna aynı sürümde dokunulur; `WheelTimePickerModal`'ın 5 çağrı noktası (`ReminderTimes` dahil) yeniden test edilmelidir. Regresyon, alarmın hiç çalmaması demek olabilir. |

**Benim önerim A**, ama B9'un canlıda kalma süresini en aza indirmek için **faz 2'nin faz 1'den hemen sonra, araya başka özellik alınmadan** yapılması. Bu bir öncelik kararıdır ve ürün sahibine aittir.

### Faz 3 — `v2.3.0`
`DateTimePickerEvent` sahte-event imzalarının 5 dosyada sadeleştirilmesi ve `@react-native-community/datetimepicker` bağımlılığının kaldırılması (§10.3).

### SemVer gerekçesi (AGENTS.md §3 karar ağacı)
- 🔴 MAJOR **değil**: Firestore/AsyncStorage şeması değişmiyor (`birthDate` zaten `yyyy-MM-dd`), migrasyon yok, public store API'si aynı.
- 🟡 **MINOR — `2.0.2 → 2.1.0`**: geriye dönük uyumlu **yeni modül paketi** (`domain/dateParts`, `domain/wheelDateModel`, `components/common/wheel/`) ve kullanıcıya görünür yeni özellik (tambur tarih seçici). AGENTS.md'nin "yeni özellik ve modüller" tanımıyla birebir örtüşüyor.
- 🟢 PATCH **değil**: yalnızca hata düzeltmesi değil, yeni bileşen ailesi ekleniyor.
- `versionCode`: `74 → 75`.
- Conventional Commit: `feat(medical-id): replace native date picker with accessible wheel date picker`

---

## 12. 🧠 ZCode'a Devredilen Sorular (Klinik + Android OEM)

Bu sözleşme mimari/tip/performans/a11y yetkisiyle yazıldı. Aşağıdaki 6 madde **ZCode'un uzmanlık alanında** ve faz 1 icrası başlamadan önce cevaplanmalıdır:

| # | Soru | Neden ZCode |
| :-- | :--- | :--- |
| **Z1** | `MAX_AGE_YEARS = 125` tıbbi olarak doğru taban mı? 125 yaş üstü bir hasta kaydı meşru olabilir mi (ör. torununun hesabından yönetilen bir büyük ebeveyn)? | Klinik iş kuralı |
| **Z2** | `max = bugün (dahil)` kararı doğru mu? Yenidoğan/bebek dozajı için doğum tarihi = bugün geçerli bir kayıt mı, yoksa `max = bugün - 1` mi olmalı? | Klinik iş kuralı |
| **Z3** | **29 Şubat doğumlu hastalar:** artık olmayan yıllarda doğum günü 28 Şubat mı 1 Mart mı kabul edilmeli? `ageFromParts` şu an **28 Şubat** diyor. Bu, yaşa bağlı dozaj veya yetişkin/çocuk sınırı (`currentAge`) için kritik mi? | Klinik iş kuralı — potansiyel dozaj etkisi |
| **Z4** | Samsung One UI (Galaxy Tab S7 FE, `R52TB0HJREP`) ve MIUI/HyperOS (Xiaomi, `43cebdf1`) üzerinde `accessibilityRole="adjustable"` + `onAccessibilityAction` davranışı standart AOSP TalkBack ile aynı mı? OEM erişilebilirlik katmanları bilinen bir sapma gösteriyor mu? | Android OEM uzmanlığı |
| **Z5** | Samsung'un "Yazı boyutu" **ve** "Ekran yakınlaştırma" ayarları *birlikte* etkinken `PixelRatio.getFontScale()` ne döndürür? `maxFontSizeMultiplier={1.3}` tavanı bu cihazda metni kırpar mı, yoksa sabit 48px satır yeterli mi? | Android OEM uzmanlığı — D8 senaryosu |
| **Z6** | `MedicalIdModal`'ın dış `ScrollView`'i içinde `nestedScrollEnabled` bir `FlatList` çarkı: One UI'da bilinen bir jest çakışması var mı? `requestDisallowInterceptTouchEvent` gerekir mi? | Android OEM uzmanlığı — D11 senaryosu |

**KVKK notu (ZCode + hukuki):** `birthDate`, `showOnLockScreen` ile kilit ekranında gösterilebiliyor ve `medicalIdStore` AsyncStorage'da **şifrelenmemiş** duruyor (`ilac_medical_id_v1` anahtarı, `createJSONStorage(() => AsyncStorage)`). Doğum tarihi 6698 sayılı KVKK kapsamında kişisel sağlık verisiyle ilişkili özel nitelikli bir alandır. Bu sözleşme o durumu **değiştirmez** (kapsam dışı), ama ayrı bir güvenlik bulgusu olarak raporlanmalıdır: depo `expo-secure-store ^15.0.8`'i zaten bağımlılık olarak içeriyor, dolayısıyla ICE verisinin SecureStore'a taşınması teknik olarak hazır.

---

## 13. Bağlayıcı Invariant Özeti (Kod İncelemesi Kontrol Listesi)

Anti Agent kodu teslim ettiğinde Baş Denetçi bu listeyi uygulayacaktır:

| # | Invariant | İhlalinin sonucu |
| :-- | :--- | :--- |
| **INV-1** | `WheelDatePicker`, `WheelColumn`, `dateParts.ts`, `wheelDateModel.ts` içinde **hiçbir yerde** `new Date(...)` kurulmaz. Tek istisna: `useBirthDateRange` içinde `getLocalDateKey(new Date())`. | UTC gün tuzağı — §0.6'da belgelenen 5 üretim hatasının sınıfı |
| **INV-2** | `onCancel` çağrıldığında `onConfirm` çağrılmaz; taslak durum sızmaz. Backdrop, İptal ve Android geri tuşu aynı yolu izler. | Onaylanmamış tarih commit edilir (B6'nın tekrarı) |
| **INV-3** | `WheelColumn.labels` dizisinin kimliği render'lar arasında değişmez. Render gövdesinde dizi/obje tahsisi **sıfır**. | FlatList prop değişimi → kaydırma konumu sıfırlanır, çark kullanıcı parmağının altında zıplar |
| **INV-4** | Ebeveyn prop değişiminden kaynaklanan programatik `scrollToOffset` **asla** `onSelect` yayınlamaz. | `lastExplicitDay` bozulur → "31 Ocak'a dönünce 31 geri gelir" davranışı ölür (D3 testi başarısız olur) |
| **INV-5** | Aynı indeks için ardışık `onSelect` çağrıları tekilleştirilir. Tek fling = tek yayın. | Reducer'a çift dispatch, çift dokunsal, ara değer titremesi (B3'ün tekrarı) |
| **INV-6** | `clampInt(v, min, max)` `max < min` iken `min` döner; `nearestEnabledIndex` boş/dejenere aralıkta deterministiktir. Hiçbir koşulda `NaN` veya dizi dışı indeks üretilmez. | Çökme veya sonsuz render döngüsü |
| **INV-7** | Sütun listelerinin **uzunluğu asla değişmez** (gün 31, ay 12, yıl sabit). Geçersiz değerler çıkarılmaz, devre dışı bırakılır. | ADR-02'nin tüm kazanımları kaybolur; kaydırma sıfırlanması geri gelir |
| **INV-8** | Ay etiketleri `useLanguage()`/`isTr`'den gelir. Cihaz locale'i **hiç okunmaz**. | B1'in tekrarı — Türkçe formda `Jan` |
| **INV-9** | Renkler yalnızca `colors.*` token'ları + `withAlpha`/`ALPHA`. Hardcoded hex **yasak**. Boşluk/yarıçap `theme/tokens.ts`. | Vurgu rengi/tema değişince bileşen uyumsuz kalır; `WheelTimePicker`'ın mevcut borcu tekrarlanır |
| **INV-10** | `useHaptics()` sarmalayıcısı kullanılır; doğrudan `ReactNativeHapticFeedback` importu **yasak**. | Kullanıcının `hapticsEnabled` ayarı yok sayılır |
| **INV-11** | `AccessibilityInfo.addEventListener` aboneliği `useEffect` cleanup'ında `remove()` edilir. `setTimeout`/`setInterval` **kullanılmaz**. | Her modal açılışında kalıcı dinleyici sızar |
| **INV-12** | Her çark satırı `fontVariant: ['tabular-nums']` taşır. | Kaydırma sırasında rakam genişliği değişir → yatay zıplama |
| **INV-13** | `domain/*` modülleri `react`/`react-native`/`date-fns` **import etmez**. | Saf mantık `node` test ortamında mock'suz test edilemez hale gelir |
| **INV-14** | Reducer her eylemden sonra `isValidParts(state.parts) === true` üretir (property test ile kanıtlanır). | `2023-02-29` gibi takvimde olmayan bir tarih store'a yazılır |

---

*Sözleşme sonu. İcra yetkisi 🛡 Anti Agent'tadır; kod kalitesi/güvenlik/tip nihai onayı ⚡ Qwen 3.8 Max'te, §12'deki klinik ve OEM soruları 🧠 ZCode'dadır.*
