Kapsamlı Özellik Ekleme Planı
Tüm özellikleri mantıksal bir sırayla, uygulamanın çekirdek yapısını bozmadan modüler olarak ekleyeceğiz.

Aşama 1: İlaç Fotoğrafı Çekme & Ekleme (UX İyileştirmesi)
En hızlı ve gözle görülür etkiyi yaratacak özelliktir.

Proposed Changes
[MODIFY] src/types/medicine.ts
Medicine
 arayüzüne imageUri?: string eklenecek.
[MODIFY] 
src/screens/AddMedicineScreen.tsx
Kamera (expo-camera) veya Görüntü Seçici (expo-image-picker) ile fotoğraf çekme butonu.
Çekilen fotoğrafı uygulamanın lokal dizinine (FileSystem.documentDirectory) sıkıştırarak kaydetme.
[MODIFY] 
src/screens/HomeScreen.tsx
 & 
MedicinesScreen.tsx
Eğer medicine.imageUri varsa, ilaç ikonunun yerine (veya yanına) yuvarlak bir avatar olarak fotoğrafın gösterilmesi.
Aşama 2: Akıllı Alarmlar (Zorlu Kapatma & Titreşim)
Kullanıcının ilacı atlamasını engelleyecek çekirdek özellik.

Proposed Changes
[MODIFY] src/types/medicine.ts
requireBarcodeOnTake?: boolean ve vibrationPattern?: 'heartbeat' | 'urgent' | 'soft' alanları.
[MODIFY] components/AddMedicine/AdvancedSettings.tsx
Titreşim tipi ve "Barkod okutarak kapat" seçenekleri için Switch eklentileri.
[MODIFY] android/app/src/main/java/com/ilachatirlatici/AlarmActivity.kt & JS Tarafı
İlaç requireBarcodeOnTake işaretliyse, tam ekran alarmda "Aldım" tuşuna basıldığında kameranın açılması ve barkodun eşleşmesinin beklenmesi.
Aşama 3: İstatistikler & PDF Rapor (Doktor Modu)
Mevcut uyum oranlarını dışa aktarılabilir hale getireceğiz.

Proposed Changes
[MODIFY] 
src/screens/StatisticsScreen.tsx
Aylık, haftalık uyum grafikleri (react-native-chart-kit kullanılarak).
"Doktora Gönder (PDF)" butonu.
[NEW] src/utils/pdfGenerator.ts
react-native-html-to-pdf kullanılarak kullanıcının son 30 günlük ilaç geçmişini şık bir HTML tabloya dökme, PDF oluşturma ve react-native-share ile paylaşma.
Aşama 4: İlaç Etkileşim Uyarıları
Mevcut ilaçlar ile eklenecek yeni ilaç arasındaki olası etkileşimleri tespit edip kullanıcıyı uyarmak.

Proposed Changes
[NEW] src/services/drugInteractionService.ts
Basit bir lokal JSON veya eşleştirme mantığı üzerinden etken maddeler/ilaç grupları arası olası geçimsizlikleri (örn. Kan Sulandırıcılar + NSAID) kontrol eden servis.
[MODIFY] 
src/hooks/useAddMedicine.ts
 & 
src/screens/AddMedicineScreen.tsx
Form onaylandığı an drugInteractionService çalıştırılacak ve eğer mevcut başka bir ilaç ile eşleşen bir risk varsa, Modal ile "Uyarı: Bu iki ilacı beraber almadan önce doktorunuza danışın" şeklinde bir bilgi sunulacak.
Aşama 5: Firebase Caregiver (Bakıcı) Modu
En karmaşık ve efor gerektiren aşama. Altyapı olarak Firebase logları zaten Firestore üzerinde, ancak bakıcı yetkilendirmesi yapılacak.

Proposed Changes
[MODIFY] src/store/medicineStore.ts
Lokal AsyncStorage'daki işlemlerin (ilaç ekleme, log tutma) arka planda Firestore ile senkronize edilmesi.
[NEW] src/screens/CaregiverScreen.tsx
Ekranda bir QR kod veya paylaşılabilir Kod üretilmesi.
Bakıcının bu kodu girerek hastanın ilaç takvimini "Salt Okunur" şekilde kendi cihazına indirmesi.
[NEW] Firebase Cloud Functions
Hastanın ilacı beklemede kaldığında veya "Atlandı" olduğunda, sisteme kayıtlı bakıcının cihazına FCM (Firebase Cloud Messaging) üzerinden acil bildirim atılması.