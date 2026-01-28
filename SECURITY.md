# Firebase Guvenlik Dokumantasyonu

Bu dokuman, Ilac Hatirlatici uygulamasinin Firebase guvenlik yapilandirmasini aciklar.

## Client-Side Credentials Hakkinda

Firebase client-side credentials (API keys, project IDs) tasarim geregi public'tir. Bu degerler build sonucunda kaynak kodda gorunur ve bu normal bir durumdur. Guvenlik, credentials'in gizlenmesiyle degil, asagidaki mekanizmalarla saglanir.

## Guvenlik Katmanlari

### 1. Firestore Security Rules (Birincil Koruma)

Tum kullanici verileri authentication gerektirir. Kurallar `firestore.rules` dosyasinda tanimlidir.

**Temel Prensipler:**
- Anonim erisim yok
- Kullanicilar sadece kendi verilerine erisebilir
- Veri yapisi dogrulama
- Rate limiting Firebase kotalari ile

**Deploy Komutu:**
```bash
firebase deploy --only firestore:rules
```

### 2. Firebase App Check (Ek Koruma)

App Check, isteklerin gercek uygulamanizdan geldigini dogrular.

**Yapilandirma:**
- `mobile/src/config/appCheck.ts` dosyasinda konfigurasyonu var
- Development icin debug token kullanilir
- Web builds icin ReCAPTCHA Enterprise kullanilir

**Firebase Console Adimlari:**
1. Firebase Console > App Check'e gidin
2. Uygulamanizi kaydedin
3. Debug token'lari yonetin (development icin)

### 3. API Key Restrictions (Firebase Console)

Firebase Console'da API key'lerinizi kisitlayin:

1. **Google Cloud Console > APIs & Services > Credentials**
2. Firebase API key'inizi secin
3. **Application restrictions:**
   - Android: Package name ve SHA-1 fingerprint ekleyin
   - iOS: Bundle ID ekleyin
   - Web: Domain'leri ekleyin

4. **API restrictions:**
   - Sadece kullanilan API'leri secin:
     - Cloud Firestore API
     - Firebase Auth API
     - Firebase Installations API

## Development Ortami

### Debug Token Olusturma

1. Firebase Console > Project Settings > App Check
2. Apps sekmesine gidin
3. "Manage debug tokens" tiklayin
4. Yeni token olusturun
5. Token'i `.env` dosyasina ekleyin:
   ```
   EXPO_PUBLIC_APPCHECK_DEBUG_TOKEN=your_debug_token
   ```

**UYARI:** Debug token'lari production build'lerde KULLANILMAMALIDIR.

## Production Checklist

Deploy oncesi kontrol listesi:

- [ ] Firestore Security Rules deploy edildi
- [ ] API key restrictions yapilandirildi
- [ ] App Check etkinlestirildi (opsiyonel ama onerilen)
- [ ] Debug token'lar production'da kullanilmiyor
- [ ] Firebase Authentication provider'lari yapilandirildi

## Monitoring

Guvenlik izleme icin:

1. **Firebase Console > App Check > Metrics**
   - Onaylanan vs reddedilen istekleri goruntuleyin
   - Anormal aktivite icin alert'ler ayarlayin

2. **Firebase Console > Firestore > Usage**
   - Okuma/yazma islemlerini izleyin
   - Beklenmeyen artislari kontrol edin

3. **Google Cloud Console > Logging**
   - Detayli audit log'lari icin

## Guvenlik Acigi Bildirimi

Bir guvenlik acigi bulursaniz, lutfen sorumlulukla bildirin. Public issue olarak ACMAYIN.

## Kaynaklar

- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase App Check](https://firebase.google.com/docs/app-check)
- [API Key Best Practices](https://cloud.google.com/docs/authentication/api-keys)
