/**
 * 🌪️ 10,000 RANDOM USER CHAOS & STRESS TEST HARNESS
 *
 * Bu test paketi 10.000 sanal kullanıcı oluşturup uygulamanın tüm
 * iş mantığı, doğrulama, istatistik, ilaç etkileşimi, PDF üretimi,
 * şifreleme ve serileştirme motorlarını yüksek yük altında stres testine tabi tutar.
 */

import nodeCrypto from 'crypto';
import * as Crypto from 'expo-crypto';
import {
  Medicine,
  MedicineLog,
  ReminderTime,
  UserSettings,
  MedicineForm,
  MedicineCategory,
} from '../../types';
import { validateSyncData } from '../../utils/syncDataValidator';
import { createBackupPayload, validateBackupPayload } from '../../services/backupRestoreService';
import { checkInteractionLocal } from '../../services/drugInteraction';
import { constantTimeEqual, isValidPin } from '../../utils/security/pinCrypto';
import { extractInviteCodeFromUrl, createInviteDeepLink } from '../../services/qrCodeService';
import { generateInviteCode, isValidInviteCode } from '../../services/caregiverService';
import { prepareReportData } from '../../services/pdfReportService';
import { calculateAdherenceRate } from '../../stores/helpers/dateTime';

// Test süresini uzat
jest.setTimeout(60000);

