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
    dateRange: 'Rapor Dönemi',
    summary: 'Özet',
    adherenceRate: 'Uyum Oranı',
    currentStreak: 'Mevcut Seri',
    days: 'gün',
    totalMedicines: 'Toplam İlaç',
    totalDoses: 'Toplam Doz',
    taken: 'Alındı',
    notTaken: 'Alınmadı',
    skipped: 'Atlandı',
    missed: 'Kaçırıldı',
    medicineList: 'İlaç Detayları',
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
    adherenceByMedicine: 'İlaç Bazlı Uyum',
    calendarView: 'Uyum Takvimi',
    noData: 'Bu dönemde kayıt yok',
  },
  en: {
    title: 'Medicine Tracking Report',
    subtitle: 'Detailed Adherence Report',
    dateRange: 'Report Period',
    summary: 'Summary',
    adherenceRate: 'Adherence Rate',
    currentStreak: 'Current Streak',
    days: 'days',
    totalMedicines: 'Total Medicines',
    totalDoses: 'Total Doses',
    taken: 'Taken',
    notTaken: 'Not Taken',
    skipped: 'Skipped',
    missed: 'Missed',
    medicineList: 'Medicine Details',
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
    adherenceByMedicine: 'Adherence by Medicine',
    calendarView: 'Adherence Calendar',
    noData: 'No records for this period',
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
  const notTakenCount = filteredLogs.filter(
    l => l.status === 'skipped' || l.status === 'missed'
  ).length;
  const totalDoses = takenCount + notTakenCount;

  // Aktif ilaçlar
  const activeMedicines = data.medicines.filter(m => m.isActive);

  // İlaç bazlı uyum hesapla
  const medicineAdherence = activeMedicines.map(med => {
    const medLogs = filteredLogs.filter(l => l.medicineId === med.id);
    const medTaken = medLogs.filter(l => l.status === 'taken').length;
    const medTotal = medLogs.filter(
      l => l.status === 'taken' || l.status === 'skipped' || l.status === 'missed'
    ).length;
    const rate = medTotal > 0 ? Math.round((medTaken / medTotal) * 100) : 0;
    return { medicine: med, taken: medTaken, total: medTotal, rate };
  });

  // Günlük uyum takvimi (heatmap) hesapla
  const dayCount = options.days;
  const calendarDays: { date: Date; dateStr: string; taken: number; total: number }[] = [];
  for (let i = dayCount - 1; i >= 0; i--) {
    const day = subDays(new Date(), i);
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayLogs = filteredLogs.filter(l => l.scheduledTime.startsWith(dayStr));
    const dayTaken = dayLogs.filter(l => l.status === 'taken').length;
    const dayTotal = dayLogs.filter(
      l => l.status === 'taken' || l.status === 'skipped' || l.status === 'missed'
    ).length;
    calendarDays.push({ date: day, dateStr: dayStr, taken: dayTaken, total: dayTotal });
  }

  // SVG Donut Chart — uyum oranı
  const adherencePercent = data.adherenceRate;
  const donutRadius = 54;
  const donutStroke = 12;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const donutFilled = (adherencePercent / 100) * donutCircumference;
  const donutEmpty = donutCircumference - donutFilled;
  const donutColor =
    adherencePercent >= 80 ? '#4CAF50' : adherencePercent >= 50 ? '#FF9800' : '#F44336';

  const donutSVG = `
    <svg width="160" height="160" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r="${donutRadius}" fill="none" stroke="#f0f0f0" stroke-width="${donutStroke}"/>
      <circle cx="70" cy="70" r="${donutRadius}" fill="none" stroke="${donutColor}" stroke-width="${donutStroke}"
        stroke-dasharray="${donutFilled} ${donutEmpty}" stroke-dashoffset="${donutCircumference * 0.25}"
        stroke-linecap="round"/>
      <text x="70" y="65" text-anchor="middle" font-size="28" font-weight="bold" fill="${donutColor}">%${adherencePercent}</text>
      <text x="70" y="85" text-anchor="middle" font-size="11" fill="#888">${t.adherenceRate}</text>
    </svg>`;

  // SVG Bar Chart — ilaç bazlı uyum
  const barHeight = 28;
  const barGap = 14;
  const barMaxWidth = 280;
  const barChartHeight = medicineAdherence.length * (barHeight + barGap) + 10;

  const barsSVG =
    medicineAdherence.length > 0
      ? `<svg width="100%" height="${barChartHeight}" viewBox="0 0 440 ${barChartHeight}">
      ${medicineAdherence
        .map((item, i) => {
          const y = i * (barHeight + barGap) + 5;
          const barW = Math.max((item.rate / 100) * barMaxWidth, 2);
          const barColor = item.rate >= 80 ? '#4CAF50' : item.rate >= 50 ? '#FF9800' : '#F44336';
          const name = fixTurkishCharacters(item.medicine.name);
          const truncName = name.length > 18 ? name.substring(0, 18) + '...' : name;
          return `
          <text x="0" y="${y + barHeight / 2 + 4}" font-size="11" fill="#444">${truncName}</text>
          <rect x="150" y="${y}" width="${barW}" height="${barHeight}" rx="4" fill="${barColor}" opacity="0.85"/>
          <rect x="150" y="${y}" width="${barMaxWidth}" height="${barHeight}" rx="4" fill="none" stroke="#e8e8e8" stroke-width="1"/>
          <text x="${150 + barW + 8}" y="${y + barHeight / 2 + 4}" font-size="11" font-weight="bold" fill="${barColor}">%${item.rate}</text>`;
        })
        .join('')}
    </svg>`
      : '';

  // Heatmap takvim
  const cellSize = dayCount <= 7 ? 32 : dayCount <= 30 ? 18 : 11;
  const cellGap = dayCount <= 7 ? 6 : dayCount <= 30 ? 3 : 2;
  const cols = dayCount <= 7 ? 7 : 7;
  const calendarHTML = calendarDays
    .map((day, i) => {
      let bg = '#f0f0f0'; // veri yok
      if (day.total > 0) {
        const ratio = day.taken / day.total;
        bg = ratio >= 1 ? '#4CAF50' : ratio >= 0.5 ? '#FF9800' : '#F44336';
      }
      const dayLabel = format(day.date, 'd');
      const isNewRow = i % cols === 0;
      return `<div style="display:inline-block;width:${cellSize}px;height:${cellSize}px;background:${bg};border-radius:4px;margin:${cellGap}px;text-align:center;line-height:${cellSize}px;font-size:${cellSize <= 14 ? 7 : 9}px;color:#fff;${isNewRow && i > 0 ? '' : ''}">${dayLabel}</div>`;
    })
    .join('');

  // HTML oluştur
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #333; padding: 28px; background: #fff; }
    .header { text-align: center; padding-bottom: 20px; margin-bottom: 24px; border-bottom: 3px solid #4ECDC4; }
    .header h1 { color: #2C3E50; font-size: 22px; margin-bottom: 4px; letter-spacing: 0.5px; }
    .header h2 { color: #888; font-size: 12px; font-weight: normal; }
    .date-range { text-align: center; color: #666; margin-bottom: 28px; font-size: 12px; background: #f8fafb; padding: 8px 16px; border-radius: 6px; display: inline-block; }
    .date-range-wrap { text-align: center; margin-bottom: 24px; }

    .top-section { text-align: center; margin-bottom: 30px; }
    .summary-row { text-align: center; margin-top: 16px; }
    .summary-item { display: inline-block; text-align: center; margin: 0 16px; vertical-align: top; }
    .summary-value { font-size: 22px; font-weight: bold; }
    .summary-label { font-size: 10px; color: #888; margin-top: 2px; }

    .section { margin-bottom: 28px; }
    .section-title { font-size: 14px; font-weight: 600; color: #2C3E50; border-bottom: 2px solid #f0f0f0; padding-bottom: 8px; margin-bottom: 16px; }

    .medicine-card { background: #f8fafb; border-radius: 8px; padding: 14px 16px; margin-bottom: 10px; border-left: 4px solid #4ECDC4; }
    .medicine-name { font-weight: bold; font-size: 13px; margin-bottom: 4px; color: #2C3E50; }
    .medicine-details { color: #666; font-size: 11px; }

    .calendar-wrap { text-align: center; margin-bottom: 8px; }
    .calendar-legend { text-align: center; margin-top: 8px; font-size: 10px; color: #888; }
    .legend-dot { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin: 0 3px 0 10px; vertical-align: middle; }

    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 8px; }
    th { background: #2C3E50; color: white; padding: 10px 8px; text-align: left; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
    td { padding: 9px 8px; border-bottom: 1px solid #f0f0f0; }
    tr:nth-child(even) { background: #fafbfc; }
    .status-taken { color: #4CAF50; font-weight: 600; }
    .status-not-taken { color: #F44336; font-weight: 600; }

    .footer { margin-top: 32px; padding-top: 16px; border-top: 2px solid #f0f0f0; text-align: center; color: #aaa; font-size: 9px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${t.title}</h1>
    <h2>${t.subtitle}</h2>
  </div>

  <div class="date-range-wrap">
    <div class="date-range">${t.dateRange}: ${startDate} — ${endDate}</div>
  </div>

  <div class="top-section">
    ${donutSVG}
    <div class="summary-row">
      <div class="summary-item">
        <div class="summary-value" style="color:#4ECDC4">${data.currentStreak}</div>
        <div class="summary-label">${t.currentStreak} (${t.days})</div>
      </div>
      <div class="summary-item">
        <div class="summary-value" style="color:#4CAF50">${takenCount}</div>
        <div class="summary-label">${t.taken}</div>
      </div>
      <div class="summary-item">
        <div class="summary-value" style="color:#F44336">${notTakenCount}</div>
        <div class="summary-label">${t.notTaken}</div>
      </div>
      <div class="summary-item">
        <div class="summary-value" style="color:#2C3E50">${totalDoses}</div>
        <div class="summary-label">${t.totalDoses}</div>
      </div>
    </div>
  </div>

  ${
    medicineAdherence.length > 0
      ? `
  <div class="section">
    <div class="section-title">${t.adherenceByMedicine}</div>
    ${barsSVG}
  </div>`
      : ''
  }

  <div class="section">
    <div class="section-title">${t.calendarView}</div>
    <div class="calendar-wrap">${calendarHTML}</div>
    <div class="calendar-legend">
      <span class="legend-dot" style="background:#4CAF50"></span> ${t.taken}
      <span class="legend-dot" style="background:#FF9800"></span> ${options.language === 'tr' ? 'Kısmi' : 'Partial'}
      <span class="legend-dot" style="background:#F44336"></span> ${t.notTaken}
      <span class="legend-dot" style="background:#f0f0f0"></span> ${options.language === 'tr' ? 'Veri yok' : 'No data'}
    </div>
  </div>

  <div class="section">
    <div class="section-title">${t.medicineList} (${activeMedicines.length})</div>
    ${activeMedicines
      .map(
        med => `
      <div class="medicine-card" style="border-left-color: ${med.color || '#4ECDC4'}">
        <div class="medicine-name">${fixTurkishCharacters(med.name)}</div>
        <div class="medicine-details">
          ${med.dosage ? `${t.dosage}: ${fixTurkishCharacters(med.dosage)} · ` : ''}${t.frequency}: ${med.frequency}x ${t.perDay}${med.stockEnabled ? ` · ${t.stock}: ${med.stockCount} ${t.remaining}` : ''}
        </div>
      </div>`
      )
      .join('')}
  </div>

  ${
    options.includeDetails && filteredLogs.length > 0
      ? `
  <div class="section">
    <div class="section-title">${t.dailyLog}</div>
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
            const isTaken = logEntry.status === 'taken';
            return `
            <tr>
              <td>${format(scheduledDate, 'dd/MM/yyyy', { locale })}</td>
              <td>${fixTurkishCharacters(medicine?.name || '-')}</td>
              <td>${format(scheduledDate, 'HH:mm')}</td>
              <td class="${isTaken ? 'status-taken' : 'status-not-taken'}">
                ${isTaken ? '✓ ' + t.taken : '✗ ' + t.notTaken}
              </td>
            </tr>`;
          })
          .join('')}
      </tbody>
    </table>
  </div>`
      : ''
  }

  <div class="footer">
    ${t.generatedAt}: ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale })} · İlaç Hatırlatıcı v1.1.0
  </div>
</body>
</html>`;

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
