import { generatePDF } from 'react-native-html-to-pdf';
import { Medicine, MedicineLog, UserSettings } from '../types';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { createScopedLogger } from '../utils/logger';
import Share from 'react-native-share';
import { Platform } from 'react-native';

const log = createScopedLogger('PDFReportService');

export interface ReportData {
  medicines: Medicine[];
  logs: MedicineLog[];
  settings: UserSettings;
  adherenceRate: number;
  currentStreak: number;
  dateRange: {
    start: Date;
    end: Date;
  };
}

export interface ReportOptions {
  days: 7 | 30 | 90;
  includeDetails: boolean;
  language: 'tr' | 'en';
}

const translations = {
  tr: {
    title: 'İlaç Takip Raporu',
    subtitle: 'Detaylı Uyum Raporu',
    dateRange: 'Tarih Aralığı',
    summary: 'Özet',
    adherenceRate: 'Uyum Oranı',
    currentStreak: 'Mevcut Seri',
    days: 'gün',
    totalMedicines: 'Toplam İlaç',
    totalDoses: 'Toplam Doz',
    taken: 'Alındı',
    skipped: 'Atlandı',
    missed: 'Kaçırıldı',
    medicineList: 'İlaç Listesi',
    name: 'İlaç Adı',
    dosage: 'Dozaj',
    frequency: 'Sıklık',
    times: 'Saatler',
    dailyLog: 'Günlük Kayıtlar',
    date: 'Tarih',
    time: 'Saat',
    status: 'Durum',
    generatedAt: 'Rapor Tarihi',
    perDay: 'günde',
    stock: 'Stok',
    remaining: 'kalan',
  },
  en: {
    title: 'Medicine Tracking Report',
    subtitle: 'Detailed Adherence Report',
    dateRange: 'Date Range',
    summary: 'Summary',
    adherenceRate: 'Adherence Rate',
    currentStreak: 'Current Streak',
    days: 'days',
    totalMedicines: 'Total Medicines',
    totalDoses: 'Total Doses',
    taken: 'Taken',
    skipped: 'Skipped',
    missed: 'Missed',
    medicineList: 'Medicine List',
    name: 'Medicine Name',
    dosage: 'Dosage',
    frequency: 'Frequency',
    times: 'Times',
    dailyLog: 'Daily Log',
    date: 'Date',
    time: 'Time',
    status: 'Status',
    generatedAt: 'Report Date',
    perDay: 'per day',
    stock: 'Stock',
    remaining: 'remaining',
  },
};

function decodeUnicodeEscapes(str: string): string {
  if (!str) return str;
  return str.replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

// Türkçe karakter düzeltme - API'lerden gelen ASCII metinleri düzelt
const TURKISH_CORRECTIONS: Record<string, string> = {
  GOZ: 'GÖZ',
  SURUP: 'ŞURUP',
  KAPSUL: 'KAPSÜL',
  SUSPANSIYON: 'SÜSPANSİYON',
  EMULSIYON: 'EMÜLSİYON',
  FITIL: 'FİTİL',
  SASE: 'SAŞE',
  GRANUL: 'GRANÜL',
  COZUCU: 'ÇÖZÜCÜ',
  COZELTI: 'ÇÖZELTİ',
  ENJEKSIYON: 'ENJEKSİYON',
  INHALER: 'İNHALER',
  ILAC: 'İLAÇ',
  OZEL: 'ÖZEL',
  URUN: 'ÜRÜN',
  ICIN: 'İÇİN',
  AGIZ: 'AĞIZ',
  TOPIKAL: 'TOPİKAL',
  OFTALMIK: 'OFTALMİK',
  goz: 'göz',
  surup: 'şurup',
  kapsul: 'kapsül',
  suspansiyon: 'süspansiyon',
  emulsiyon: 'emülsiyon',
  sase: 'saşe',
  granul: 'granül',
  cozucu: 'çözücü',
  cozelti: 'çözelti',
  ilac: 'ilaç',
  ozel: 'özel',
  urun: 'ürün',
  icin: 'için',
  agiz: 'ağız',
};

function fixTurkishCharacters(text: string): string {
  if (!text) return text;
  let result = decodeUnicodeEscapes(text);
  for (const [wrong, correct] of Object.entries(TURKISH_CORRECTIONS)) {
    const regex = new RegExp(`\\b${wrong}\\b`, 'g');
    result = result.replace(regex, correct);
  }
  return result;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'taken':
      return '#4CAF50';
    case 'skipped':
      return '#FF9800';
    case 'missed':
      return '#F44336';
    default:
      return '#9E9E9E';
  }
}