describe('🌪️ 10,000 Random Kullanıcı Stres ve Kaos Testi', () => {
  const TOTAL_USERS = 10000;

  // İstatistik metrikleri
  const metrics = {
    totalUsers: TOTAL_USERS,
    totalMedicines: 0,
    totalReminderTimes: 0,
    totalLogs: 0,
    totalInteractionsDetected: 0,
    totalPdfReportsGenerated: 0,
    totalSyncPayloadsValidated: 0,
    totalBackupsValidated: 0,
    totalPinVerifications: 0,
    totalQrLinksTested: 0,
    executionTimeMs: 0,
    peakMemoryMB: 0,
    errorsEncountered: 0,
  };

  const MEDICINE_CATALOG = [
    {
      name: 'Parol',
      active: 'Parasetamol',
      dosage: '500mg',
      form: 'tablet' as MedicineForm,
      cat: 'painkiller' as MedicineCategory,
    },
    {
      name: 'Aspirin',
      active: 'Asetilsalisilik Asit',
      dosage: '100mg',
      form: 'tablet' as MedicineForm,
      cat: 'heart' as MedicineCategory,
    },
    {
      name: 'Coumadin',
      active: 'Varfarin',
      dosage: '5mg',
      form: 'tablet' as MedicineForm,
      cat: 'heart' as MedicineCategory,
    },
    {
      name: 'Apranax',
      active: 'Naproksen',
      dosage: '550mg',
      form: 'tablet' as MedicineForm,
      cat: 'painkiller' as MedicineCategory,
    },
    {
      name: 'Glifor',
      active: 'Metformin',
      dosage: '1000mg',
      form: 'tablet' as MedicineForm,
      cat: 'diabetes' as MedicineCategory,
    },
    {
      name: 'Augmentin',
      active: 'Amoksisilin',
      dosage: '1000mg',
      form: 'tablet' as MedicineForm,
      cat: 'antibiotic' as MedicineCategory,
    },
    {
      name: 'Ventolin',
      active: 'Salbutamol',
      dosage: '100mcg',
      form: 'inhaler' as MedicineForm,
      cat: 'respiratory' as MedicineCategory,
    },
    {
      name: 'Nexium',
      active: 'Esomeprazol',
      dosage: '40mg',
      form: 'capsule' as MedicineForm,
      cat: 'digestive' as MedicineCategory,
    },
    {
      name: 'Cipram',
      active: 'Sitolopram',
      dosage: '20mg',
      form: 'tablet' as MedicineForm,
      cat: 'nervous' as MedicineCategory,
    },
    {
      name: 'Benexol B12',
      active: 'B1+B6+B12',
      dosage: '1 tablet',
      form: 'tablet' as MedicineForm,
      cat: 'vitamin' as MedicineCategory,
    },
  ];

  const SKIP_REASONS = [
    'side_effect',
    'out_of_stock',
    'felt_better',
    'doctor_advised',
    'forgot',
    'other',
  ];

  beforeAll(() => {
    // Gerçek hızlı SHA-256 motoru ile expo-crypto'yu bağla
    if (Crypto.digestStringAsync && jest.isMockFunction(Crypto.digestStringAsync)) {
      (Crypto.digestStringAsync as jest.Mock).mockImplementation(async (_algo, str) => {
        return nodeCrypto.createHash('sha256').update(str).digest('hex');
      });
    }
    if (Crypto.getRandomBytesAsync && jest.isMockFunction(Crypto.getRandomBytesAsync)) {
      (Crypto.getRandomBytesAsync as jest.Mock).mockImplementation(async (length: number) => {
        return nodeCrypto.randomBytes(length);
      });
    }
  });

  it('10.000 sanal kullanıcıyı ve tüm uygulama akışlarını hatasız simüle etmelidir', async () => {
    const startTime = Date.now();
    const initialMemory = process.memoryUsage().heapUsed;

    for (let i = 0; i < TOTAL_USERS; i++) {
      const userId = `user_${i + 1}`;
      const isSenior = i % 3 === 0; // %33 Kolay Mod kullanıcısı
      const isCaregiverPair = i % 5 === 0; // %20 Bakıcı eşleşmesi

      // 1. Ayarlar Nesnesi
      const userSettings: UserSettings = {
        wakeUpTime: '08:00',
        sleepTime: '23:00',
        notificationSound: 'default',
        vibrationEnabled: true,
        fullScreenAlarmEnabled: true,
        language: i % 10 === 0 ? 'en' : 'tr',
        alarmSound: 'alarm',
        alarmVolume: 85,
        snoozeDuration: 10,
        maxSnoozeCount: 3,
        quietHoursEnabled: false,
        quietHoursStart: '23:00',
        quietHoursEnd: '07:00',
        alarmModeEnabled: true,
        conflictIntervalMinutes: 30,
        securityEnabled: i % 4 === 0,
        securityType: 'pin',
        biometricsEnabled: false,
        lockTimeout: 0,
        ttsEnabled: isSenior,
        ttsVolume: 1.0,
        ttsRepeatCount: 1,
        ttsSpeakMedicineName: true,
        ttsSpeakDosage: true,
        ttsSpeakInstructions: true,
        persistentNotificationEnabled: true,
        persistentNotificationDuration: 15,
        seniorModeEnabled: isSenior,
      };

      // 2. PIN Güvenlik & Kriptografi Testi
      if (userSettings.securityEnabled) {
        const pin = `${1000 + (i % 8999)}`;
        const validFormat = isValidPin(pin);
        const salt = nodeCrypto.randomBytes(16).toString('hex');
        const hash = nodeCrypto.createHash('sha256').update(`${pin}|${salt}`).digest('hex');
        const verifyHash = nodeCrypto.createHash('sha256').update(`${pin}|${salt}`).digest('hex');
        const wrongHash = nodeCrypto.createHash('sha256').update(`999999|${salt}`).digest('hex');

        const isCorrect = constantTimeEqual(hash, verifyHash);
        const isWrong = constantTimeEqual(hash, wrongHash);

        if (!validFormat || !isCorrect || isWrong) {
          metrics.errorsEncountered++;
        }
        metrics.totalPinVerifications += 2;
      }

      // 3. İlaçlar ve Hatırlatıcılar Oluştur (Kullanıcı başına 1 - 5 ilaç)
      const medCount = 1 + (i % 5);
      const userMedicines: Medicine[] = [];
      const userReminders: ReminderTime[] = [];
      const userLogs: MedicineLog[] = [];

      for (let m = 0; m < medCount; m++) {
        const catMed = MEDICINE_CATALOG[(i + m) % MEDICINE_CATALOG.length];
        const medId = `med_${userId}_${m + 1}`;
        const stock = (i * 7 + m * 3) % 40;

        const med: Medicine = {
          id: medId,
          name: `${catMed.name} ${m > 0 ? (m + 1).toString() : ''}`.trim(),
          dosage: catMed.dosage,
          frequency: 1 + (m % 3),
          instructions: m % 2 === 0 ? 'after_meal' : 'before_meal',
          color: '#3B82F6',
          category: catMed.cat,
          form: catMed.form,
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          stockEnabled: true,
          stockCount: stock,
          stockThreshold: 5,
          stockUnit: 'tablet',
          expiryDate: '2027-12-31',
          requireBarcodeOnTake: false,
          vibrationPattern: 'default',
          scheduleType: 'daily',
        };
        userMedicines.push(med);

        // Hatırlatıcı saatleri
        for (let r = 0; r < med.frequency; r++) {
          const remId = `rem_${medId}_${r + 1}`;
          const hour = (8 + r * 6).toString().padStart(2, '0');
          const rem: ReminderTime = {
            id: remId,
            medicineId: medId,
            time: `${hour}:00`,
            isEnabled: true,
          };
          userReminders.push(rem);

          // 7 Günlük Loglar Oluştur (Simülasyon)
          for (let day = 0; day < 7; day++) {
            const statusRand = (i + m + r + day) % 10;
            const status: 'taken' | 'skipped' | 'missed' =
              statusRand < 7 ? 'taken' : statusRand < 9 ? 'skipped' : 'missed';
            const logDate = new Date(Date.now() - day * 24 * 60 * 60 * 1000);
            logDate.setHours(8 + r * 6, 0, 0, 0);

            const medLog: MedicineLog = {
              id: `log_${remId}_${day}`,
              medicineId: medId,
              reminderTimeId: remId,
              scheduledTime: logDate.toISOString(),
              takenAt: status === 'taken' ? logDate.toISOString() : undefined,
              status,
              note: status === 'skipped' ? 'Hasta hissetti' : undefined,
              skipReason:
                status === 'skipped' ? SKIP_REASONS[day % SKIP_REASONS.length] : undefined,
            };
            userLogs.push(medLog);
          }
        }
      }

      metrics.totalMedicines += userMedicines.length;
      metrics.totalReminderTimes += userReminders.length;
      metrics.totalLogs += userLogs.length;

      // 4. İlaç Etkileşim Kontrolü (O(N^2) Matrix)
      if (userMedicines.length >= 2) {
        for (let m1 = 0; m1 < userMedicines.length; m1++) {
          for (let m2 = m1 + 1; m2 < userMedicines.length; m2++) {
            const interaction = checkInteractionLocal(
              userMedicines[m1].name,
              userMedicines[m2].name
            );
            if (interaction) {
              metrics.totalInteractionsDetected++;
            }
          }
        }
      }

      // 5. Uyum Oranı ve İstatistik Hesaplama
      const adherence = calculateAdherenceRate(userLogs, userMedicines, userReminders, 7);
      if (typeof adherence !== 'number' || isNaN(adherence)) {
        metrics.errorsEncountered++;
      }

      // 6. QR Kod & Bakıcı Davet Simülasyonu
      if (isCaregiverPair) {
        const inviteCode = generateInviteCode();
        const isValidCode = isValidInviteCode(inviteCode);
        const deepLink = createInviteDeepLink(inviteCode);
        const extracted = extractInviteCodeFromUrl(deepLink);

        if (!isValidCode || extracted !== inviteCode) {
          metrics.errorsEncountered++;
        }
        metrics.totalQrLinksTested++;
      }

      // 7. Zod Cloud Sync Validator Testi (Her 50 kullanıcıda bir)
      if (i % 50 === 0) {
        const syncResult = validateSyncData({
          medicines: userMedicines,
          reminderTimes: userReminders,
          medicineLogs: userLogs,
          settings: userSettings,
        });
        if (!syncResult.success) {
          metrics.errorsEncountered++;
        }
        metrics.totalSyncPayloadsValidated++;
      }

      // 8. Yedekleme & JSON Serileştirme Testi (Her 100 kullanıcıda bir)
      if (i % 100 === 0) {
        const backup = createBackupPayload(userMedicines, userReminders, userLogs, userSettings);
        const validation = validateBackupPayload(backup);
        if (!validation.isValid) {
          metrics.errorsEncountered++;
        }
        metrics.totalBackupsValidated++;
      }

      // 9. PDF Rapor Derleme Stres Testi (Her 200 kullanıcıda bir)
      if (i % 200 === 0) {
        const reportData = prepareReportData(userMedicines, userLogs, userSettings, 85, 5, 30);
        if (reportData.logs.length === 0 && userLogs.length > 0) {
          metrics.errorsEncountered++;
        }
        metrics.totalPdfReportsGenerated++;
      }
    }

    const endTime = Date.now();
    const finalMemory = process.memoryUsage().heapUsed;

    metrics.executionTimeMs = endTime - startTime;
    metrics.peakMemoryMB = Math.round((finalMemory - initialMemory) / (1024 * 1024));

    // Stres Testi Raporu Çıktısı
    console.log('====================================================');
    console.log('🌪️ 10.000 KULLANICI STRES TESTİ SONUÇLARI');
    console.log('====================================================');
    console.log(`👤 Toplam Simüle Edilen Kullanıcı : ${metrics.totalUsers.toLocaleString()}`);
    console.log(`💊 Üretilen Toplam İlaç            : ${metrics.totalMedicines.toLocaleString()}`);
    console.log(
      `⏰ Üretilen Hatırlatıcı Saati      : ${metrics.totalReminderTimes.toLocaleString()}`
    );
    console.log(`📋 İşlenen İlaç Kullanım Logu      : ${metrics.totalLogs.toLocaleString()}`);
    console.log(
      `⚠️ Tespit Edilen İlaç Etkileşimi  : ${metrics.totalInteractionsDetected.toLocaleString()}`
    );
    console.log(
      `📄 Derlenen PDF Raporu             : ${metrics.totalPdfReportsGenerated.toLocaleString()}`
    );
    console.log(
      `☁️ Zod Cloud Sync Doğrulaması      : ${metrics.totalSyncPayloadsValidated.toLocaleString()}`
    );
    console.log(
      `💾 JSON Yedekleme Doğrulaması      : ${metrics.totalBackupsValidated.toLocaleString()}`
    );
    console.log(
      `🔒 Kriptografik PIN Doğrulaması    : ${metrics.totalPinVerifications.toLocaleString()}`
    );
    console.log(
      `📲 QR / Deep Link Testi            : ${metrics.totalQrLinksTested.toLocaleString()}`
    );
    console.log(
      `⏱️ Toplam Çalışma Süresi          : ${(metrics.executionTimeMs / 1000).toFixed(2)} saniye`
    );
    console.log(
      `⚡ İşlem Hızı (Throughput)         : ${Math.round(metrics.totalLogs / (metrics.executionTimeMs / 1000)).toLocaleString()} log/sn`
    );
    console.log(`💥 Karşılaşılan Hata Sayısı        : ${metrics.errorsEncountered}`);
    console.log('====================================================');

    expect(metrics.errorsEncountered).toBe(0);
    expect(metrics.totalMedicines).toBeGreaterThan(25000);
    expect(metrics.totalLogs).toBeGreaterThan(300000);
  });
});
