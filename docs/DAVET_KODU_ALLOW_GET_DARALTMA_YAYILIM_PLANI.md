# 📅 2c Yayılım Planı — `caregiverInvites` `allow get` Daraltması

> **Durum:** ⏳ **BEKLİYOR** — uygulanabilir, ama **şimdi uygulanmamalı**
> **Hazırlanma:** 2026-09-09
> **İlgili commit'ler:** `aec9144` (rules K1/K2/K3), `67bcd77` (K1 istemci rewiring), `2651b92` (K5/K6)
> **İlgili denetim bulgusu:** K1 (CRITICAL, kısmen kapandı)
> **İlgili test:** `mobile/src/__tests__/security/inviteFlow.contract.test.ts` → son assertion bu planın **unutmama mekanizmasıdır**

---

## 1. Amaç

`firestore.rules`'ta davet okumayı **sahibiyle sınırlamak**, böylece davet kodu brute-force'unu yapısal olarak bitirmek.

**Mevcut (HEAD):**
```
match /caregiverInvites/{inviteCode} {
  allow get: if isNotAnonymous();
```

**Hedef:**
```
match /caregiverInvites/{inviteCode} {
  allow get: if isNotAnonymous()
    && resource.data.patientId == request.auth.uid;
```

### Neden bu adım şart

K1'in kök nedeni iki parçalıydı ve **yalnızca biri** kapatıldı:

| Parça | Durum |
|---|---|
| Zayıf üretim (6 hane `Math.random()`) | ✅ **KAPANDI** — sunucu CSPRNG ile 12 hane (ölçülmüş 60.53 bit, χ²=43.15) |
| Rate-limit + atomik kabul | ✅ **KAPANDI** — `redeemCaregiverInvite` (saatte 10 / günde 30, kota doğrulamadan önce) |
| **Açık `allow get`** | ❌ **HÂLÂ AÇIK** |

Enumeration saldırısı callable üzerinden **yürümüyor** — saldırgan doğrudan `getDoc(caregiverInvites/{kod})` çağırıyor ve buna **callable değil kural** karar veriyor. Dolayısıyla rate-limit ne kadar sıkı olursa olsun, bu kural açık kaldığı sürece kod uzayı taranabilir. 60 bitlik yeni uzay taramayı pratikte imkânsız kılsa da, **sahada hâlâ 6 haneli eski kodlar dolaşıyor** (1.29×10⁹) ve onlar için açık gerçek.

---

## 2. Neden şimdi uygulanamaz — kanıtlı

Kuralı daraltmak, kabul akışında `getDoc(invite)` yapan **her istemci sürümünü anında kırar**. Bu, `67bcd77` ile kaldırıldı:

```
// caregiverService.ts acceptCaregiverInvite — ESKİ akış (sahadaki sürümler):
const inviteSnap = await getDoc(inviteRef);   // ← kural daralınca permission-denied
```

Yeni akış `redeemCaregiverInvite` callable'ını kullanıyor ve daveti **hiç okumuyor**. `inviteFlow.contract.test.ts` bunu kilitliyor:

```ts
it('⚠️ kabul akışı daveti `getDoc` ile OKUMUYOR (enumeration yolu kapalı)', () => {
  expect(serviceCode).not.toMatch(/getDoc\(\s*inviteRef\s*\)/);
});
```

### Mevcut istemcide başka hiçbir `get` kullanıcısı YOK — doğrulandı

`caregiverInvites` koleksiyonuna dokunan tüm istemci yolları tarandı:

| Konum | İşlem | Yöneten kural | Daraltmadan etkilenir mi |
|---|---|---|---|
| `caregiverService.ts:105` | `getDocs(query(...))` — mükerrer davet kontrolü | `allow list` | ❌ Hayır |
| `caregiverService.ts:816` | `getDocs(query(...))` — `getPendingInvites` | `allow list` | ❌ Hayır |
| `caregiverService.ts:845` | `deleteDoc(doc(...))` — davet iptali | `allow delete` | ❌ Hayır |
| `acceptCaregiverInvite` | ~~`getDoc`~~ → **callable** | — | ❌ Artık okumuyor |

Yani daraltma **güncel istemcide hiçbir şeyi kırmaz**; kırılan yalnızca sahadaki eski sürümlerdir. Bu, planın uygulanabilirliğini kanıtlayan en önemli bulgu.

