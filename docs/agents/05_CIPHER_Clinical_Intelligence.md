# 🔬 AJAN 5: CIPHER — Klinik Zeka, İlaç Etkileşimi & Veri Gizliliği Raporu
**Kod Adı:** CIPHER  
**Rütbe / Görev:** Chief Medical Informatics & Privacy Protection Officer  
**Kime:** Patrona (Chief Executive Officer)  
**Tarih:** 21 Ağustos 2026  
**Durum:** TAMAMLANDI / İNCELEMEYE HAZIR  

---

## 1. Pazardaki Gizlilik & Güvenlik Korkusu
Sağlık verileri (kullanılan antidepresanlar, kanser ilaçları, tansiyon hapları vb.) dünyadaki **en mahrem kişisel veridir**.

### Kullanıcıların En Çok Korktuğu Şeyler:
1. **Verilerin Sigorta Şirketlerine veya Reklam Ağlarına Satılması:** Kullanıcıların Reddit ve mağazalardaki en büyük öfkesi budur.
2. **Kör İlaç Etkileşimleri:** Kullanıcı iki farklı doktorun yazdığı ilaçları aynı anda aldığında ölümcül etkileşim (Drug-Drug Interaction) riskini görememesi.
3. **Anlaşılmayan Prospektüsler:** 4 sayfalık ince yazılı kağıt prospektüslerde "Aç karnına mı, greyfurtla içilir mi?" sorusunun cevabını bulamamak.

---

## 2. Bizim Kurduğumuz Çözüm & İlaç Zekası

### A. Sıfır Veri İhlali — "Offline-First & Yerel Şifreleme":
* Kullanıcının ilaçları ve sağlık geçmişi **cihazın kendi güvenli veritabanında (WatermelonDB / MMKV / SQLite)** tutulur.
* İnternet olmasa dahi alarmlar %100 çalışır.
* Kullanıcı istemediği sürece hiçbir sağlık verisi üçüncü parti reklam sunucularına gönderilmez.

### B. Çift Katmanlı İlaç Etkileşim Motoru (`drugInteraction.service.ts`):
1. **Lokal Etkileşim Veritabanı:** En yaygın 500+ kritik ilaç etkileşimini (örneğin Kan sulandırıcı + Ağrı kesici) internet olmadan dahi anında yakalar ve kırmızı alarm verir.
2. **Yapay Zeka Destekli Klinik Analiz (Gemini / Claude AI Logic):** Yeni bir ilaç eklendiğinde mevcut ilaçlarla çapraz etkileşimini, aç/tok durumunu ve özel besin uyarılarını (ör. "Bu ilacı içerken süt ürünleri tüketmeyiniz") analiz eder.

### C. Akıllı Prospektüs Asistanı (`MedicineProspectusScreen.tsx`):
* Kullanıcının anlayacağı dilde 4 temel soruya net cevap:
  1. *Bu ilaç ne için kullanılır?*
  2. *Nasıl ve ne zaman alınmalıdır?*
  3. *En yaygın yan etkileri nelerdir?*
  4. *Acil doktora başvurulması gereken durumlar nelerdir?*

---

## 3. CIPHER'ın Patrona Önerdiği 3 Klinik İnovasyon

1. **"Gıda & Alkol Etkileşimi Uyarısı":**
   - Sadece ilaç-ilaç değil; "Greyfurt", "Alkol", "Kafein" ve "Güneş ışığı" gibi tehlikeli günlük yaşam etkileşimlerini uyarma.
2. **"Gebelik & Emzirme Güvenlik Rozetleri":**
   - İlaçların FDA/EMA gebelik kategorilerini (A, B, C, D, X) anne adaylarına sade bir kalkan simgesiyle göstermek.
3. **Biyometrik Parmak İzi / Yüz Tanıma Kilidi (`expo-local-authentication`):**
   - Telefonu başkası eline aldığında ilaç geçmişini görememesi için tek dokunuşla biyometrik kilit.

---

## 4. Patrona Özel Not (CIPHER'ın Notu)
> *"Patron, kullanıcıya 'Biz senin sağlık verini asla satmayız ve seni yanlış ilaç kombinasyonlarından koruruz' güvencesini verdiğimiz anda; bu güven, dünyadaki hiçbir pazarlama bütçesinin satın alamayacağı bir kullanıcı sadakati oluşturur."*
