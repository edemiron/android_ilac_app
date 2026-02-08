---
inclusion: always
---

# 🚨 BUG FIX PROTOKOLÜ — DEMİR KURAL

> Bu kural her bug fix ve feature değişikliğinde geçerlidir. İstisna yoktur.

## ADIM 1: OKU (kod yazmadan önce)

1. Etkilenen TÜM dosyaları oku
2. Veri akışını uçtan uca izle — değer nereden üretiliyor, nereye gidiyor, nerede karşılaştırılıyor
3. Karşılaştırma/eşleştirme noktalarını bul (format farkları, UTC vs local, ID eşleşmeleri)
4. Çalışan bir örnek bul — aynı işi doğru yapan kod var mı? Farkı ne?

## ADIM 2: PLAN YAZ, ONAY AL

1. Kök nedeni tek cümleyle yaz: "X çünkü Y"
2. Düzeltmeyi tek cümleyle yaz: "Z dosyasında şu değişiklik"
3. Patlama yarıçapını belirt: bu değişiklik başka neyi bozabilir?
4. Kullanıcıdan onay bekle — hemen kod yazmaya başlama

## ADIM 3: TEK SEFERDE UYGULA

1. Tüm değişiklikleri yap
2. Build et
3. Deploy et

## YASAKLAR

- ❌ Kök neden bulmadan kod yazma
- ❌ "Belki şudur" diye deneme yanılma yapma
- ❌ Aynı bug için 2'den fazla deneme — 2. başarısız olursa DUR, mimariyi sorgula
- ❌ Birden fazla şeyi aynı anda düzeltme — tek değişiklik, tek test
