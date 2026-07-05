import { generatePDF } from 'react-native-html-to-pdf';
import { Medicine, MedicineLog, UserSettings } from '../types';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { createScopedLogger } from '../utils/logger';
// Sprint 9.4: Pure helper'lar ./pdfReportHelpers.ts'e tasindi.
// I/O bagimliligi olmadan test edilebilir.
import { fixTurkishCharacters, escapeHtml, escapeSvgText } from './pdfReportHelpers';
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

  // Donut chart — renkli + siyah beyazda yüzde yazısı ile okunur
  const pct = data.adherenceRate;
  const dR = 38;
  const dSW = 10;
  const dC = 2 * Math.PI * dR;
  const dFill = (pct / 100) * dC;
  const dGap = dC - dFill;
  const dColor = pct >= 80 ? '#2E7D32' : pct >= 50 ? '#E65100' : '#C62828';

  const donutSVG = `<svg width="96" height="96" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="${dR}" fill="none" stroke="#e0e0e0" stroke-width="${dSW}"/>
    <circle cx="50" cy="50" r="${dR}" fill="none" stroke="${dColor}" stroke-width="${dSW}"
      stroke-dasharray="${dFill} ${dGap}" stroke-dashoffset="${dC * 0.25}" stroke-linecap="round"/>
    <text x="50" y="48" text-anchor="middle" font-size="22" font-weight="bold" fill="#111">%${pct}</text>
    <text x="50" y="63" text-anchor="middle" font-size="8" fill="#555">${escapeSvgText(t.adherenceRate)}</text>
  </svg>`;

  // Bar chart — renkli dolgu + yüzde yazısı (siyah beyazda yazı yeterli)
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
        const bColor = item.rate >= 80 ? '#2E7D32' : item.rate >= 50 ? '#E65100' : '#C62828';
        return `<text x="0" y="${y + barH / 2 + 4}" font-size="10" fill="#222">${escapeSvgText(tName)}</text>
      <rect x="145" y="${y}" width="${barMax}" height="${barH}" rx="2" fill="#f0f0f0" stroke="#ccc" stroke-width="0.5"/>
      <rect x="145" y="${y}" width="${w}" height="${barH}" rx="2" fill="${bColor}"/>
      <text x="${145 + barMax + 6}" y="${y + barH / 2 + 4}" font-size="10" font-weight="bold" fill="#111">%${item.rate}</text>`;
      })
      .join('')}
  </svg>`
      : '';

  // Takvim — renkli + sembol (dual encoding: renk gitse sembol kalır)
  const cellSz = dayCount <= 7 ? 28 : dayCount <= 30 ? 16 : 11;
  const cellGp = dayCount <= 7 ? 3 : dayCount <= 30 ? 2 : 1;
  const calendarHTML = calendarDays
    .map(day => {
      const dayLabel = format(day.date, 'd');
      let bg = '#f5f5f5';
      let border = '1px solid #ddd';
      let color = '#aaa';
      let symbol = dayCount <= 7 ? dayLabel : '';
      if (day.total > 0) {
        const ratio = day.taken / day.total;
        if (ratio >= 1) {
          bg = '#2E7D32';
          color = '#fff';
          symbol = dayCount <= 7 ? dayLabel : '✓';
          border = '1px solid #2E7D32';
        } else if (ratio >= 0.5) {
          bg = '#FFF3E0';
          color = '#E65100';
          symbol = dayCount <= 7 ? dayLabel : '~';
          border = '2px solid #E65100';
        } else {
          bg = '#FFEBEE';
          color = '#C62828';
          symbol = dayCount <= 7 ? dayLabel : '✗';
          border = '1px solid #C62828';
        }
      }
      const fs = cellSz <= 12 ? 6 : cellSz <= 18 ? 7 : 9;
      return `<div style="display:inline-block;width:${cellSz}px;height:${cellSz}px;background:${bg};border:${border};border-radius:3px;margin:${cellGp}px;text-align:center;line-height:${cellSz - 2}px;font-size:${fs}px;color:${color};font-weight:bold">${symbol}</div>`;
    })
    .join('');

  // İlaç kartları
  const medicineCards = activeMedicines
    .map(med => {
      const dosage = med.dosage ? fixTurkishCharacters(med.dosage) : '';
      const freq = `${med.frequency}x ${t.perDay}`;
      const stock = med.stockEnabled ? ` · ${t.stock}: ${med.stockCount} ${t.remaining}` : '';
      return `<div class="med-card">
      <div class="med-name">${escapeHtml(fixTurkishCharacters(med.name))}</div>
      <div class="med-info">${escapeHtml(dosage ? dosage + ' · ' : '')}${escapeHtml(freq)}${escapeHtml(stock)}</div>
    </div>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size:11px; color:#222; padding:14px 18px; background:#fff; }

