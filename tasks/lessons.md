# Lessons Learned (Bu Oturumdan)

## 1. PIN hash iterasyon adı yanıltıcıydı
**Hata:** `PBKDF2_ITERATIONS = 100000` tanımlı ama implementasyon `/ 1000` → sadece 100 round.
**Öğrenme:** Sabit isimlendirme yanıltıcı olabilir. Düzeltme: `PIN_HASH_ROUNDS = 10_000` (adlandırma + sayı net), yorumda "PBKDF2 değil" diye açıkça belirt. İleride native modül (bcrypt/PBKDF2-HMAC) entegrasyonu ile upgrade path'i açık.

## 2. JavaScript'te PBKDF2 gerçekçi değil
**Gözlem:** 600k SHA-256 round JS bridge ile (her call async native) **dakikalarca** sürer. UX felaketi.
**Öğrenme:** Mobile JS'te "PBKDF2 600k" OWASP önerisi uygulanamaz. Native modül (react-native-keychain, react-native-bcrypt) veya 10k-100k round + constant-time comparison + secure storage yeterli güvenlik sağlar. **Trade-off:** Güvenlik vs UX — 10k round + lockout (5 deneme/5dk) yeterince güçlü.

## 3. React Native test ortamı için "node" yeterli mi?
**Bulgular:** Mevcut `testEnvironment: 'node'` çoğu test için çalışıyor çünkü `jest.setup.js`'te native modüller mock'lanmış. Yeni ekran testleri (LoginScreen) için `react-native` mock'u test dosyasında zorunlu.
**Öğrenme:** RN testleri için global mock setup (jest.setup.js) + per-test `jest.mock('react-native', ...)`. `jsdom`'a geçiş **büyük refactor** gerektirir — sadece ekran testlerinde local RN mock yeterli.

## 4. `transform-remove-console` test'leri kırabilir
**Hata:** Plugin test ortamında da çalıştı, logger test FAIL etti.
**Düzeltme:** `process.env.JEST_WORKER_ID !== undefined` veya `NODE_ENV === 'test'` ile plugin'i sadece production'da uygula.
**Öğrenme:** Babel plugin'leri environment-aware olmalı. Test'te `console.log` assert eden testler var — plugin bunları kaldırmamalı.

## 5. `useShallow` shallow equality sağlar ama recompute engellemez
**Gözlem:** `useTodayReminders` her render'da yeni array döner (içeride filter+sort). `useShallow` ile **re-render engellenir** ama **hesaplama her seferde yapılır**.
**Öğrenme:** True memoization için derived state'i `useMemo` ile dependency-based cache'le veya store selector'ı memoized hale getir. `useShallow` sadece referans eşitliği sağlar.

## 6. getByText vs getAllByText: metin tekrarı
**Hata:** LoginScreen'de hem başlık hem buton "Giriş Yap" içeriyor; `getByText` "multiple elements" hatası verdi.
**Çözüm:** `getAllByText` ile ilgili elementi (button) hedefle veya `testID` ekle.
**Öğrenme:** RN ekranlarında `testID` yaygın olmalı — sorgulanabilirlik için değerli.

## 7. safe-area-context native bridge gerektirir
**Hata:** LoginScreen test'i "Invariant Violation: __fbBatchedBridgeConfig is not set" hatası verdi.
**Çözüm:** `jest.setup.js`'te `react-native-safe-area-context` mock'u (SafeAreaView → plain function).
**Öğrenme:** jsdom ortamında **tüm** native module kullanan paketler mock'lanmalı — bu kapsamlı bir liste gerektirir. Merkezi `jest.setup.js` doğru yer.

## 8. Kullanıcı "tüm sorunları çöz" istedi — scope netleştirme şart
**Gözlem:** 50+ sorun tek oturumda gerçekçi değil. Kullanıcı onayı ile "Kritik+Yüksek" kapsam seçildi.
**Öğrenme:** Geniş scope taleplerinde hemen plan moduna geçip kullanıcıdan onay al. "Hepsini çöz" yerine "Kritik+Yüksek" gibi net scope ile ilerle, kalan için roadmap bırak. **İlk analiz sonrası bile** scope netleştirme gerekebilir — kod içinde yeni engeller çıkabilir (örn. App.tsx refactor dependency karmaşıklığı).

## 9. Firestore rules `matches()` regex: pattern anchor
**Not:** `[A-Za-z0-9...]+` ile yazılan pattern otomatik olarak full-string match yapar (Firestore'da). Yani `^...$` eklemeye gerek yok.
**Öğrenme:** Firestore rules syntax'ı standart regex'den farklı olabilir; test etmek zor (emulator gerekli).

## 10. PRD/scope kararı: hook test'leri için
**Karar:** `useAddMedicine` hook testi yazmaktan vazgeçtim — 431 satır, 6+ dependency, mock karmaşıklığı yüksek. Mevcut `AddMedicineScreen.test.tsx` (631 satır, 7 integration test) zaten hook'u gerçek kullanımda test ediyor.
**Öğrenme:** Test yazarken "pure unit test" her zaman değerli değil. Integration test zaten hook davranışını doğruluyorsa, ayrıca hook unit test yazmak duplicate olur. **Yatırım getirisi:** Hangi test daha çok regression yakalar?

---

## Uygulanan Kurallar (Bu Oturumdan)

1. **Scope netleştir önce, sonra kod yaz.** "Tüm sorunları çöz" gibi geniş taleplerde hemen plan moduna geç.
2. **Her refactor için davranış değişmemeli.** App.tsx parçalama riski yüksek olduğu için roadmap'e bırakıldı.
3. **Test'lerde mock zinciri:** jsdom + RN mock + safe-area mock + screens mock. Setup'a ekle.
4. **Babel plugin'leri environment-aware olmalı.** Test'te kaldırılan console.log assertion'ları kırar.
5. **PIN/şifre hash için UX trade-off'u:** 600k SHA-256 JS'te kullanışsız. 10k + lockout + SecureStore + constant-time yeterli.
6. **Coverage threshold mevcut coverage'nin biraz altında tut:** CI yanlışlıkla kırmasın; kademeli arttır.
7. **Memoization iki katmanlı:** useShallow (referans) + useMemo (hesaplama). Sadece biri yeterli değil.