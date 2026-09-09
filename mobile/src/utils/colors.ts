/**
 * Renk + alpha birleştirme yardımcıları — Sprint 103.3 + 103.4
 *
 * Neden Hex8? Kod tabanındaki mevcut pattern `colors.primary + '20'` ile
 * bire bir uyumlu — migration sırasında native renderer'a giden byte'lar
 * değişmez (sıfır davranış değişimi).
 *
 * Alpha quantization notu: alpha 0-1 aralığında float alınır ve
 * Math.round(alpha * 255) ile byte'a çevrilir. Bu dönüşüm kayıplıdır;
 * 0.12 → 0x1F iken 0x20 istenen değerse ALPHA.fill (32/255) verilmelidir.
 * Legacy call site'ların byte-exact kalması için serbest ondalık YERİNE
 * aşağıdaki ALPHA sabitleri kullanılmalıdır.
 *
 * Sprint 103.4: rgb()/rgba() CSS functional notation desteği eklendi.
 * Parser sadece comma-separated syntax kabul eder (RN native renderer
 * sınırı); modern space syntax (rgba(0 0 0 / 0.5)) ve CSS var() reddedilir.
 */

export const ALPHA = {
  /** 0x10 (16/255) — en hafif zemin tonu (hover/pasif kart). */
  tint: 16 / 255,
  /** 0x15 (21/255) — yumuşak vurgu zemini. */
  wash: 21 / 255,
  /** 0x20 (32/255) — standart durum rozeti / kart zemini. */
  fill: 32 / 255,

  // → Sprint 103.4: Ek semantik sabitler (rgba(...,A) byte-exact karşılıkları)
  /** 0x0D (13/255) — neredeyse görünmez pasif tab bg (rgba(...,0.05)). */
  haze: 13 / 255,
  /** 0x26 (38/255) — enabled badge bg (rgba(...,0.15)). */
  veil: 38 / 255,
  /** 0x2E (46/255) — disabled badge bg (rgba(...,0.18)). */
  veilStrong: 46 / 255,
  /** 0x33 (51/255) — icon container overlay (rgba(...,0.20)). */
  over: 51 / 255,
  /** 0x40 (64/255) — streak/gradient chip overlay (rgba(...,0.25)). */
  chip: 64 / 255,
  /** 0x99 (153/255) — MD3 modal scrim (rgba(...,0.60)). */
  scrim: 153 / 255,
  /** 0xB3 (179/255) — text on dark overlay (rgba(...,0.70)). */
  scrimStrong: 179 / 255,
  /** 0xD9 (217/255) — text on dark/gradient (rgba(...,0.85)). */
  onLight: 217 / 255,
} as const;

const HEX_BODY = /^[0-9a-fA-F]+$/;
const RGB_HEAD = /^rgba?\s*\(\s*([^)]+)\s*\)\s*$/i;

/**
 * `rgba(R, G, B, A)` -> `RRGGBB` uppercase (alpha atılır). Null döner -> caller throw eder.
 * Kabul: 3 veya 4 argüman, whitespace tolerant, case-insensitive, ondalık alpha.
 * Reddet: range dışı, ondalık RGB, modern space syntax, CSS var, % komponent.
 */
function parseRgbFunctional(raw: string): string | null {
  const m = RGB_HEAD.exec(raw);
  if (!m) return null;
  const parts = m[1].split(',').map((s) => s.trim());
  if (parts.length !== 3 && parts.length !== 4) return null;

  for (let i = 0; i < 3; i++) {
    const n = Number(parts[i]);
    if (!Number.isInteger(n) || n < 0 || n > 255) return null;
  }
  if (parts.length === 4) {
    const a = Number(parts[3]);
    if (!Number.isFinite(a) || a < 0 || a > 1) return null;
  }

  return parts
    .slice(0, 3)
    .map((n) => Number(n).toString(16).toUpperCase().padStart(2, '0'))
    .join('');
}

/**
 * Hex veya rgb/rgba -> `RRGGBB` uppercase. Girişteki alpha (hex veya rgba) atılır —
 * downstream `withAlpha()` yeni alpha yazacak.
 *
 * @param color `#RGB` | `#RGBA` | `#RRGGBB` | `#RRGGBBAA` | `rgb(R,G,B)` | `rgba(R,G,B,A)`
 */
function normalizeToRgb(color: string): string {
  if (typeof color !== 'string') {
    throw new Error(`withAlpha: color must be a string, received ${typeof color}`);
  }
  const raw = color.trim();
  if (raw.startsWith('#')) {
    const body = raw.slice(1);
    if (!HEX_BODY.test(body)) {
      throw new Error(`withAlpha: malformed hex color "${raw}"`);
    }
    switch (body.length) {
      case 3:
      case 4:
        // shorthand genişletme; 4. hane (alpha) bilinçli olarak atılır
        return body
          .slice(0, 3)
          .split('')
          .map((c) => c + c)
          .join('')
          .toUpperCase();
      case 6:
      case 8:
        return body.slice(0, 6).toUpperCase();
      default:
        throw new Error(`withAlpha: unsupported hex length in "${raw}"`);
    }
  }
  if (/^rgba?\(/i.test(raw)) {
    const parsed = parseRgbFunctional(raw);
    if (parsed === null) {
      throw new Error(`withAlpha: malformed rgb/rgba "${raw}"`);
    }
    return parsed;
  }
  throw new Error(`withAlpha: only hex and rgb/rgba colors are supported, received "${raw}"`);
}

/**
 * Hex veya rgb/rgba rengi verilen alpha ile `#RRGGBBAA` formatında döndürür.
 * Girişteki mevcut alpha (varsa) üzerine yazılır.
 *
 * @param color `#RGB` | `#RGBA` | `#RRGGBB` | `#RRGGBBAA` | `rgb(R,G,B)` | `rgba(R,G,B,A)`
 * @param alpha 0-1 aralığında sonlu sayı (bkz. ALPHA sabitleri)
 */
export function withAlpha(color: string, alpha: number): string {
  if (typeof alpha !== 'number' || !Number.isFinite(alpha)) {
    throw new Error(`withAlpha: alpha must be a finite number, received ${String(alpha)}`);
  }
  if (alpha < 0 || alpha > 1) {
    throw new Error(`withAlpha: alpha must be between 0 and 1, received ${alpha}`);
  }

  const rgb = normalizeToRgb(color);
  const alphaByte = Math.round(alpha * 255)
    .toString(16)
    .toUpperCase()
    .padStart(2, '0');

  return `#${rgb}${alphaByte}`;
}
