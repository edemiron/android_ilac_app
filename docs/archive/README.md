# 📚 İlaç Hatırlatıcı — Operasyon Arşivleme Kılavuzu & Standartları

Bu dizin, **İlaç Hatırlatıcı** projesinde gerçekleştirilen her teknik geliştirme, hata düzeltmesi, mimari revizyon, veritabanı güncellemesi ve sürüm dağıtımı sonrasında oluşturulan kalıcı arşiv kayıtlarını barındırır.

---

## 📌 1. Dosya İsimlendirme Standardı

Her işlem tamamlandıktan sonra oluşturulacak arşiv dosyasının adı **önce sürüm bilgisi (version)** gelecek şekilde şu formatta olmalıdır:

```
[version]_YYYY-MM-DD_HH-mm_[konu-basligi].md
```

### Örnekler:
- `v1.4.7_2026-08-28_01-45_titck-canli-ilac-arama-ve-otomatik-tamamlama.md`
- `v1.4.6_2026-08-27_22-00_titck-resmi-veri-tabani-ve-karekod-esleme.md`
- `v1.4.4_2026-08-27_15-30_android-14-15-tam-ekran-alarm-uyanmasi.md`
- `v1.4.1_2026-08-26_22-30_e-recete-nobetci-eczane-ve-acil-durum-sos.md`

---

## 📑 2. Arşiv Dosyası İçerik Şablonu

Her arşiv belgesi aşağıdaki bölümleri eksiksiz içermelidir:

```markdown
# 📋 [İşlem Başlığı]

> **Sürüm / Build:** vX.Y.Z (Build NN)  
> **Tarih & Saat:** YYYY-MM-DD HH:mm  
> **Modül / Alan:** [Alarm / Caregiver / TİTCK / UI / Auth / Security / Backend]  
> **Durum:** ✅ Tamamlandı & Cihazda Doğrulandı  

---

## 🎯 1. İşlem Özeti & Kullanıcı Talebi
- Kullanıcının talebi veya çözülen problem.
- İşlemin amacı ve kapsamı.

## 🛠️ 2. Mimari Kararlar & Teknik Detaylar
- Uygulanan tasarım kalıpları (Design Patterns).
- Çözüm yaklaşımı, algoritma ve mantıksal akış.
- Kritik kod parçacıkları ve yapılandırmalar.

## 📂 3. Etkilenen / Eklenen Dosyalar
- Değiştirilen veya yeni eklenen dosyaların listesi ve kısa açıklaması.

## 🧪 4. Test & Doğrulama Sonuçları
- `npm run typecheck` çıktısı (TypeScript).
- `npm test` çıktısı (Jest / Birim & Entegrasyon testleri).
- Fiziksel cihaz / Emülatör üzerinde ADB canlı test ve ekran görüntüsü kanıtları.

## 📦 5. Çıktı Dosyaları & Sürüm Bilgisi
- Oluşturulan APK dosya yolları ve hash/boyut bilgileri.
- Varsa eklenen veri dosyaları (JSON / Excel / Varlıklar).
```

---

## 🗂️ 3. Ana İndeks Kataloğu

Tüm arşiv kayıtlarının sürüm öncelikli kronolojik listesi için [`ARCHIVE_INDEX.md`](./ARCHIVE_INDEX.md) belgesini inceleyiniz.
