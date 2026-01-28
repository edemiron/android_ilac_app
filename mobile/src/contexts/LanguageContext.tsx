import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as RNLocalize from 'react-native-localize';
import { createScopedLogger } from '../utils/logger';

const log = createScopedLogger('LanguageContext');

// Desteklenen diller
export type Language = 'tr' | 'en';

// Türkçe çeviriler
const tr = {
  // Genel
  app_name: 'İlaç Hatırlatıcı',
  loading: 'Yükleniyor...',
  save: 'Kaydet',
  cancel: 'İptal',
  delete: 'Sil',
  edit: 'Düzenle',
  back: 'Geri',
  done: 'Tamam',
  yes: 'Evet',
  no: 'Hayır',
  ok: 'Tamam',
  update: 'Güncelle',
  error: 'Hata',
  success: 'Başarılı',
  warning: 'Uyarı',

  // Tab bar
  tab_home: 'Ana Sayfa',
  tab_medicines: 'İlaçlarım',
  tab_statistics: 'İstatistikler',
  tab_settings: 'Ayarlar',

  // Ana sayfa
  home_title: 'İlaç Hatırlatıcı',
  home_today_reminders: 'Bugünkü Hatırlatmalar',
  home_no_reminders: 'Bugün için hatırlatma yok',
  home_add_medicine: 'İlaç Ekle',
  home_next_reminder: 'Sonraki hatırlatma',
  home_adherence: 'Uyum Oranı',
  home_taken: 'Alındı',
  home_mark_taken: 'Aldım',
  home_pending: 'Bekliyor',
  home_skipped: 'Atlandı',
  home_missed: 'Kaçırıldı',

  // İlaç listesi
  medicines_title: 'İlaçlarım',
  medicines_empty: 'Henüz ilaç eklenmemiş',
  medicines_add_first: 'İlk ilacınızı ekleyin',
  medicines_active: 'Aktif',
  medicines_inactive: 'Pasif',
  medicines_times_per_day: 'günde {count} kez',

  // İlaç ekleme/düzenleme
  add_medicine_title: 'Yeni İlaç Ekle',
  edit_medicine_title: 'İlacı Düzenle',
  medicine_name: 'İlaç Adı',
  medicine_name_placeholder: 'Örn: Aspirin',
  medicine_dosage: 'Doz',
  medicine_dosage_placeholder: 'Örn: 500mg, 1 tablet',
  medicine_frequency: 'Günlük Kullanım',
  medicine_frequency_times: '{count} kez',
  medicine_instruction: 'Kullanım Talimatı',
  medicine_color: 'Renk',
  medicine_start_date: 'Başlangıç Tarihi',
  medicine_end_date: 'Bitiş Tarihi (Opsiyonel)',
  medicine_reminder_times: 'Hatırlatma Zamanları',
  medicine_scan_barcode: 'Barkod Tara',

  // Kullanım talimatları
  instruction_before_meal: 'Yemekten önce',
  instruction_after_meal: 'Yemekten sonra',
  instruction_with_meal: 'Yemekle birlikte',
  instruction_empty_stomach: 'Aç karnına',
  instruction_before_sleep: 'Yatmadan önce',
  instruction_any_time: 'Herhangi bir zaman',

  // Ayarlar
  settings_title: 'Ayarlar',
  settings_general: 'Genel',
  settings_notifications: 'Bildirimler',
  settings_appearance: 'Görünüm',
  settings_about: 'Hakkında',

  settings_wake_time: 'Uyanma Saati',
  settings_sleep_time: 'Uyku Saati',
  settings_language: 'Dil',
  settings_theme: 'Tema',
  settings_theme_light: 'Açık',
  settings_theme_dark: 'Koyu',
  settings_theme_system: 'Sistem',

  settings_notifications_enabled: 'Bildirimler',
  settings_sound: 'Ses',
  settings_vibration: 'Titreşim',
  settings_fullscreen_alarm: 'Tam Ekran Alarm',
  settings_voice_reminder: 'Sesli Hatırlatma',
  settings_test_notification: 'Test Bildirimi Gönder',
  settings_open_settings: 'Ayarları Aç',
  settings_notification_permission: 'Bildirim izni gerekli',

  settings_version: 'Versiyon',
  settings_rate_app: 'Uygulamayı Değerlendir',
  settings_contact: 'İletişim',

  // İstatistikler
  stats_title: 'İstatistikler',
  stats_weekly: 'Haftalık',
  stats_monthly: 'Aylık',
  stats_yearly: 'Yıllık',
  stats_adherence_rate: 'Uyum Oranı',
  stats_total_taken: 'Toplam Alınan',
  stats_total_missed: 'Toplam Kaçırılan',
  stats_streak: 'Ardışık Gün',
  stats_best_streak: 'En İyi Seri',
  stats_no_data: 'Henüz veri yok',
  stats_history: 'Geçmiş',

  // Alarm
  alarm_time_to_take: 'İlaç zamanı!',
  alarm_take_now: 'Şimdi Al',
  alarm_snooze: 'Ertele',
  alarm_skip: 'Atla',
  alarm_snooze_minutes: '{minutes} dakika ertele',

  // Barkod tarama
  barcode_title: 'Barkod Tara',
  barcode_scanning: 'Taranıyor...',
  barcode_align: 'Barkodu çerçeveye hizalayın',
  barcode_not_found: 'İlaç bulunamadı',
  barcode_camera_permission: 'Kamera izni gerekli',

  // Prospektüs
  prospectus_title: 'Prospektüs',

  // İlaç etkileşimi
  interaction_title: 'İlaç Etkileşimleri',
  interaction_checking: 'Kontrol ediliyor...',
  interaction_none: 'Etkileşim bulunamadı',
  interaction_found: '{count} etkileşim bulundu',
  interaction_severity_low: 'Düşük',
  interaction_severity_moderate: 'Orta',
  interaction_severity_high: 'Yüksek',
  interaction_consult_doctor: 'Doktorunuza danışın',

  // Stok takibi
  stock_title: 'Stok Durumu',
  stock_remaining: 'Kalan: {count}',
  stock_low: 'Stok azalıyor',
  stock_empty: 'Stok bitti',
  stock_refill_reminder: 'Yenileme hatırlatıcısı',

  // Son kullanma tarihi
  expiry_title: 'Son Kullanma Tarihi',
  expiry_date: 'Tarih',
  expiry_date_placeholder: 'Tarih seçin',
  expiry_reminder: 'Hatırlatma',
  expiry_reminder_days: '{days} gün önce',
  expiry_1_week: '1 hafta',
  expiry_2_weeks: '2 hafta',
  expiry_1_month: '1 ay',
  expiry_3_months: '3 ay',
  expiry_expired: 'Süresi doldu',
  expiry_expires_today: 'Bugün doluyor',
  expiry_expires_soon: '{days} gün kaldı',
  expiry_clear: 'Temizle',

  // Hata mesajları
  error_required_field: 'Bu alan zorunludur',
  error_invalid_time: 'Geçersiz zaman formatı',
  error_network: 'Bağlantı hatası',
  error_unknown: 'Bilinmeyen hata',

  // Onay mesajları
  confirm_delete_medicine: 'Bu ilacı silmek istediğinizden emin misiniz?',
  confirm_skip_medicine: 'Bu dozu atlamak istediğinizden emin misiniz?',

  // İlaç çakışma aralığı
  settings_conflict_interval: 'İlaç Aralığı',
  settings_conflict_interval_desc: 'Aynı saate denk gelen ilaçlar arası mesafe',
  conflict_auto_adjust: 'Otomatik Düzenle',
  conflict_auto_adjust_desc: 'Saatleri otomatik olarak kaydır',
  conflict_minutes: '{minutes} dakika',

  // Özel frequency
  custom: 'Özel',
  custom_frequency_title: 'Özel Saat Sayısı',
  custom_frequency_placeholder: 'Sayı girin (7-24)',
  frequency_range_error: '1-24 arası bir sayı girin',
};

