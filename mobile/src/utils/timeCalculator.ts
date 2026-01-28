import { MedicineInstruction, ReminderTime } from '../types';
import { format, parse, addMinutes, differenceInMinutes } from 'date-fns';

interface TimeCalculatorOptions {
  wakeUpTime: string; // "HH:mm"
  sleepTime: string;  // "HH:mm"
  frequency: number;  // Günde kaç kez
  instruction?: MedicineInstruction;
}

/**
 * İlaç kullanım saatlerini otomatik hesaplar
 * Uyanık olunan süreyi eşit aralıklara böler
 */
export function calculateMedicineTimes(
  medicineId: string,
  options: TimeCalculatorOptions
): Omit<ReminderTime, 'notificationId'>[] {
  const { wakeUpTime, sleepTime, frequency, instruction } = options;
  
  // Saat stringlerini Date objesine çevir (bugünün tarihi ile)
  const today = new Date();
  const baseDate = format(today, 'yyyy-MM-dd');
  
  const wakeUp = parse(`${baseDate} ${wakeUpTime}`, 'yyyy-MM-dd HH:mm', new Date());
  let sleep = parse(`${baseDate} ${sleepTime}`, 'yyyy-MM-dd HH:mm', new Date());
  
  // Eğer yatma saati uyanma saatinden küçükse, ertesi gün demektir
  if (sleep <= wakeUp) {
    sleep = addMinutes(sleep, 24 * 60);
  }
  
  // Uyanık kalınan toplam dakika
  const totalAwakeMinutes = differenceInMinutes(sleep, wakeUp);
  
  // Özel durumları kontrol et
  const times: Omit<ReminderTime, 'notificationId'>[] = [];
  
  if (frequency === 1) {
    // Günde 1 kez - talimata göre belirle
    const time = getSingleDoseTime(wakeUpTime, sleepTime, instruction);
    times.push({
      id: `${medicineId}_0`,
      medicineId,
      time,
      isEnabled: true,
    });
  } else {
    // Birden fazla doz - eşit aralıklara böl
    const intervalMinutes = Math.floor(totalAwakeMinutes / frequency);
    
    // İlk dozu biraz gecikmeli başlat (uyanır uyanmaz değil)
    const firstDoseOffset = instruction === 'empty_stomach' ? 0 : 30;
    
    for (let i = 0; i < frequency; i++) {
      const minutesFromWakeUp = firstDoseOffset + (i * intervalMinutes);
      const doseTime = addMinutes(wakeUp, minutesFromWakeUp);
      
      // Son dozun yatma saatinden en az 30 dk önce olmasını sağla
      const sleepBuffer = 30;
      const maxTime = addMinutes(sleep, -sleepBuffer);
      
      const finalTime = doseTime > maxTime ? maxTime : doseTime;
      
      times.push({
        id: `${medicineId}_${i}`,
        medicineId,
        time: format(finalTime, 'HH:mm'),
        isEnabled: true,
      });
    }
  }
  
  // Zamanları sırala
  times.sort((a, b) => a.time.localeCompare(b.time));
  
  return times;
}

/**
 * Günde tek doz için optimal zamanı belirler
 */
function getSingleDoseTime(
  wakeUpTime: string,
  sleepTime: string,
  instruction?: MedicineInstruction
): string {
  const today = new Date();
  const baseDate = format(today, 'yyyy-MM-dd');
  const wakeUp = parse(`${baseDate} ${wakeUpTime}`, 'yyyy-MM-dd HH:mm', new Date());
  const sleep = parse(`${baseDate} ${sleepTime}`, 'yyyy-MM-dd HH:mm', new Date());
  
  switch (instruction) {
    case 'empty_stomach':
      // Sabah kalkar kalkmaz
      return wakeUpTime;
    
    case 'before_meal':
      // Kahvaltıdan 30 dk önce (uyanmadan 30 dk sonra varsayılan kahvaltı)
      return format(addMinutes(wakeUp, 30), 'HH:mm');
    
    case 'after_meal':
      // Kahvaltıdan sonra
      return format(addMinutes(wakeUp, 90), 'HH:mm');
    
    case 'with_meal':
      // Kahvaltı saati
      return format(addMinutes(wakeUp, 60), 'HH:mm');
    
    case 'before_sleep':
      // Yatmadan 30 dk önce
      return format(addMinutes(sleep, -30), 'HH:mm');
    
    case 'any_time':
    default: {
      // Günün ortası
      const midpoint = differenceInMinutes(sleep, wakeUp) / 2;
      return format(addMinutes(wakeUp, midpoint), 'HH:mm');
    }
  }
}

/**
 * Saati okunabilir formata çevirir (24 saat formatı)
 */
export function formatTimeDisplay(time: string): string {
  // Zaten HH:mm formatında, direkt döndür
  return time;
}

/**
 * Bir sonraki hatırlatma zamanını bulur
 */
export function getNextReminderTime(times: ReminderTime[]): ReminderTime | null {
  const now = new Date();
  const currentTime = format(now, 'HH:mm');
  
  // Bugün için henüz geçmemiş en yakın zamanı bul
  const upcomingToday = times
    .filter(t => t.isEnabled && t.time > currentTime)
    .sort((a, b) => a.time.localeCompare(b.time));
  
  if (upcomingToday.length > 0) {
    return upcomingToday[0];
  }
  
  // Bugün kalan yoksa yarın için ilk zamanı döndür
  const enabledTimes = times
    .filter(t => t.isEnabled)
    .sort((a, b) => a.time.localeCompare(b.time));
  
  return enabledTimes.length > 0 ? enabledTimes[0] : null;
}

/**
 * Talimat metnini dile göre çevirir
 */
export function getInstructionText(instruction?: MedicineInstruction, language: string = 'tr'): string {
  const translationsTr: Record<MedicineInstruction, string> = {
    before_meal: 'Yemekten önce',
    after_meal: 'Yemekten sonra',
    with_meal: 'Yemekle birlikte',
    empty_stomach: 'Aç karnına',
    before_sleep: 'Yatmadan önce',
    any_time: 'Herhangi bir zaman',
  };
  
  const translationsEn: Record<MedicineInstruction, string> = {
    before_meal: 'Before meal',
    after_meal: 'After meal',
    with_meal: 'With meal',
    empty_stomach: 'Empty stomach',
    before_sleep: 'Before sleep',
    any_time: 'Any time',
  };
  
  const translations = language === 'tr' ? translationsTr : translationsEn;
  const notSpecified = language === 'tr' ? 'Belirtilmemiş' : 'Not specified';
  
  return instruction ? translations[instruction] : notSpecified;
}
