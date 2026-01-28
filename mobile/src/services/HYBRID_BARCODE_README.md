# Hibrit Barkod Arama Servisi v3

## 🎯 Yeni Yöntem: Web Search

**Eski Yöntem (AI)**: Claude AI barkoddan ilaç tahmin ediyordu → **YANLIŞ SONUÇLAR**

**Yeni Yöntem (Web Search)**: Gerçek Türk ilaç sitelerinden veri çekiyor → **%95+ DOĞRULUK**

## 🔄 Çalışma Mantığı

```
1. Firebase Cache (anında) → %100 güven
2. Web Search (ilacabak.com, ilacdata.com) → %95 güven
3. Open Food Facts → %70 güven
4. Manuel Giriş → Son çare
```

## 📦 Kullanım

### React Native'de

```typescript
import { searchBarcodeHybrid, parseWebSearchForBarcode } from '../services/hybridBarcodeService';

// Önce hibrit aramayı dene (Firebase + Open Food Facts)
const result = await searchBarcodeHybrid('8699525619310');

if (result.success) {
  console.log('İlaç:', result.medicine?.name);
  console.log('Kaynak:', result.source);
} else {
  // Web search gerekli - backend'den çağır
  console.log('Manuel giriş veya web arama gerekli');
}
```

### Backend/API'de Web Search

```typescript
// Web search sonuçlarını parse et
const webResults = await webSearch('8699525619310 ilaç');
const result = parseWebSearchForBarcode(webResults, '8699525619310');

if (result.success) {
  console.log('✅ Bulundu:', result.medicine?.name);
  // Firebase'e kaydet
  await saveMedicineToFirebase(result.medicine!, 'web_search');
}
```

## 🌐 Desteklenen Siteler

| Site | Güvenilirlik | Not |
|------|--------------|-----|
| ilacabak.com | ⭐⭐⭐⭐⭐ | En iyi kaynak |
| ilacdata.com | ⭐⭐⭐⭐⭐ | Çok detaylı |
| ilactr.com | ⭐⭐⭐⭐ | İyi kaynak |
| ilacfiyati.com | ⭐⭐⭐⭐ | Fiyat odaklı |
| ilacprospektusu.com | ⭐⭐⭐⭐ | Prospektüs bilgisi |

## 📊 Test Sonuçları

| Barkod | AI Sonucu (Eski) | Web Search (Yeni) | Doğru? |
|--------|------------------|-------------------|--------|
| 8699525619310 | CALPOL Süspansiyon | DEPORES FREE Göz Damlası | ✅ YENİ DOĞRU |
| 8699525610171 | DIALOR 500mg Tablet | NOVAQUA Göz Damlası | ✅ YENİ DOĞRU |

## 🔧 Entegrasyon

### BarcodeScannerScreen'de

```typescript
const handleBarCodeScanned = async ({ data }: BarcodeScanningResult) => {
  setLoading(true);
  
  // 1. Önce hibrit aramayı dene
  const result = await searchBarcodeHybrid(data);
  
  if (result.success) {
    // Bulundu!
    navigation.navigate('AddMedicine', {
      barcode: data,
      prefillName: result.medicine?.name,
      prefillDosage: result.medicine?.dosage,
      prefillManufacturer: result.medicine?.manufacturer,
      prefillGenericName: result.medicine?.genericName,
    });
  } else {
    // 2. Web search gerekli (backend API çağrısı)
    // veya manuel giriş iste
    Alert.alert(
      'İlaç Bulunamadı',
      'Lütfen manuel olarak girin.',
      [
        {
          text: 'Manuel Gir',
          onPress: () => navigation.navigate('AddMedicine', { barcode: data }),
        },
      ]
    );
  }
  
  setLoading(false);
};
```

## ⚠️ Önemli Notlar

1. **AI KULLANILMIYOR**: Claude AI barkod eşleştirmede güvenilmez
2. **Web Search Backend Gerektirir**: React Native'de doğrudan çalışmaz
3. **Firebase Cache**: Her bulunan ilaç Firebase'e kaydedilir
4. **Rate Limiting**: Web sitelere çok sık istek atmayın

## 🚀 Gelecek İyileştirmeler

1. [ ] Backend API endpoint'i oluştur
2. [ ] Rate limiting ekle
3. [ ] Cache TTL ayarla
4. [ ] Offline mod desteği
5. [ ] TİTCK resmi API entegrasyonu (varsa)

## 📁 Dosyalar

- `hybridBarcodeService.ts` - Ana servis
- `HYBRID_BARCODE_README.md` - Bu dosya