function getStatusText(status: string, lang: 'tr' | 'en'): string {
  const t = translations[lang];
  switch (status) {
    case 'taken':
      return t.taken;
    case 'skipped':
      return t.skipped;
    case 'missed':
      return t.missed;
    default:
      return status;
  }
}

function generateHTMLReport(data: ReportData, options: ReportOptions): string {
  const t = translations[options.language];
  const locale = options.language === 'tr' ? tr : undefined;

  const startDate = format(data.dateRange.start, 'dd MMMM yyyy', { locale });
  const endDate = format(data.dateRange.end, 'dd MMMM yyyy', { locale });

  // İstatistikleri hesapla
  const filteredLogs = data.logs.filter(logItem => {
    const logDate = new Date(logItem.scheduledTime);
    return logDate >= data.dateRange.start && logDate <= data.dateRange.end;
  });

  const takenCount = filteredLogs.filter(l => l.status === 'taken').length;
  const skippedCount = filteredLogs.filter(l => l.status === 'skipped').length;
  const missedCount = filteredLogs.filter(l => l.status === 'missed').length;

  // Aktif ilaçlar
  const activeMedicines = data.medicines.filter(m => m.isActive);

  // HTML oluştur
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 12px;
      color: #333;
      padding: 0;
      background: #fff;
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 2px solid #4ECDC4;
      margin-bottom: 20px;
    }
    .header h1 {
      color: #4ECDC4;
      font-size: 24px;
      margin-bottom: 5px;
    }
    .header h2 {
      color: #666;
      font-size: 14px;
      font-weight: normal;
    }
    .date-range {
      text-align: center;
      color: #888;
      margin-bottom: 20px;
    }
    .summary-grid {
      text-align: center;
      margin-bottom: 30px;
    }
    .summary-card {
      display: inline-block;
      background: #f8f9fa;
      border-radius: 8px;
      padding: 15px 20px;
      text-align: center;
      min-width: 120px;
      margin: 5px;
      vertical-align: top;
    }
    .summary-card .value {
      font-size: 28px;
      font-weight: bold;
      color: #4ECDC4;
    }
    .summary-card .label {
      font-size: 11px;
      color: #666;
      margin-top: 5px;
    }
    .summary-card.green .value { color: #4CAF50; }
    .summary-card.orange .value { color: #FF9800; }
    .summary-card.red .value { color: #F44336; }
    .section {
      margin-bottom: 25px;
    }
    .section-title {
      font-size: 16px;
      color: #333;
      border-bottom: 1px solid #eee;
      padding-bottom: 8px;
      margin-bottom: 15px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    th {
      background: #4ECDC4;
      color: white;
      padding: 10px 8px;
      text-align: left;
    }
    td {
      padding: 8px;
      border-bottom: 1px solid #eee;
    }
    tr:nth-child(even) {
      background: #f9f9f9;
    }
    .status-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 12px;
      color: white;
      font-size: 10px;
      font-weight: bold;
    }
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #eee;
      text-align: center;
      color: #888;
      font-size: 10px;
    }
    .medicine-card {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 10px;
      border-left: 4px solid #4ECDC4;
    }
    .medicine-name {
      font-weight: bold;
      font-size: 14px;
      margin-bottom: 5px;
    }
    .medicine-details {
      color: #666;
      font-size: 11px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>💊 ${t.title}</h1>
    <h2>${t.subtitle}</h2>
  </div>

  <div class="date-range">
    ${t.dateRange}: ${startDate} - ${endDate}
  </div>

  <div class="summary-grid">
    <div class="summary-card">
      <div class="value">${data.adherenceRate}%</div>
      <div class="label">${t.adherenceRate}</div>
    </div>
    <div class="summary-card">
      <div class="value">${data.currentStreak}</div>
      <div class="label">${t.currentStreak} (${t.days})</div>
    </div>
    <div class="summary-card green">
      <div class="value">${takenCount}</div>
      <div class="label">${t.taken}</div>
    </div>
    <div class="summary-card orange">
      <div class="value">${skippedCount}</div>
      <div class="label">${t.skipped}</div>
    </div>
    <div class="summary-card red">
      <div class="value">${missedCount}</div>
      <div class="label">${t.missed}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">📋 ${t.medicineList} (${activeMedicines.length})</div>
    ${activeMedicines
      .map(
        med => `
      <div class="medicine-card" style="border-left-color: ${med.color || '#4ECDC4'}">
        <div class="medicine-name">${fixTurkishCharacters(med.name)}</div>
        <div class="medicine-details">
          ${med.dosage ? `${t.dosage}: ${fixTurkishCharacters(med.dosage)} | ` : ''}
          ${t.frequency}: ${med.frequency}x ${t.perDay}
          ${med.stockEnabled ? ` | ${t.stock}: ${med.stockCount} ${t.remaining}` : ''}
        </div>
      </div>
    `
      )
      .join('')}
  </div>

  ${
    options.includeDetails && filteredLogs.length > 0
      ? `
  <div class="section">
    <div class="section-title">📅 ${t.dailyLog}</div>
    <table>
      <thead>
        <tr>
          <th>${t.date}</th>
          <th>${t.name}</th>
          <th>${t.time}</th>
          <th>${t.status}</th>
        </tr>
      </thead>
      <tbody>
        ${filteredLogs
          .sort((a, b) => new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime())
          .slice(0, 100)
          .map(logEntry => {
            const medicine = data.medicines.find(m => m.id === logEntry.medicineId);
            const scheduledDate = new Date(logEntry.scheduledTime);
            return `
            <tr>
              <td>${format(scheduledDate, 'dd/MM/yyyy', { locale })}</td>
              <td>${fixTurkishCharacters(medicine?.name || 'Bilinmeyen')}</td>
              <td>${format(scheduledDate, 'HH:mm')}</td>
              <td>
                <span class="status-badge" style="background: ${getStatusColor(logEntry.status)}">
                  ${getStatusText(logEntry.status, options.language)}
                </span>
              </td>
            </tr>
          `;
          })
          .join('')}
      </tbody>
    </table>
  </div>
  `
      : ''
  }

  <div class="footer">
    ${t.generatedAt}: ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale })}
    <br>
    İlaç Hatırlatıcı v1.0.5
  </div>