// İngilizce çeviriler
const en: typeof tr = {
  // General
  app_name: 'Medicine Reminder',
  loading: 'Loading...',
  save: 'Save',
  cancel: 'Cancel',
  delete: 'Delete',
  edit: 'Edit',
  back: 'Back',
  done: 'Done',
  yes: 'Yes',
  no: 'No',
  ok: 'OK',
  update: 'Update',
  error: 'Error',
  success: 'Success',
  warning: 'Warning',

  // Tab bar
  tab_home: 'Home',
  tab_medicines: 'Medicines',
  tab_statistics: 'Statistics',
  tab_settings: 'Settings',

  // Home screen
  home_title: 'Medicine Reminder',
  home_today_reminders: "Today's Reminders",
  home_no_reminders: 'No reminders for today',
  home_add_medicine: 'Add Medicine',
  home_next_reminder: 'Next reminder',
  home_adherence: 'Adherence Rate',
  home_taken: 'Taken',
  home_mark_taken: 'Take',
  home_pending: 'Pending',
  home_skipped: 'Skipped',
  home_missed: 'Missed',

  // Medicine list
  medicines_title: 'My Medicines',
  medicines_empty: 'No medicines added yet',
  medicines_add_first: 'Add your first medicine',
  medicines_active: 'Active',
  medicines_inactive: 'Inactive',
  medicines_times_per_day: '{count} times/day',

  // Add/Edit medicine
  add_medicine_title: 'Add New Medicine',
  edit_medicine_title: 'Edit Medicine',
  medicine_name: 'Medicine Name',
  medicine_name_placeholder: 'E.g., Aspirin',
  medicine_dosage: 'Dosage',
  medicine_dosage_placeholder: 'E.g., 500mg, 1 tablet',
  medicine_frequency: 'Daily Frequency',
  medicine_frequency_times: '{count} times',
  medicine_instruction: 'Instructions',
  medicine_color: 'Color',
  medicine_start_date: 'Start Date',
  medicine_end_date: 'End Date (Optional)',
  medicine_reminder_times: 'Reminder Times',
  medicine_scan_barcode: 'Scan Barcode',

  // Instructions
  instruction_before_meal: 'Before meal',
  instruction_after_meal: 'After meal',
  instruction_with_meal: 'With meal',
  instruction_empty_stomach: 'Empty stomach',
  instruction_before_sleep: 'Before sleep',
  instruction_any_time: 'Any time',

  // Settings
  settings_title: 'Settings',
  settings_general: 'General',
  settings_notifications: 'Notifications',
  settings_appearance: 'Appearance',
  settings_about: 'About',

  settings_wake_time: 'Wake Up Time',
  settings_sleep_time: 'Sleep Time',
  settings_language: 'Language',
  settings_theme: 'Theme',
  settings_theme_light: 'Light',
  settings_theme_dark: 'Dark',
  settings_theme_system: 'System',

  settings_notifications_enabled: 'Notifications',
  settings_sound: 'Sound',
  settings_vibration: 'Vibration',
  settings_fullscreen_alarm: 'Fullscreen Alarm',
  settings_voice_reminder: 'Voice Reminder',
  settings_test_notification: 'Send Test Notification',
  settings_open_settings: 'Open Settings',
  settings_notification_permission: 'Notification permission required',

  settings_version: 'Version',
  settings_rate_app: 'Rate App',
  settings_contact: 'Contact',

  // Statistics
  stats_title: 'Statistics',
  stats_weekly: 'Weekly',
  stats_monthly: 'Monthly',
  stats_yearly: 'Yearly',
  stats_adherence_rate: 'Adherence Rate',
  stats_total_taken: 'Total Taken',
  stats_total_missed: 'Total Missed',
  stats_streak: 'Current Streak',
  stats_best_streak: 'Best Streak',
  stats_no_data: 'No data yet',
  stats_history: 'History',

  // Alarm
  alarm_time_to_take: 'Time to take medicine!',
  alarm_take_now: 'Take Now',
  alarm_snooze: 'Snooze',
  alarm_skip: 'Skip',
  alarm_snooze_minutes: 'Snooze {minutes} min',

  // Barcode scanning
  barcode_title: 'Scan Barcode',
  barcode_scanning: 'Scanning...',
  barcode_align: 'Align barcode in frame',
  barcode_not_found: 'Medicine not found',
  barcode_camera_permission: 'Camera permission required',

  // Prospectus
  prospectus_title: 'Prospectus',

  // Drug interactions
  interaction_title: 'Drug Interactions',
  interaction_checking: 'Checking...',
  interaction_none: 'No interactions found',
  interaction_found: '{count} interactions found',
  interaction_severity_low: 'Low',
  interaction_severity_moderate: 'Moderate',
  interaction_severity_high: 'High',
  interaction_consult_doctor: 'Consult your doctor',

  // Stock tracking
  stock_title: 'Stock Status',
  stock_remaining: 'Remaining: {count}',
  stock_low: 'Stock is low',
  stock_empty: 'Out of stock',
  stock_refill_reminder: 'Refill reminder',

  // Expiry date
  expiry_title: 'Expiry Date',
  expiry_date: 'Date',
  expiry_date_placeholder: 'Select date',
  expiry_reminder: 'Reminder',
  expiry_reminder_days: '{days} days before',
  expiry_1_week: '1 week',
  expiry_2_weeks: '2 weeks',
  expiry_1_month: '1 month',
  expiry_3_months: '3 months',
  expiry_expired: 'Expired',
  expiry_expires_today: 'Expires today',
  expiry_expires_soon: '{days} days left',
  expiry_clear: 'Clear',

  // Error messages
  error_required_field: 'This field is required',
  error_invalid_time: 'Invalid time format',
  error_network: 'Network error',
  error_unknown: 'Unknown error',

  // Confirmation messages
  confirm_delete_medicine: 'Are you sure you want to delete this medicine?',
  confirm_skip_medicine: 'Are you sure you want to skip this dose?',

  // Medicine conflict interval
  settings_conflict_interval: 'Medicine Interval',
  settings_conflict_interval_desc: 'Time gap between medicines at the same time',
  conflict_auto_adjust: 'Auto Adjust',
  conflict_auto_adjust_desc: 'Automatically shift times',
  conflict_minutes: '{minutes} minutes',

  // Custom frequency
  custom: 'Custom',
  custom_frequency_title: 'Custom Frequency',
  custom_frequency_placeholder: 'Enter number (7-24)',
  frequency_range_error: 'Enter a number between 1-24',
};

