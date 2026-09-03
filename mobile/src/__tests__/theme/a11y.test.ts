/* global __dirname */
/**
 * Erişilebilirlik tabanı — yardımcılar + ALARM/DOZ yolu için kaynak kapısı.
 *
 * İkinci describe bloğu alışılmadık: kaynak dosyaları okuyup `fontSize`
 * literallerini sayıyor. Gerekçesi, kod tabanının ölçülmüş hâli:
 * 398 dosyada 14 puntodan küçük **415** `fontSize` var ve 1001 ham `<Text>`
 * karşısında yalnızca 2 `<ThemedText>` — yani ortak bir metin bileşeni
 * üzerinden davranışsal test yazmanın zemini yok. Kapıyı kaynak seviyesinde
 * kurmak, hiç kurmamaktan iyi.
 *
 * Kapı BİLEREK yalnızca alarm/doz yolunu kapsıyor; kalan ~376 nokta görsel
 * doğrulama gerektiren ölçülmüş bir birikim (bkz. arşiv v1.8.3).
 */

import fs from 'fs';
import path from 'path';

import {
  MIN_FONT_SIZE,
  MIN_TOUCH_TARGET,
  TARGET_BODY_FONT_SIZE,
  TARGET_TOUCH_TARGET,
  clampFontSize,
  touchTargetHitSlop,
  meetsTouchTarget,
} from '../../theme/a11y';

describe('a11y sabitleri', () => {
  it('taban ve hedef degerler tutarli', () => {
    expect(MIN_FONT_SIZE).toBeLessThanOrEqual(TARGET_BODY_FONT_SIZE);
    expect(MIN_TOUCH_TARGET).toBeLessThanOrEqual(TARGET_TOUCH_TARGET);
    // WCAG 2.1 AA (2.5.5) 44px; Android kilavuzu 48dp.
    expect(MIN_TOUCH_TARGET).toBeGreaterThanOrEqual(44);
  });
});

describe('clampFontSize', () => {
  it('tabanin altini tabana cikarir', () => {
    expect(clampFontSize(9)).toBe(14);
    expect(clampFontSize(13)).toBe(14);
  });

  it('kesirli degerleri de dogru islar', () => {
    expect(clampFontSize(13.5)).toBe(14);
    expect(clampFontSize(11.5)).toBe(14);
    expect(clampFontSize(14.5)).toBe(14.5);
  });

  it('tabanin ustune DOKUNMAZ', () => {
    expect(clampFontSize(16)).toBe(16);
    expect(clampFontSize(32)).toBe(32);
  });

  it('NaN gelirse taban doner', () => {
    // fontSize: NaN React Native'de metni GORUNMEZ yapar; bu yuzden
    // sessizce gecirmek yerine tabana dusuruyoruz.
    expect(clampFontSize(NaN)).toBe(14);
    expect(clampFontSize(Infinity)).toBe(14);
  });

  it('ozel taban verilebilir', () => {
    expect(clampFontSize(14, 18)).toBe(18);
  });
});

describe('touchTargetHitSlop', () => {
  it('kutu yeterliyse hicbir tarafa tasma vermez', () => {
    expect(touchTargetHitSlop(44)).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
    expect(touchTargetHitSlop(64)).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
  });

  it('eksigi iki kenara bolerek dagitir', () => {
    // 32dp kutu -> her kenara 6dp -> etkin 44dp
    expect(touchTargetHitSlop(32)).toEqual({ top: 6, bottom: 6, left: 6, right: 6 });
  });

  it('tek sayili eksikte hedefin ALTINDA kalmaz', () => {
    // 35dp kutu, eksik 9dp; 4.5 yerine 5 verilir -> etkin 45dp
    const slop = touchTargetHitSlop(35);

    expect(slop.top).toBe(5);
    expect(35 + slop.top + slop.bottom).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
  });

  it('bozuk olcude guvenli bir tasma dondurur', () => {
    expect(touchTargetHitSlop(0).top).toBe(22);
    expect(touchTargetHitSlop(NaN).top).toBe(22);
  });

  it('hedef degistirilebilir', () => {
    expect(touchTargetHitSlop(24, 48)).toEqual({ top: 12, bottom: 12, left: 12, right: 12 });
  });
});

describe('meetsTouchTarget', () => {
  it('tabana gore karar verir', () => {
    expect(meetsTouchTarget(44)).toBe(true);
    expect(meetsTouchTarget(43)).toBe(false);
    expect(meetsTouchTarget(NaN)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// KAYNAK KAPISI — alarm/doz yolunda 14 puntodan kucuk yazi olmayacak.
// ---------------------------------------------------------------------------

const SRC_ROOT = path.join(__dirname, '..', '..');

/**
 * Alarm ve doz yolu: kullanicinin bir dozu alip almadigina karar verdigi
 * ekranlar. Bu listeye ekleme yapmak serbest, cikarma yapmak gerileme.
 */
const CRITICAL_PATHS = [
  'screens/AlarmScreen',
  'components/PatientFullScreenReminderModal.tsx',
  'components/common/SkipReasonModal.tsx',
  'components/common/MissedDoseTriageModal.tsx',
  'components/common/CustomAlert.tsx',
  'components/layouts/HomeScreenLayoutA.tsx',
  'screens/HomeScreen',
  // DIKKAT: 'screens/HomeScreen' YALNIZCA klasoru kapsiyor; ekranin kendisi
  // ayri bir dosya ve ilk gecisimde bu yuzden ATLANMISTI (8 kucuk yazi
  // taniyanamadi, yalnizca ESLint yakaladi). Klasor + dosya ikilisi olan
  // her yol icin ikisini de yazmak gerekiyor.
  'screens/HomeScreen.tsx',
];

function collectFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') continue;
      out.push(...collectFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function criticalFiles(): string[] {
  const files: string[] = [];
  for (const rel of CRITICAL_PATHS) {
    const full = path.join(SRC_ROOT, rel);
    if (!fs.existsSync(full)) continue;
    if (fs.statSync(full).isDirectory()) files.push(...collectFiles(full));
    else files.push(full);
  }
  return files;
}

describe('alarm/doz yolu yazi boyutu kapisi', () => {
  it('kritik yolda dosya buluyor (kapinin bos calismadiginin kaniti)', () => {
    // Bu iddia olmadan, yol adlari bir gun degisirse kapi SESSIZCE
    // hicbir dosyayi taramaz ve her zaman yesil kalir.
    expect(criticalFiles().length).toBeGreaterThan(10);
  });

  it(`hicbir yerde fontSize < ${MIN_FONT_SIZE} yok`, () => {
    const offenders: string[] = [];

    for (const file of criticalFiles()) {
      const rel = path.relative(SRC_ROOT, file).replace(/\\/g, '/');
      fs.readFileSync(file, 'utf8')
        .split(/\r?\n/)
        .forEach((line, index) => {
          const match = /fontSize:\s*(\d+(?:\.\d+)?)/.exec(line);
          if (match && Number(match[1]) < MIN_FONT_SIZE) {
            offenders.push(`${rel}:${index + 1} -> ${match[1]}pt`);
          }
        });
    }

    expect(offenders).toEqual([]);
  });
});
