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
  const activeMedicines = data.medicines.filter(m => m.isActive);

  // İlaç bazlı uyum
  const medicineAdherence = activeMedicines.map(med => {
    const medLogs = filteredLogs.filter(l => l.medicineId === med.id);
    const medTaken = medLogs.filter(l => l.status === 'taken').length;
    const medTotal = medLogs.filter(
      l => l.status === 'taken' || l.status === 'skipped' || l.status === 'missed'
    ).length;
    const rate = medTotal > 0 ? Math.round((medTaken / medTotal) * 100) : 0;
    return { medicine: med, taken: medTaken, total: medTotal, rate };
  });

  // Günlük uyum takvimi
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

  // Donut chart — siyah beyaz uyumlu (koyu dolgu + kalın yazı)
  const adherencePercent = data.adherenceRate;
  const donutR = 38;
  const donutSW = 10;
  const donutC = 2 * Math.PI * donutR;
  const donutFill = (adherencePercent / 100) * donutC;
  const donutGap = donutC - donutFill;

  const donutSVG = `<svg width="96" height="96" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="${donutR}" fill="none" stroke="#ddd" stroke-width="${donutSW}"/>
    <circle cx="50" cy="50" r="${donutR}" fill="none" stroke="#222" stroke-width="${donutSW}"
      stroke-dasharray="${donutFill} ${donutGap}" stroke-dashoffset="${donutC * 0.25}" stroke-linecap="round"/>
    <text x="50" y="48" text-anchor="middle" font-size="22" font-weight="bold" fill="#111">%${adherencePercent}</text>
    <text x="50" y="63" text-anchor="middle" font-size="8" fill="#666">${t.adherenceRate}</text>
  </svg>`;

  // Bar chart — siyah beyaz uyumlu (koyu dolgu + açık border)
  const barH = 18;
  const barGap = 6;
  const barMax = 240;
  const barChartH = medicineAdherence.length * (barH + barGap) + 4;

  const barsSVG =
    medicineAdherence.length > 0
      ? `<svg width="100%" height="${barChartH}" viewBox="0 0 420 ${barChartH}">
    ${medicineAdherence
      .map((item, i) => {
        const y = i * (barH + barGap) + 2;
        const w = Math.max((item.rate / 100) * barMax, 2);
        const name = fixTurkishCharacters(item.medicine.name);
        const tName = name.length > 20 ? name.substring(0, 20) + '…' : name;
        // Siyah beyazda: dolgu koyu gri, border siyah → her zaman görünür
        return `<text x="0" y="${y + barH / 2 + 4}" font-size="10" fill="#222" font-family="monospace">${tName}</text>
      <rect x="145" y="${y}" width="${barMax}" height="${barH}" rx="2" fill="#f5f5f5" stroke="#bbb" stroke-width="0.5"/>
      <rect x="145" y="${y}" width="${w}" height="${barH}" rx="2" fill="#333"/>
      <text x="${145 + barMax + 6}" y="${y + barH / 2 + 4}" font-size="10" font-weight="bold" fill="#111">%${item.rate}</text>`;
      })
      .join('')}
  </svg>`
      : '';

  // Takvim — siyah beyaz uyumlu (border + sembol)
  const cellSz = dayCount <= 7 ? 28 : dayCount <= 30 ? 16 : 11;
  const cellGp = dayCount <= 7 ? 3 : dayCount <= 30 ? 2 : 1;
  const calendarHTML = calendarDays
    .map(day => {
      const dayLabel = format(day.date, 'd');
      let bg = '#fff';
      let border = '1px solid #ddd';
      let color = '#999';
      let symbol = '';
      if (day.total > 0) {
        const ratio = day.taken / day.total;
        if (ratio >= 1) {
          bg = '#222';
          color = '#fff';
          symbol = '✓';
          border = '1px solid #222';
        } else if (ratio >= 0.5) {
          bg = '#fff';
          color = '#222';
          symbol = '~';
          border = '2px solid #222';
        } else {
          bg = '#fff';
          color = '#222';
          symbol = '✗';
          border = '1px solid #222';
        }
      }
      const fs = cellSz <= 12 ? 6 : cellSz <= 18 ? 7 : 9;
      return `<div style="display:inline-block;width:${cellSz}px;height:${cellSz}px;background:${bg};border:${border};border-radius:3px;margin:${cellGp}px;text-align:center;line-height:${cellSz - 2}px;font-size:${fs}px;color:${color};font-weight:bold">${dayCount <= 7 ? dayLabel : symbol || dayLabel}</div>`;
    })
    .join('');

  // İlaç detay tablosu — kompakt satır
  const medicineRows = activeMedicines
    .map(med => {
      const dosage = med.dosage ? fixTurkishCharacters(med.dosage) : '-';
      const freq = `${med.frequency}x/${t.days}`;
      const stock = med.stockEnabled ? `${med.stockCount}` : '-';
      return `<tr>
      <td style="font-weight:600">${fixTurkishCharacters(med.name)}</td>
      <td>${dosage}</td>
      <td>${freq}</td>
      <td>${stock}</td>
    </tr>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: Georgia, 'Times New Roman', serif; font-size:11px; color:#111; padding:14px 18px; background:#fff; }

.header { border-bottom:2px solid #111; padding-bottom:8px; margin-bottom:10px; }
.header h1 { font-size:17px; color:#111; letter-spacing:0.3px; }
.header-row { display:inline-block; width:100%; }
.header-left { display:inline-block; vertical-align:top; }
.header-right { display:inline-block; float:right; text-align:right; font-size:10px; color:#444; line-height:1.6; }

.summary-box { border:1.5px solid #111; padding:10px 14px; margin-bottom:12px; }
.summary-inner { display:inline-block; width:100%; }
.donut-area { display:inline-block; width:100px; vertical-align:middle; }
.stats-area { display:inline-block; vertical-align:middle; margin-left:20px; }
.stats-grid { display:inline-block; }
.sg-item { display:inline-block; text-align:center; margin:0 14px; vertical-align:top; }
.sg-val { font-size:20px; font-weight:bold; color:#111; }
.sg-lbl { font-size:8px; color:#555; text-transform:uppercase; letter-spacing:0.5px; margin-top:1px; }

.section { margin-bottom:12px; }
.sec-title { font-size:11px; font-weight:bold; text-transform:uppercase; letter-spacing:0.8px; color:#111; border-bottom:1px solid #999; padding-bottom:3px; margin-bottom:6px; }

table { width:100%; border-collapse:collapse; font-size:10px; }
th { border-bottom:2px solid #111; padding:4px 6px; text-align:left; font-weight:bold; font-size:9px; text-transform:uppercase; letter-spacing:0.5px; }
td { padding:4px 6px; border-bottom:1px solid #ddd; }

.cal-wrap { text-align:center; margin-bottom:3px; }
.cal-legend { text-align:center; font-size:8px; color:#555; margin-top:3px; }
.leg-box { display:inline-block; width:10px; height:10px; border-radius:2px; margin:0 2px 0 8px; vertical-align:middle; }

.log-taken { font-weight:bold; }
.log-not { font-weight:bold; }

.footer { margin-top:14px; padding-top:6px; border-top:1px solid #999; text-align:center; color:#888; font-size:7px; }
</style>
</head>
<body>

<div class="header">
  <div class="header-row">
    <div class="header-left"><h1>${t.title}</h1></div>
    <div class="header-right">${t.dateRange}<br/><strong>${startDate} — ${endDate}</strong></div>
  </div>
</div>

<div class="summary-box">
  <div class="summary-inner">
    <div class="donut-area">${donutSVG}</div>
    <div class="stats-area">
      <div class="stats-grid">
        <div class="sg-item"><div class="sg-val">${data.currentStreak}</div><div class="sg-lbl">${t.currentStreak}<br/>(${t.days})</div></div>
        <div class="sg-item"><div class="sg-val">${takenCount}</div><div class="sg-lbl">${t.taken}</div></div>
        <div class="sg-item"><div class="sg-val">${notTakenCount}</div><div class="sg-lbl">${t.notTaken}</div></div>
        <div class="sg-item"><div class="sg-val">${totalDoses}</div><div class="sg-lbl">${t.totalDoses}</div></div>
      </div>
    </div>
  </div>
</div>

${
  medicineAdherence.length > 0
    ? `<div class="section">
  <div class="sec-title">${t.adherenceByMedicine}</div>
  ${barsSVG}
</div>`
    : ''
}

<div class="section">
  <div class="sec-title">${t.calendarView}</div>
  <div class="cal-wrap">${calendarHTML}</div>
  <div class="cal-legend">
    <span class="leg-box" style="background:#222"></span> ${t.taken}
    <span class="leg-box" style="background:#fff;border:2px solid #222"></span> ${options.language === 'tr' ? 'Kısmi' : 'Partial'}
    <span class="leg-box" style="background:#fff;border:1px solid #222"></span> ${t.notTaken}
    <span class="leg-box" style="background:#fff;border:1px solid #ddd"></span> ${options.language === 'tr' ? 'Veri yok' : 'No data'}
  </div>
</div>

<div class="section">
  <div class="sec-title">${t.medicineList} (${activeMedicines.length})</div>
  <table>
    <thead><tr><th>${t.name}</th><th>${t.dosage}</th><th>${t.frequency}</th><th>${t.stock}</th></tr></thead>
    <tbody>${medicineRows}</tbody>
  </table>
</div>

${
  options.includeDetails && filteredLogs.length > 0
    ? `<div class="section">
  <div class="sec-title">${t.dailyLog}</div>
  <table>
    <thead><tr><th>${t.date}</th><th>${t.name}</th><th>${t.time}</th><th>${t.status}</th></tr></thead>
    <tbody>
    ${filteredLogs
      .sort((a, b) => new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime())
      .slice(0, 100)
      .map(logEntry => {
        const medicine = data.medicines.find(m => m.id === logEntry.medicineId);
        const scheduledDate = new Date(logEntry.scheduledTime);
        const isTaken = logEntry.status === 'taken';
        return `<tr>
          <td>${format(scheduledDate, 'dd/MM', { locale })}</td>
          <td>${fixTurkishCharacters(medicine?.name || '-')}</td>
          <td>${format(scheduledDate, 'HH:mm')}</td>
          <td class="${isTaken ? 'log-taken' : 'log-not'}">${isTaken ? '✓ ' + t.taken : '✗ ' + t.notTaken}</td>
        </tr>`;
      })
      .join('')}
    </tbody>
  </table>
</div>`
    : ''
}

<div class="footer">${t.generatedAt}: ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale })} · İlaç Hatırlatıcı</div>

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
