import { NavigatorScreenParams } from '@react-navigation/native';

// İlaç tipi tanımları
export interface Medicine {
  id: string;
  name: string;
  dosage: string; // örn: "500mg", "1 tablet" (birleştirilmiş string - geriye dönüşlü uyumluluk)
  dosageAmount?: string; // Sadece rakam kısmı, örn: "2"
  form?: MedicineForm; // İlacın fiziksel formu ('tablet' | 'capsule' | ...)
  frequency: number; // günde kaç kez
  instructions?: MedicineInstruction;
  color: string; // UI için renk kodu
  category?: MedicineCategory; // İlaç kategorisi (opsiyonel - geriye dönük uyumlu)
  icon?: string;
  startDate: string; // ISO date string
  endDate?: string; // Opsiyonel bitiş tarihi
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // İlaç Resmi (Faz 1)
  imageUri?: string; // Optimizasyonlu lokal fotoğraf yolu
  // Cloud sync icin eklenen alanlar (PR #1 sonrasi)
  imageStoragePath?: string; // Firebase Storage path
  imageMimeType?: string; // image/jpeg, image/png
  imageSize?: number; // bytes
  imageUpdatedAt?: string; // ISO timestamp

  // Stok takibi
  stockEnabled?: boolean; // Stok takibi aktif mi?
  stockCount?: number; // Mevcut stok sayısı
  stockThreshold?: number; // Az kaldı uyarı eşiği (varsayılan: 5)
  stockUnit?: string; // Birim: "tablet", "kapsül", "ml", "doz" vb.

  // Son kullanma tarihi
  expiryDate?: string; // ISO date string (YYYY-MM-DD)
  expiryReminderDays?: number; // Kaç gün önce hatırlat (7, 14, 30, 90)

  // Gelişmiş Alarmlar (Faz 2)
  requireBarcodeOnTake?: boolean; // İlacı aldım demek için barkod okutmak zorunlu mu?
  barcode?: string; // İlacın barkodu
  vibrationPattern?: 'default' | 'heartbeat' | 'urgent' | 'soft'; // Özel titreşim deseni
  customTimes?: string[]; // Özel saatler
  isCritical?: boolean; // Hayati / Kritik İlaç (Israrlı alarm, kalkan ve yüksek ses seviyesi)

  // Gelişmiş Zamanlama / Doz Takvimi
  scheduleType?: ScheduleType;
  specificDays?: number[]; // 0=Pazar, 1=Pazartesi, ..., 6=Cumartesi
  intervalDays?: number; // X günde bir (örn: 2)
  cycleDaysOn?: number; // Döngüde ilaç alınacak gün sayısı (örn: 21)
  cycleDaysOff?: number; // Döngüde ara verilecek gün sayısı (örn: 7)

  // Klinik Farmakoloji & Güvenlik (Sprint 104)
  foodInteractions?: FoodInteractionType[];
  activeIngredients?: string[];
  titckKubKtUrl?: string;
  missedDoseRule?: MissedDoseRule;
  refillThreshold?: number;
  batchNumber?: string;
}

export type FoodInteractionType =
  | 'dairy' // Süt / Kalsiyum emilim engeli
  | 'grapefruit' // Greyfurt sitokrom P450 etkileşimi
  | 'alcohol' // Alkol karaciğer/sedasyon riski
  | 'sunlight' // Güneş ışığına duyarlılık / fotosensitivite
  | 'caffeine' // Kafein taşikardi/emilim
  | 'empty_stomach_strict' // Kesin aç karnına
  | 'potassium' // Potasyum / Tuz ikamesi (ACE/ARB hiperkalemi riski)
  | 'vitamin_k' // K Vitamini / Yeşil sebzeler (Varfarin/Coumadin antagonizmi)
  | 'tyramine'; // Tiramin / Fermente gıdalar (MAOI hipertansif kriz)

export type MissedDoseRule =
  | 'take_now_if_half_time' // Yarı zaman geçmediyse hemen al
  | 'skip_if_close_to_next' // Sonraki doza yakınsa atla
  | 'never_double_dose'; // Asla çift doz alma

export interface FoodInteractionInfo {
  type: FoodInteractionType;
  icon: string;
  titleTr: string;
  titleEn: string;
  warningTr: string;
  warningEn: string;
  severity: 'critical' | 'moderate' | 'info';
}

export interface EReceteItem {
  name: string;
  dosage: string;
  frequency: number;
  instructions?: MedicineInstruction;
  barcode?: string;
  activeIngredients?: string[];
  durationDays?: number;
}

