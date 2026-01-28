import { NavigatorScreenParams } from '@react-navigation/native';

// İlaç tipi tanımları
export interface Medicine {
  id: string;
  name: string;
  dosage: string; // örn: "500mg", "1 tablet"
  frequency: number; // günde kaç kez
  instructions?: MedicineInstruction;
  color: string; // UI için renk kodu
  icon?: string;
  startDate: string; // ISO date string
  endDate?: string; // Opsiyonel bitiş tarihi
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  customTimes?: string[]; // Manuel eklenen saatler ["08:30", "14:00", "21:00"]

  // Stok takibi
  stockEnabled?: boolean; // Stok takibi aktif mi?
  stockCount?: number; // Mevcut stok sayısı
  stockThreshold?: number; // Az kaldı uyarı eşiği (varsayılan: 5)
  stockUnit?: string; // Birim: "tablet", "kapsül", "ml", "doz" vb.

  // Son kullanma tarihi
  expiryDate?: string; // ISO date string (YYYY-MM-DD)
  expiryReminderDays?: number; // Kaç gün önce hatırlat (7, 14, 30, 90)
}

// İlaç kullanım talimatları
export type MedicineInstruction =
  | 'before_meal' // Yemekten önce
  | 'after_meal' // Yemekten sonra
  | 'with_meal' // Yemekle birlikte
  | 'empty_stomach' // Aç karnına
  | 'before_sleep' // Yatmadan önce
  | 'any_time'; // Herhangi bir zaman

// Hatırlatma zamanı
export interface ReminderTime {
  id: string;
  medicineId: string;
  time: string; // "HH:mm" formatında
  notificationId?: string;
  isEnabled: boolean;
}

// Kullanıcı ayarları
// Alarm sesi seçenekleri
export type AlarmSoundType = 'alarm' | 'default' | 'gentle' | 'urgent';

export interface UserSettings {
  wakeUpTime: string; // "HH:mm" - varsayılan "08:00"
  sleepTime: string; // "HH:mm" - varsayılan "23:00"
  notificationSound: string;
  vibrationEnabled: boolean;
  fullScreenAlarmEnabled: boolean;
  language: 'tr' | 'en';

  // Alarm sesi ayarı
  alarmSound: AlarmSoundType; // Varsayılan 'alarm'
  alarmVolume: number; // 0-100 arası (varsayılan 80)

  // Erteleme ayarları
  snoozeDuration: number; // dakika cinsinden (varsayılan 5)

  // Gece modu (sessiz saatler)
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "HH:mm" formatında (varsayılan "23:00")
  quietHoursEnd: string; // "HH:mm" formatında (varsayılan "07:00")

  // Alarm modu - Sessizde bile ses çıkar
  alarmModeEnabled: boolean; // Telefon sessizde/titreşimde bile alarm sesi çalar

  // İlaç çakışma aralığı - Aynı saate denk gelen ilaçlar arası mesafe (dakika)
  conflictIntervalMinutes: number; // Varsayılan 10 dakika
}

// İlaç alma kaydı
export interface MedicineLog {
  id: string;
  medicineId: string;
  reminderTimeId: string;
  scheduledTime: string; // ISO date string
  takenAt?: string; // Alındıysa ISO date string
  status: 'pending' | 'taken' | 'skipped' | 'missed';
  note?: string;
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
  };
  Settings: undefined;
  History: undefined;
  Interactions: undefined;
  BarcodeScanner: undefined;
  Premium: undefined;
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
}