const translations = { tr, en };

export type TranslationKey = keyof typeof tr;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = '@app_language';

// Pre-load language from storage (called before React tree mounts)
let cachedLanguage: Language | null = null;
let languageLoadPromise: Promise<Language> | null = null;

export function preloadLanguage(): Promise<Language> {
  if (cachedLanguage !== null) {
    return Promise.resolve(cachedLanguage);
  }
  if (languageLoadPromise) {
    return languageLoadPromise;
  }
  languageLoadPromise = AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
    .then(savedLanguage => {
      if (savedLanguage && ['tr', 'en'].includes(savedLanguage)) {
        cachedLanguage = savedLanguage as Language;
      } else {
        // Sistem dilini kontrol et
        const deviceLanguage = RNLocalize.getLocales()[0]?.languageCode;
        cachedLanguage = deviceLanguage === 'tr' ? 'tr' : 'en';
      }
      return cachedLanguage;
    })
    .catch(() => {
      cachedLanguage = 'tr';
      return cachedLanguage;
    });
  return languageLoadPromise;
}

// Start preloading immediately when module loads
preloadLanguage();

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(cachedLanguage || 'tr');
  const [isLoaded, setIsLoaded] = useState(cachedLanguage !== null);

  useEffect(() => {
    if (!isLoaded) {
      loadLanguage();
    }
  }, [isLoaded]);

  const loadLanguage = async () => {
    try {
      const loadedLanguage = await preloadLanguage();
      setLanguageState(loadedLanguage);
    } catch (error) {
      log.error('Dil yuklenemedi', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const setLanguage = async (lang: Language) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      setLanguageState(lang);
    } catch (error) {
      log.error('Dil kaydedilemedi', error);
    }
  };

  // Çeviri fonksiyonu
  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    let text = translations[language][key] || translations['tr'][key] || key;

    // Parametreleri değiştir
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text.replace(`{${paramKey}}`, String(value));
      });
    }

    return text;
  };

  if (!isLoaded) {
    return null;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