export interface EReceteData {
  recipeNo: string;
  doctorName?: string;
  hospitalName?: string;
  date?: string;
  medicines: EReceteItem[];
}

export type ScheduleType = 'daily' | 'specific_days' | 'interval_days' | 'cycle';

// İlaç kullanım talimatları
export type MedicineInstruction =
  | 'before_meal' // Yemekten önce
  | 'after_meal' // Yemekten sonra
  | 'with_meal' // Yemekle birlikte
  | 'empty_stomach' // Aç karnına
  | 'before_sleep' // Yatmadan önce
  | 'any_time'; // Herhangi bir zaman
// İlaç kategorileri
export type MedicineCategory =
  | 'painkiller' // Ağrı Kesici
  | 'vitamin' // Vitamin/Takviye
  | 'heart' // Kalp/Tansiyon
  | 'nervous' // Sinir Sistemi
  | 'antibiotic' // Antibiyotik
  | 'respiratory' // Solunum
  | 'digestive' // Sindirim
  | 'diabetes' // Diyabet
  | 'bone' // Kemik/Eklem
  | 'other'; // Diğer

// Hatırlatma zamanı
export interface ReminderTime {
  id: string;
  medicineId: string;
  time: string; // "HH:mm" formatında
  notificationId?: string;
  isEnabled: boolean;
  // Smoke testi icin trigger time (Sprint 1'de eklenen alan, opsiyonel)
  smokeTriggerTime?: string;
}

// Kullanıcı ayarları
// Alarm sesi seçenekleri
export type AlarmSoundType =
  | 'soft_chime'
  | 'crystal_bell'
  | 'zen_garden'
  | 'clinical_pulse'
  | 'urgent_alert'
  | 'morning_vital'
  | 'alarm'
  | 'default'
  | 'gentle'
  | 'urgent';

export interface UserSettings {
  wakeUpTime: string; // "HH:mm" - varsayılan "08:00"
  sleepTime: string; // "HH:mm" - varsayılan "23:00"
  notificationSound: string;
  vibrationEnabled: boolean;
  fullScreenAlarmEnabled: boolean;
  language: 'tr' | 'en';

  /**
   * Ayarların en son YEREL olarak değiştirildiği an (ISO).
   *
   * v1.7.1: bulut birleştirmesinde son-yazan-kazanır için eklendi. Eskiden
   * bulut KOŞULSUZ kazanıyordu ve `getSettingsFromCloud` her alanı
   * `?? varsayılan` ile döndürdüğü için hiçbir alan `undefined` gelmiyordu;
   * yükleme fire-and-forget olduğundan bir cihazda yapılan ayar değişikliği
   * indirme yarışını kaybettiğinde SESSİZCE geri alınıyordu (cihazda
   * kanıtlandı: tam ekran alarm anahtarı yeniden başlatmada eski değere
   * dönüyordu). Bu damga yalnızca `updateSettings` tarafından yazılır.
   *
   * Tanımsız olması "yaşı bilinmiyor" demektir; o durumda eski davranış
   * (bulut kazanır) korunur — yeni kurulumda yerel varsayılanların bulut
   * verisini ezmemesi için bu DOĞRU davranıştır.
   */
  settingsUpdatedAt?: string;

  // Alarm sesi ayarı
  alarmSound: AlarmSoundType; // Varsayılan 'alarm'
  alarmVolume: number; // 0-100 arası (varsayılan 80)

  // Erteleme ayarları
  snoozeDuration: number; // dakika cinsinden (varsayılan 5)
  maxSnoozeCount: number; // maksimum erteleme hakkı (varsayılan 3)

  // Gece modu (sessiz saatler)
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "HH:mm" formatında (varsayılan "23:00")
  quietHoursEnd: string; // "HH:mm" formatında (varsayılan "07:00")

  // Alarm modu - Sessizde bile ses çıkar
  alarmModeEnabled: boolean; // Telefon sessizde/titreşimde bile alarm sesi çalar

  // İlaç çakışma aralığı - Aynı saate denk gelen ilaçlar arası mesafe (dakika)
  conflictIntervalMinutes: number; // Varsayılan 10 dakika

  // ===== GÜVENLİK AYARLARI =====
  // PIN / Biyometrik güvenlik
  securityEnabled: boolean; // Güvenlik aktif mi?
  securityType: 'pin' | 'biometric' | 'both' | 'none'; // Güvenlik tipi
  securityPin?: string; // SHA256 hashlenmiş PIN (4-6 hane)
  biometricsEnabled: boolean; // Biyometrik (parmak izi/yüz) aktif mi?
  lockTimeout: number; // Otomatik kilit süresi (dakika, 0 = hemen)
  lastActiveTime?: string; // Son aktif zaman (ISO) - otomatik kilitleme için