</body>
</html>
  `;

  return html;
}

export async function generatePDFReport(
  data: ReportData,
  options: ReportOptions
): Promise<string | null> {
  try {
    log.info('PDF raporu oluşturuluyor...', { days: options.days });

    const html = generateHTMLReport(data, options);

    const pdfOptions: {
      html: string;
      fileName: string;
      directory?: string;
      base64: boolean;
      width?: number;
      height?: number;
      paddingTop?: number;
      paddingBottom?: number;
      paddingLeft?: number;
      paddingRight?: number;
    } = {
      html,
      fileName: `ilac-raporu-${format(new Date(), 'yyyy-MM-dd')}`,
      base64: false,
      // A4 boyutu (595 x 842 pt)
      width: 595,
      height: 842,
      // 1.27cm kenar boşlukları (1.27cm ≈ 36pt)
      paddingTop: 36,
      paddingBottom: 36,
      paddingLeft: 36,
      paddingRight: 36,
    };

    // iOS requires Documents directory, Android uses cache by default
    if (Platform.OS === 'ios') {
      pdfOptions.directory = 'Documents';
    }

    const file = await generatePDF(pdfOptions);

    if (file.filePath) {
      log.info('PDF başarıyla oluşturuldu', { path: file.filePath });
      return file.filePath;
    }

    log.error('PDF dosya yolu alınamadı');
    return null;
  } catch (error) {
    log.error('PDF oluşturma hatası', error);
    throw error;
  }
}

export async function sharePDFReport(filePath: string): Promise<void> {
  try {
    await Share.open({
      url: Platform.OS === 'ios' ? filePath : `file://${filePath}`,
      type: 'application/pdf',
      title: 'İlaç Takip Raporu',
    });
    log.info('PDF paylaşıldı');
  } catch (error) {
    // Kullanıcı paylaşımı iptal ettiyse hata fırlatma
    if ((error as Error).message !== 'User did not share') {
      log.error('PDF paylaşım hatası', error);
      throw error;
    }
  }
}

export function prepareReportData(
  medicines: Medicine[],
  logs: MedicineLog[],
  settings: UserSettings,
  adherenceRate: number,
  currentStreak: number,
  days: number
): ReportData {
  const end = endOfDay(new Date());
  const start = startOfDay(subDays(new Date(), days - 1));

  return {
    medicines,
    logs,
    settings,
    adherenceRate,
    currentStreak,
    dateRange: { start, end },
  };
}