.header { border-bottom:2.5px solid #2E7D32; padding-bottom:8px; margin-bottom:10px; }
.header h1 { font-size:17px; color:#1a1a1a; font-weight:700; }
.header-row { display:inline-block; width:100%; }
.header-left { display:inline-block; vertical-align:top; }
.header-right { display:inline-block; float:right; text-align:right; font-size:10px; color:#555; line-height:1.5; }

.summary-box { border:1.5px solid #ddd; border-radius:6px; padding:10px 14px; margin-bottom:12px; background:#fafafa; }
.summary-inner { display:inline-block; width:100%; }
.donut-area { display:inline-block; width:100px; vertical-align:middle; }
.stats-area { display:inline-block; vertical-align:middle; margin-left:20px; }
.stats-grid { display:inline-block; }
.sg-item { display:inline-block; text-align:center; margin:0 12px; vertical-align:top; }
.sg-val { font-size:20px; font-weight:bold; }
.sg-lbl { font-size:8px; color:#666; text-transform:uppercase; letter-spacing:0.4px; margin-top:1px; }

.section { margin-bottom:12px; }
.sec-title { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.6px; color:#333; border-bottom:1.5px solid #e0e0e0; padding-bottom:3px; margin-bottom:6px; }

.med-card { border-left:3px solid #2E7D32; background:#f8faf8; padding:6px 10px; margin-bottom:5px; border-radius:0 4px 4px 0; }
.med-name { font-weight:700; font-size:11px; color:#1a1a1a; }
.med-info { font-size:9px; color:#555; margin-top:1px; }

table { width:100%; border-collapse:collapse; font-size:10px; }
th { border-bottom:2px solid #333; padding:4px 6px; text-align:left; font-weight:700; font-size:9px; text-transform:uppercase; letter-spacing:0.4px; color:#333; }
td { padding:4px 6px; border-bottom:1px solid #e8e8e8; }
tr:nth-child(even) td { background:#fafafa; }

.cal-wrap { text-align:center; margin-bottom:3px; }
.cal-legend { text-align:center; font-size:8px; color:#555; margin-top:4px; }
.leg-item { display:inline-block; margin:0 6px; }
.leg-box { display:inline-block; width:10px; height:10px; border-radius:2px; margin-right:3px; vertical-align:middle; }

.status-taken { color:#2E7D32; font-weight:700; }
.status-not { color:#C62828; font-weight:700; }

.footer { margin-top:14px; padding-top:6px; border-top:1px solid #ddd; text-align:center; color:#999; font-size:7px; }
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
        <div class="sg-item"><div class="sg-val" style="color:#1565C0">${data.currentStreak}</div><div class="sg-lbl">${t.currentStreak}<br/>(${t.days})</div></div>
        <div class="sg-item"><div class="sg-val" style="color:#2E7D32">${takenCount}</div><div class="sg-lbl">${t.taken}</div></div>
        <div class="sg-item"><div class="sg-val" style="color:#C62828">${notTakenCount}</div><div class="sg-lbl">${t.notTaken}</div></div>
        <div class="sg-item"><div class="sg-val" style="color:#333">${totalDoses}</div><div class="sg-lbl">${t.totalDoses}</div></div>
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
    <span class="leg-item"><span class="leg-box" style="background:#2E7D32"></span>✓ ${t.taken}</span>
    <span class="leg-item"><span class="leg-box" style="background:#FFF3E0;border:1.5px solid #E65100"></span>~ ${options.language === 'tr' ? 'Kısmi' : 'Partial'}</span>
    <span class="leg-item"><span class="leg-box" style="background:#FFEBEE;border:1px solid #C62828"></span>✗ ${t.notTaken}</span>
    <span class="leg-item"><span class="leg-box" style="background:#f5f5f5;border:1px solid #ddd"></span>${options.language === 'tr' ? 'Veri yok' : 'No data'}</span>
  </div>
</div>

<div class="section">
  <div class="sec-title">${t.medicineList} (${activeMedicines.length})</div>
  ${medicineCards}
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
          <td>${escapeHtml(format(scheduledDate, 'dd/MM', { locale }))}</td>
          <td>${escapeHtml(fixTurkishCharacters(medicine?.name || '-'))}</td>
          <td>${escapeHtml(format(scheduledDate, 'HH:mm'))}</td>
          <td class="${isTaken ? 'status-taken' : 'status-not'}">${isTaken ? '✓ ' + escapeHtml(t.taken) : '✗ ' + escapeHtml(t.notTaken)}</td>
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