---

## 3. ⚠️ Ön koşul eksik: sürüm yayılımı şu an ÖLÇÜLEMİYOR

**Doğrulandı:** `APP_VERSION` / `ANDROID_VERSION_CODE` (`config/version.ts`) ve `useAppVersion` hook'u **yalnızca Ayarlar → Hakkında ekranında gösterim** için kullanılıyor (`AboutSection.tsx:18`, `HelpSupportSection.tsx:37`). Sürümü Firestore'a, Crashlytics'e veya herhangi bir analitiğe yazan **hiçbir yol yok**.

Ek olarak Crashlytics zaten üretimde **aktif değil**: `crashlyticsService.init()` (setUserId'yi çağıran tek yer) prod'dan hiç çağrılmıyor, yalnızca testten.

**Sonuç:** "yeterince kullanıcı güncelledi mi?" sorusuna kod tabanından cevap verilemez. Ölçüm için iki yol var:

| Yöntem | Kod gerektirir mi | Ne ölçer | Öneri |
|---|---|---|---|
| **Play Console → İstatistikler → sürüm dağılımı** | ❌ Hayır | Kurulu sürümler | ✅ **Birincil** — sıfır maliyet, resmi kaynak |
| `users/{uid}`'a `appVersion` + `versionCode` yaz | ✅ Evet (yeni sürüm gerekir) | **Aktif** kullanıcıların sürümü | ✅ **İkincil** — ama yalnızca eklendiği sürümden SONRA anlamlı (chicken-and-egg) |

**Öneri:** bu yayını beklemek yerine, sıradaki sürümde `appVersion` telemetrisini **hemen** ekle. Böylece bu daraltma Play Console ile ölçülür, **gelecekteki** tüm kademeli kural değişiklikleri ise gerçek aktif-kullanıcı verisiyle ölçülebilir. Aksi halde her migration aynı körlükle yapılır.

---

## 4. Eşik ve karar kriterleri

### Erken uygulamanın gerçek maliyeti (dürüst değerlendirme)

Kural erken daraltılırsa ne olur: **eski sürümdeki bir bakıcı daveti kabul edemez** ve hata mesajı görür.

- ❌ Veri kaybı **yok**
- ❌ Alarm kaybı **yok**
- ❌ Güvenlik açığı **yok**
- ✅ Etkilenen akış: yalnızca **davet kabulü**
- ✅ Kurtarma: hasta yeni bir davet oluşturur (yeni sürümdeki bakıcı kabul eder) veya bakıcı uygulamayı günceller

Yani blast radius **sınırlı ve geri döndürülebilir**. Bu, bekleme süresini kısaltmayı meşru kılabilir — ama yine de yaşlı hasta + yaşlı refakatçi kitlesinde "davet çalışmıyor" destek yükü yaratır.

### Önerilen eşik

| Kriter | Değer | Gerekçe |
|---|---|---|
| Yeni sürüm Play'de | **%100 yayın** (kademeli değil) | Kademeli yayında eski sürüm bilinçli olarak canlı tutuluyor |
| Yayından geçen süre | **≥ 45 gün** | Play otomatik güncellemelerinin büyük kısmı bu pencerede tamamlanır |
| Play Console eski sürüm payı | **≤ %10 aktif kurulum** | Kalan %10 çoğunlukla güncellemeyi kapatan/cihaz değiştirmeyen kullanıcılar; daha aşağısını beklemek pratikte sonsuza dek sürer |
| Destek kanalı | Davet kabulü hatası bildirimi **yok** | Erken sinyal |

**Zorunlu değil ama önerilir:** `redeemCaregiverInvite` çağrı hacmini Cloud Logging'de izle. Yeni sürüm yayıldıkça callable çağrıları artmalı; `getDoc` kaynaklı `permission-denied` yok (çünkü kural henüz açık).

---

## 5. Uygulama adımları

### 5.1 Kural değişikliği

```diff
     match /caregiverInvites/{inviteCode} {
-      allow get: if isNotAnonymous();
+      // 2c — davet okuma artık SAHİBİYLE SINIRLI. Brute-force enumeration
+      // buradan yürüyordu: saldırgan getDoc döngüsüyle kod uzayını tarayıp
+      // isabet eden davetten patientId + patientName + izinleri okuyordu.
+      // Rate-limit bunu engelleyemez, çünkü enumeration callable üzerinden
+      // değil DOĞRUDAN Firestore okumasıyla yapılıyor.
+      //
+      // İstemci tarafı `67bcd77` ile callable'a taşındı ve daveti hiç
+      // okumuyor; bu daraltma sahadaki eski sürümlerin yayılımı
+      // BEKLENEREK uygulandı (bkz. docs/DAVET_KODU_ALLOW_GET_DARALTMA_
+      // YAYILIM_PLANI.md).
+      //
+      // Hastanın kendi davetlerini listelemesi ETKİLENMEZ: o yollar
+      // `getDocs(query(...))` yani `allow list` kapsamındadır
+      // (caregiverService.ts:105, :816). İptal `deleteDoc` (:845).
+      allow get: if isNotAnonymous()
+        && resource.data.patientId == request.auth.uid;
```

> **Not:** `isNotAnonymous()` bilinçli olarak korundu. Sahip-kontrolü tek başına yeterli olurdu (anonim bir kullanıcı yalnızca kendi davetlerini okuyabilir), ama `allow create` ile tutarlı kalması ve savunma derinliği için bırakıldı.

### 5.2 Test değişiklikleri — **3 dosya, zorunlu**

Kural daraldığında bu üç assertion **bilerek** kırılacak. Bu bir hata değil, planın çalıştığının kanıtı.

**(a) `firestoreRules.behavioral.test.ts`** — `'kimliği doğrulanmış (parola) kullanıcı davet dokümanını get EDEBİLİR'` testi **sahip olmayan** bir bağlam (`caregiverCtx('redeemer1')`) kullanıyor ve `assertSucceeds` bekliyor. Tersi yönde iki teste ayrılmalı:

```ts
it('⚠️ 2c: SAHİBİ OLMAYAN kullanıcı davet dokümanını get EDEMEZ', async () => {
  const ctx = caregiverCtx('redeemer1');
  await assertFails(getDoc(doc(ctx.firestore(), 'caregiverInvites', INVITE.valid)));
});

it('hasta KENDİ davetini get EDEBİLİR', async () => {
  const ctx = patientCtx();
  await assertSucceeds(getDoc(doc(ctx.firestore(), 'caregiverInvites', INVITE.valid)));
});
```

**(b) `firestoreRules.contract.test.ts`** — şu assertion güncellenmeli:
```ts
expect(invite?.[1]).toMatch(/allow get: if isNotAnonymous\(\)/);
```

**(c) `inviteFlow.contract.test.ts`** — son assertion **zaten bu an için yazıldı**:
```ts
it('⚠️ KURAL HÂLÂ AÇIK: `allow get` daraltılmadı (yayılıma kapılı)', () => {
  ...
  expect(invite?.[1]).toMatch(/allow get: if isNotAnonymous\(\);/);
});
```
Bu test **kırılmalı**; ardından "kapalı" durumunu doğrulayacak şekilde tersine çevrilmeli:
```ts
it('✅ 2c UYGULANDI: `allow get` sahibiyle sınırlı', () => {
  expect(invite?.[1]).toMatch(/allow get: if isNotAnonymous\(\)\s*&& resource\.data\.patientId == request\.auth\.uid/);
});
```

### 5.3 Doğrulama sırası (deploy'dan ÖNCE)

```
1. Kuralı değiştir + 3 test dosyasını güncelle
2. cd mobile && npm run typecheck                        → 0
3. npx jest --ci src/__tests__/security                  → hepsi yeşil
4. DAVRANIŞSAL (emülatör, Java 21 gerekir):
   set "PATH=C:\Program Files\Android\Android Studio\jbr\bin;%PATH%"
   firebase emulators:exec --only firestore ^
     "npx jest src/__tests__/security/firestoreRules.behavioral.test.ts"
   → 34 senaryo yeşil olmalı (2 yeni get testi dahil)
5. npx jest --ci                                         → tam paket yeşil
```

> Emülatör adımı **atlanmamalı**: sözleşme testleri yalnızca şekli doğrular. Abonelik açığı (bu oturumda bulundu) tam olarak bu yüzden kaçmıştı — `allow write: if false` metni duruyordu ama gerçek yazma isteği başarılı oluyordu.

### 5.4 Deploy

```
set "PATH=C:\Program Files\Android\Android Studio\jbr\bin;%PATH%"
firebase deploy --only firestore:rules
```

Anında etkili, kademeli yayın gerekmez.

### 5.5 Deploy sonrası doğrulama

- Yeni sürümde davet **oluştur** → kod 12 hane mi
- Yeni sürümde davet **kabul et** → callable üzerinden çalışıyor mu (zaten `getDoc` kullanmıyor, etkilenmemeli)
- Hasta kendi bekleyen davetlerini **listeliyor** mu (`getPendingInvites` → `allow list`)
- Hasta davet **iptal edebiliyor** mu (`deleteDoc` → `allow delete`)

---

## 6. Geri alma planı

Kural deploy'u anında ve geri alınabilir:

```
git revert <daraltma-commit'i>
firebase deploy --only firestore:rules
```

veya doğrudan önceki içeriği yeniden deploy et. Veri migrasyonu yok, istemci değişikliği yok — **geri alma maliyeti sıfıra yakın**. Bu, daraltmayı düşük riskli kılan en önemli özellik.

Geri alma tetikleyicileri:
- Destek kanalına "davet kabul edemiyorum" bildirimleri gelmeye başlarsa
- Cloud Logging'de `caregiverInvites` `get` için `permission-denied` oranı beklenmedik biçimde yükselirse

---

## 7. Go / No-Go kontrol listesi

- [ ] Yeni sürüm (callable kullanan istemci) Play'de **%100** yayında
- [ ] Yayından **≥ 45 gün** geçti
- [ ] Play Console: eski sürüm payı **≤ %10** aktif kurulum
- [ ] Destek kanalında davet kabulü hatası bildirimi **yok**
- [ ] `inviteFlow.contract.test.ts`'in "KURAL HÂLÂ AÇIK" assertion'ı **hâlâ geçiyor** (yani kimse erken daraltmadı)
- [ ] 3 test dosyası güncellendi (§5.2)
- [ ] Emülatörde 34 davranışsal senaryo yeşil (§5.3 adım 4)
- [ ] Tam paket yeşil, `tsc` 0, `eslint` 0 error
- [ ] CHANGELOG `[Unreleased]` veya ilgili sürüm başlığına işlendi
- [ ] `docs/archive/`'a kayıt eklendi + `ARCHIVE_INDEX.md` güncellendi

---

## 8. Alternatif: e-posta bağlama (daraltma yerine)

Daraltmayı beklemeden enumeration'ı anlamsız kılmanın bir başka yolu, daveti davetlinin kimliğine bağlamak:

```
&& get(inviteRef).data.caregiverEmail == request.auth.token.email
```

Bu, kodu ele geçirmeyi **yetersiz** kılar (posta kutusu da gerekir). Ama **bilinçli olarak uygulanmadı**:

- `caregiverEmail` istemcide **boş bırakılabiliyor** (`(caregiverEmail || '').toLowerCase()`)
- Bakıcı Google ile **farklı bir adresle** giriş yapabiliyor → meşru kabul reddedilir
- "Davette e-posta zorunlu mu?" bir **ürün kararı** ve henüz verilmedi

Karar verilirse bu seçenek daraltmayla **birlikte** uygulanabilir (ikisi birbirini dışlamıyor). E-posta zorunlu kılınırsa `redeemCaregiverInvite`'a ek bir sunucu kontrolü de konmalı.

---

## 9. Bu planın kendisini koruyan mekanizma

`inviteFlow.contract.test.ts`'in son assertion'ı **bilerek** mevcut (açık) durumu kilitliyor:

```
⚠️ KURAL HÂLÂ AÇIK: `allow get` daraltılmadı (yayılıma kapılı)
```

İki yönlü çalışıyor:
1. Biri **erken** daraltırsa test kırılır → sahadaki eski sürümler kırılmadan önce fark edilir.
2. Yayılım tamamlanıp daraltma yapıldığında test **yine** kırılır → bu planın §5.2(c) adımı hatırlatılır ve "unutmak" imkânsız hale gelir.

Yani bu doküman tek başına yeterli değil; unutmama garantisi **testte**.