  // ===== TTS AYARLARI =====
  ttsEnabled: boolean; // Sesli okuma aktif mi?
  ttsVolume: number; // 0-100 arası
  ttsRepeatCount: number; // Kaç kez tekrar etsin (0-3)
  ttsSpeechRate?: number; // Konuşma hızı: 0.38 (Yavaş 0.8x), 0.50 (Normal 1.0x), 0.62 (Hızlı 1.2x)
  ttsSpeakMedicineName: boolean; // İlaç adı söylensin mi?
  ttsSpeakDosage: boolean; // Dozaj söylensin mi?
  ttsSpeakInstructions: boolean; // Talimatlar söylensin mi?

  // ===== KALICI BİLDİRİM AYARLARI =====
  persistentNotificationEnabled: boolean; // Kalıcı bildirim aktif mi?
  persistentNotificationDuration: number; // Kaç dakika kalsın (30, 60, 120)

  // ===== KOLAY MOD (SENIOR / SIMPLE MODE) =====
  seniorModeEnabled?: boolean; // Büyük yazılı, sade kolay mod aktif mi?
}

// İlaç alma kaydı
export interface MedicineLog {
  id: string;
  medicineId: string;
  medicineName?: string;
  reminderTimeId: string;
  scheduledTime: string; // ISO date string
  takenAt?: string; // Alındıysa ISO date string
  status: 'pending' | 'taken' | 'skipped' | 'missed';
  note?: string;
  skipReason?: string; // 'side_effect' | 'felt_better' | 'out_of_stock' | 'doctor_advised' | 'forgot' | 'other'
  skipReasonNote?: string;
  createdAt?: string;
}

// Snooze (erteleme) kaydı - persistence için
export interface Snooze {
  id: string;
  medicineId: string;
  reminderTimeId: string;
  originalScheduledTime: string; // Orijinal alarm zamanı (ISO)
  triggerTime: string; // Snooze'un tetikleneceği zaman (ISO)
  notificationId: string; // Notifee notification ID
  snoozeCount: number; // Kaçıncı erteleme (1, 2, 3...)
  isActive: boolean;
  createdAt: string;
}

// Günlük özet
export interface DailySummary {
  date: string; // "YYYY-MM-DD"
  totalReminders: number;
  takenCount: number;
  skippedCount: number;
  missedCount: number;
  adherenceRate: number; // 0-100 arası yüzde
}

// Alarm durumu
export interface AlarmState {
  isActive: boolean;
  currentMedicine?: Medicine;
  currentReminderTime?: ReminderTime;
  scheduledTime?: string;
}

// ===== CAREGIVER (BAKICI) MODU =====
// Bakıcı ilişkisi durumu
export type CaregiverStatus = 'pending' | 'active' | 'paused' | 'removed';

// Bakıcı davet durumu
export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'declined';

// Bakıcı ilişkisi
export interface CaregiverRelationship {
  id: string; // İlişki ID'si
  patientId: string; // Hasta (kullanıcı) ID'si
  caregiverId: string; // Bakıcı ID'si
  caregiverEmail?: string; // Bakıcı e-postası (opsiyonel)
  caregiverName?: string; // Bakıcı adı
  patientName?: string; // Hasta adı
  patientPhone?: string; // Hasta telefon numarası (opsiyonel)
  caregiverPhone?: string; // Bakıcı telefon numarası (opsiyonel)
  status: CaregiverStatus;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  // Yetkiler
  canViewSchedule: boolean; // Takvimi görüntüleyebilir
  canViewHistory: boolean; // Geçmişi görüntüleyebilir
  canReceiveAlerts: boolean; // Bildirim alabilir
  // FCM token for push notifications
  caregiverFcmToken?: string;

  /**
   * İlişkinin hangi davet koduyla kurulduğu.
   *
   * v1.7.4: Firestore kuralları bakıcının ilişki oluşturmasına YALNIZCA bu
   * kodu bilmesi hâlinde izin veriyor (kod hastanın ürettiği bir sırdır;
   * kural, invite dokümanının `patientId`si ile eşleşme arıyor). Bu alan
   * olmadan `create` reddedilir. Hastanın kendi yazdığı (migration) ilişkiler
   * için gerekmez.
   */
  inviteCode?: string;
}

