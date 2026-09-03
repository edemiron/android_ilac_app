/* global __dirname */
/**
 * v1.8.7 — IKON-ONLY DOKUNULABILIRLERIN ERISILEBILIR ADI (KAPI TESTI).
 *
 * NASIL BULUNDU: cihazda `uiautomator dump` ile "Yeni Ilac Ekle" ekraninin
 * erisilebilirlik agaci okundugunda, ilac adi satirindaki UC butonun
 * `content-desc` degerinin su oldugu gorüldü:
 *
 *     U+F293   U+F1DC   U+F176
 *
 * Bunlar Private Use Area kod noktalari — yani ikon FONTUNUN glif
 * numaralari. Android, butonun icinde yalnizca bir ikon `<Text>` bulunca
 * erisilebilir adi o karakterden uretiyor. TalkBack bunu okuyamaz:
 * kullaniciya "buton" diye bile duyurulmaz, anlamsiz bir karakter okunur.
 *
 * NIYE v1.8.3 KACIRDI: o tur, yazi boyutunu (415 kucuk font) ve dokunma
 * hedefi boyutunu (253 kucuk kutu) olcmustu. ERISILEBILIR AD hic olculmedi.
 * Uygulamanin birincil kitlesi yasli hastalar — yani TalkBack ve buyuk yazi
 * kullanma olasiligi en yuksek grup. Bu yuzden bu kapi 0 tolerans ile
 * kurulur, "kritik yol" ayrimi yapilmaz.
 *
 * KURAL: ikon bileseni iceren bir dokunulabilir, ya bir metin cocugu
 * tasiyacak (o zaman erisilebilir ad metinden gelir) ya da
 * `accessibilityLabel` verecek. Ucuncu bir secenek yok.
 */

import fs from 'fs';
import path from 'path';

const SRC = path.resolve(__dirname, '../..');

const TOUCHABLE =
  /<(TouchableOpacity|Pressable|TouchableHighlight|TouchableWithoutFeedback|MotiPressable)\b/g;
const ICON =
  /<(Ionicons|MaterialCommunityIcons|MaterialIcons|FontAwesome\w*|Feather|AntDesign|Entypo|Octicons)\b/;
/** Metin cocugu VEYA metin tasiyan bir prop — erisilebilir ad buradan gelir. */
const TEXT = /<(Text|ThemedText)\b|\{\s*(label|title|text|buttonText|scanButtonText)\s*\}/;

function tsxFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') continue;
      tsxFiles(p, out);
    } else if (p.endsWith('.tsx')) {
      out.push(p);
    }
  }
  return out;
}

/**
 * Acilis etiketinden baslayip ESLESEN kapanisa kadar olan blogu dondurur.
 * Kendi kendini kapatan etiketlerde (`/>`) blok yalnizca etiketin kendisidir.
 */
function blockAt(src: string, tagStart: number, tag: string): string {
  const gt = src.indexOf('>', tagStart);
  if (gt === -1) return src.slice(tagStart);
  if (
    src
      .slice(tagStart, gt + 1)
      .trimEnd()
      .endsWith('/>')
  ) {
    return src.slice(tagStart, gt + 1);
  }
  const close = src.indexOf(`</${tag}>`, tagStart);
  return close === -1 ? src.slice(tagStart, tagStart + 2000) : src.slice(tagStart, close);
}

function scan() {
  const files = [...tsxFiles(path.join(SRC, 'components')), ...tsxFiles(path.join(SRC, 'screens'))];
  let iconTouchables = 0;
  const unnamed: string[] = [];

  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    let m: RegExpExecArray | null;
    TOUCHABLE.lastIndex = 0;
    while ((m = TOUCHABLE.exec(src))) {
      const block = blockAt(src, m.index, m[1]);
      if (!ICON.test(block)) continue;
      iconTouchables++;
      if (/accessibilityLabel/.test(block)) continue;
      if (TEXT.test(block)) continue;
      const line = src.slice(0, m.index).split('\n').length;
      unnamed.push(`${path.relative(SRC, file).replace(/\\/g, '/')}:${line}`);
    }
  }
  return { files, iconTouchables, unnamed };
}

describe('erisilebilir ad — ikon-only dokunulabilirler', () => {
  it('taradigi dosya sayisi anlamli (kapi kendi kapsamini dogrular)', () => {
    const { files, iconTouchables } = scan();

    // Kapinin sessizce bosa dusmesini engeller: yol degisirse burasi kirilir.
    expect(files.length).toBeGreaterThan(150);
    expect(iconTouchables).toBeGreaterThan(150);
  });

  it('ikon iceren HICBIR dokunulabilir erisilebilir adsiz kalmaz', () => {
    const { unnamed } = scan();

    // Liste bos DEGILSE mesajda tam olarak hangi satirlar oldugu gorunur.
    expect(unnamed).toEqual([]);
  });
});
