/**
 * Alarm bildirimlerinin METNİ — tek kaynak.
 *
 * v1.8.2'de neden ayrı bir modül oldu:
 *
 * 1. **Emoji.** Alarm başlığı `💊 Parol (500mg)`, gövdesi `📦 Kalan Stok: ...`
 *    ve `⏰ Saat: ...` şeklindeydi. TalkBack bunları okuyor ("hap emojisi
 *    Parol"), bazı OEM bildirim gölgelerinde emoji boş kutuya dönüyor ve
 *    bildirim başlığı zaten dar. Bir ilaç hatırlatmasında okunabilirlik
 *    süslemeden önce gelir. Emoji kaldırıldı.
 *
 * 2. **Başlığı GERİ AYRIŞTIRAN kod vardı.** `index.ts` içindeki arka plan
 *    erteleme işleyicisi ilaç adını şöyle kurtarıyordu:
 *
 *        notification.title?.replace('💊 ', '').replace(/\(Ertelendi.*\)/, '')
 *
 *    Yani başlığın biçimi bildirim ile arka plan işleyicisi arasında yazılı
 *    olmayan bir sözleşmeydi: başlıktaki tek bir değişiklik ertelenen
 *    bildirimde ilaç adını sessizce bozardı (dozu da adın içine katardı —
 *    `replace` yalnızca "(Ertelendi...)" kısmını siliyor, "(500mg)" kalıyordu).
 *    Artık ilaç adı bildirimin `data`sında taşınıyor; ayrıştırma yalnızca
 *    GÜNCELLEME ÖNCESİNDEN kalmış, hâlâ ekranda duran bildirimler için
 *    geriye dönük bir yedek olarak duruyor.
 *
 * 3. Aynı metin üç yerde kuruluyordu (schedule.ts ana alarm, schedule.ts
 *    erteleme, index.ts arka plan erteleme) ve üçü birbirinden sapmıştı.
 */

/** Güncelleme öncesi başlıklarda kullanılan emoji önekleri (geriye dönük). */
const LEGACY_TITLE_PREFIXES = ['💊 ', '🔔 '];

export interface AlarmContentInput {
  medicineName: string;
  dosage?: string | null;
  /** `'Yemekten Sonra • '` gibi, sonunda ayırıcıyla gelir; boş olabilir. */
  instructionLabel?: string;
  /** Bilinmiyorsa `undefined` — "0 adet" yazmaktan farklıdır. */
  stockCount?: number | null;
  /** `'08:30'` gibi yerel saat. */
  timeLabel: string;
}

/** Ana alarm başlığı: `Parol (500mg)` */
export function buildAlarmTitle(medicineName: string, dosage?: string | null): string {
  const name = (medicineName || '').trim() || 'İlaç';
  const dosageStr = dosage ? ` (${dosage})` : '';
  return `${name}${dosageStr}`;
}

/**
 * Erteleme başlığı: `Parol (Ertelendi)` / `Parol (Ertelendi x2)`
 *
 * Doz BİLEREK yok: ertelenen bildirimde önemli olan hangi ilacın beklediği
 * ve kaç kez ertelendiği.
 */
export function buildSnoozeTitle(medicineName: string, snoozeCount: number): string {
  const name = (medicineName || '').trim() || 'İlaç';
  const count = Number.isFinite(snoozeCount) ? Math.max(1, Math.floor(snoozeCount)) : 1;
  const suffix = count > 1 ? ` x${count}` : '';
  return `${name} (Ertelendi${suffix})`;
}

/** Alt başlık: `08:30 • İlaç Vakti` */
export function buildAlarmSubtitle(timeLabel: string): string {
  return `${timeLabel} • İlaç Vakti`;
}

/**
 * Gövde. Klinik dil disiplini (denetim maddesi 22): uygulama EMİR VERMİYOR.
 * Eskiden "almanın zamanı geldi" / "İlacınızı almayı unutmayın!" deniyordu;
 * ikincisi doğrudan bir talimat ve uygulama hangi dozun gerçekten alınması
 * gerektiğini bilmiyor (doktor değiştirmiş olabilir). Artık yalnızca
 * ZAMANI BİLDİRİYOR.
 */
export function buildAlarmBody(input: AlarmContentInput): string {
  const instruction = input.instructionLabel || '';
  const dosage = input.dosage ? `${input.dosage} ` : '';
  const stock =
    typeof input.stockCount === 'number' ? `\nKalan stok: ${input.stockCount} adet` : '';

  return `${instruction}${dosage}dozunun saati: ${input.timeLabel}${stock}`;
}

/**
 * Ertelenen bildirimin gövdesi. Ana gövdenin ilk satırı korunur, yeni saat
 * eklenir.
 */
export function buildSnoozeBody(originalBody: string | undefined, timeLabel: string): string {
  const firstLine = (originalBody || '').split('\n')[0].trim();
  const head = firstLine || 'İlaç hatırlatması';
  return `${head}\nYeni saat: ${timeLabel}`;
}

/**
 * GERİYE DÖNÜK yedek: bildirim `data`sında `medicineName` yoksa başlıktan
 * çıkarmayı dener. Yeni bildirimler adı `data` ile taşıdığı için buraya
 * yalnızca güncelleme sırasında ekranda duran eski bildirimler düşer.
 *
 * Yeni kod bu fonksiyonu ÇAĞIRMAMALI — adı `data.medicineName` üzerinden alın.
 */
export function parseMedicineNameFromLegacyTitle(title: string | undefined | null): string {
  if (!title) return 'İlaç';

  let text = title;
  for (const prefix of LEGACY_TITLE_PREFIXES) {
    if (text.startsWith(prefix)) {
      text = text.slice(prefix.length);
      break;
    }
  }

  // Sondaki parantezli ekleri at: "(Ertelendi x2)", "(500mg)".
  text = text.replace(/\s*\([^()]*\)\s*$/g, '').trim();

  return text || 'İlaç';
}