// Bakıcı daveti
export interface CaregiverInvite {
  id: string; // Davet ID'si (6 haneli kod)
  patientId: string; // Hasta ID'si
  patientName: string; // Hasta adı
  patientEmail?: string; // Hasta e-postası
  patientPhone?: string; // Hasta telefon numarası (opsiyonel)
  caregiverEmail: string; // Davet edilen e-posta
  status: InviteStatus;
  expiresAt: string; // ISO date string
  // firestore.rules tarafındaki süre kontrolü bu sayısal alana bakar:
  // Rules Timestamp'te toISOString() olmadığı için ISO string ile
  // request.time karşılaştırılamaz (tip hatası → tüm kabuller reddedilir).
  expiresAtMs?: number; // epoch ms
  createdAt: string; // ISO date string
  // Yetkiler
  permissions: {
    canViewSchedule: boolean;
    canViewHistory: boolean;
    canReceiveAlerts: boolean;
  };
}

// Bakıcı için hasta bilgisi (salt okunur)
export interface PatientInfo {
  id: string; // Hasta ID'si
  name: string; // Hasta adı
  email?: string; // Hasta e-postası
  phoneNumber?: string; // Hasta telefon numarası (opsiyonel)
  relationshipId: string; // CaregiverRelationship ID'si
  status: CaregiverStatus;
  canViewSchedule?: boolean;
  canViewHistory?: boolean;
  canReceiveAlerts?: boolean;
  // İstatistikler (günlük)
  todaySummary?: {
    totalReminders: number;
    takenCount: number;
    missedCount: number;
    adherenceRate: number;
  };
}

// Navigation tipleri

// Tab Navigator parametreleri (önce tanımlanmalı - RootStackParamList'te kullanılıyor)
export type MainTabParamList = {
  Home: undefined;
  Medicines: undefined;
  Statistics: undefined;
  Settings: undefined;
};

// Root Stack parametreleri
export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList>;
  AddMedicine: {
    medicineId?: string;
    barcode?: string;
    scannedName?: string;
    prefillForm?: string;
    scannedDosage?: string;
    prefillName?: string;
    prefillDosage?: string;
    prefillManufacturer?: string;
    prefillGenericName?: string;
  };
  MedicineDetail: { medicineId: string };
  MedicineProspectus: { medicineId?: string; medicineName: string; dosage?: string };
  Alarm: {
    medicineId: string;
    reminderTimeId: string;
    scheduledTime: string;
    snoozeCount?: number; // Kaçıncı erteleme (background'dan gelen)
    originalScheduledTime?: string; // Orijinal alarm zamanı (snooze'larda kullanılır)
    // v1.7.1: Ekranı AÇAN alarmın türü. Erteleme alarmı native tarafta AYRI bir
    // requestCode/bildirim uzayında yaşıyor (bkz. notifications/nativeAlarm.ts);
    // ekran hangi türü iptal edeceğini bilmek zorunda — aksi halde "Şimdi Al"
    // ana alarmın requestCode'unu iptal edip erteleme alarmını armed bırakıyor.
    isSnooze?: boolean;
    snoozeId?: string; // Erteleme bildiriminin kimliğini kurmak için gerekli
  };
  Settings: undefined;
  History: undefined;
  Interactions: undefined;
  BarcodeScanner: { returnScreen?: string; mode?: 'assign' } | undefined;
  Premium: undefined;
  Security: undefined;
  TtsSettings: undefined;
  Caregiver: undefined;
  CaregiverInvite: { inviteCode?: string };
  DutyPharmacy: undefined;
  NotificationCenter: undefined;
  Permissions: undefined;
  Login: undefined;
  Register: undefined;
};

// Auth Stack Navigation
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

// ============ GLOBAL İLAÇ VERİTABANI ============

// Global ilaç veritabanı (tüm kullanıcılar için ortak)
export interface GlobalMedicine {
  id: string;
  barcode: string; // EAN-13 veya benzeri
  name: string; // İlaç adı
  genericName?: string; // Etken madde adı
  atcCode?: string; // ATC Kodu
  prescriptionType?: string; // Reçete Türü (Normal, Kırmızı vb.)
  dosage: string; // Doz bilgisi (500mg, 10ml, vb.)
  form: MedicineForm; // Tablet, şurup, vb.
  manufacturer: string; // Üretici firma
  country: string; // Ülke kodu (TR, US, DE, vb.)

  // Prospektüs bilgileri
  prospectus?: MedicineProspectus;

  // Meta bilgiler
  imageUrl?: string;
  isVerified: boolean; // Admin onaylı mı?
  addedBy: 'ai' | 'user' | 'admin';
  addedByUserId?: string;
  searchCount: number; // Popülerlik için

  createdAt: string;
  updatedAt: string;

  // İlaç etkileşimleri (AI arama sonuçları için)
  interactions?: string[];
}

// İlaç formu
export type MedicineForm =
  | 'tablet'
  | 'capsule'
  | 'syrup'
  | 'injection'
  | 'cream'
  | 'drops'
  | 'spray'
  // v1.7.1: `inhaler` eklendi. AI toplu tarama (`aiMedicineService`) ve
  // `prescriptionSafetyMatcher` bu degeri zaten uretiyordu (ornek: VENTOLIN
  // INHALER) ama tipte yoktu; `BatchMedicineImportModal` bu yuzden tsc'de
  // hata veriyordu. Inhaler klinik olarak ayri bir form — 'spray'e
  // yuvarlamak yanlis olur.
  | 'inhaler'
  | 'patch'
  | 'suppository'
  | 'powder'
  | 'other';

// Prospektüs bilgileri
export interface MedicineProspectus {
  indication?: string; // Endikasyonlar (ne için kullanılır)
  contraindication?: string; // Kontrendikasyonlar (ne zaman kullanılmaz)
  sideEffects?: string[]; // Yan etkiler
  dosageInstructions?: string; // Kullanım şekli ve dozu
  warnings?: string[]; // Uyarılar
  interactions?: string[]; // İlaç etkileşimleri
  pregnancy?: string; // Gebelikte kullanım
  storage?: string; // Saklama koşulları
  activeIngredients?: ActiveIngredient[];
}

// Etken madde
export interface ActiveIngredient {
  name: string;
  amount: string; // örn: "500mg"
}

// ============ AI YAPILANDIRMASI ============

export type AIProvider = 'gemini' | 'openai';

export interface AIConfig {
  provider: AIProvider;
  geminiApiKey?: string;
  openaiApiKey?: string;
  model?: string;
  maxTokens?: number;
}

// AI arama sonucu
export interface AISearchResult {
  success: boolean;
  medicine?: Partial<GlobalMedicine>;
  confidence: number; // 0-100 arası güven skoru
  source?: string; // Veri kaynağı
  error?: string;
}

// ============ HİBRİT ARAMA SİSTEMİ ============

// Arama kaynağı
export type SearchSource =
  | 'firebase' // Firebase globalMedicines
  | 'titck_cache' // TİTCK Excel cache
  | 'open_food_facts' // Open Food Facts API
  | 'ai' // AI (Gemini/OpenAI)
  | 'manual'; // Kullanıcı manuel girişi

// Hibrit arama sonucu
export interface HybridSearchResult {
  success: boolean;
  medicine?: Partial<GlobalMedicine>;
  source: SearchSource;
  confidence: number; // 0-100
  message?: string;
  searchDuration?: number; // ms
}

// Arama ilerleme durumu
export interface SearchProgress {
  currentStep: number;
  totalSteps: number;
  currentSource: SearchSource;
  message: string;
}

// TİTCK ilaç verisi (Excel'den)
export interface TITCKMedicine {
  barcode: string;
  name: string;
  manufacturer: string;
  price: number;
  atcCode?: string;
  dosage?: string;
}

// ============ ABONELİK SİSTEMİ ============

export type SubscriptionTier = 'free' | 'premium';

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  price: {
    monthly: number;
    yearly: number;
    lifetime?: number;
  };
  features: string[];
  limits: {
    maxMedicines: number; // -1 = sınırsız
    aiSearchPerDay: number; // -1 = sınırsız
    cloudSync: boolean;
    adFree: boolean;
    barcodeScanner: boolean;
    barcodeScanLimit: number; // -1 = sınırsız
  };
}

export interface UserSubscription {
  tier: SubscriptionTier;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  platform?: 'android' | 'ios';
  transactionId?: string;
}

// ============ ARAMA VE ÖNERİ ============

export interface MedicineSearchQuery {
  query: string;
  type: 'name' | 'barcode' | 'ingredient';
  country?: string;
  limit?: number;
}

export interface MedicineAutocompleteResult {
  id: string;
  name: string;
  dosage: string;
  manufacturer: string;
  matchScore: number;
  barcode?: string;
  form?: MedicineForm;
  genericName?: string;
  atcCode?: string;
  prescriptionType?: string;
}

// Reçete Modülü
export * from './prescription';
