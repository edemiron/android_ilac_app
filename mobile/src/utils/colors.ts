/**
 * Renk + alpha birleştirme yardımcıları — Sprint 103.3
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
 */

export const ALPHA = {
  /** 0x10 (16/255) — en hafif zemin tonu (hover/pasif kart). */
  tint: 16 / 255,
  /** 0x15 (21/255) — yumuşak vurgu zemini. */
  wash: 21 / 255,
  /** 0x20 (32/255) — standart durum rozeti / kart zemini. */
  fill: 32 / 255,
} as const;

const HEX_BODY = /^[0-9a-fA-F]+$/;

/** `#RGB`/`#RGBA`/`#RRGGBB`/`#RRGGBBAA` -> `RRGGBB` (uppercase, alpha atılır). */
function normalizeHex(color: string): string {
  if (typeof color !== 'string') {
    throw new Error(`withAlpha: color must be a string, received ${typeof color}`);
  }
  const raw = color.trim();
  if (!raw.startsWith('#')) {
    if (/^rgba?\(/i.test(raw)) {
      throw new Error(
        `withAlpha: rgb/rgba input is not supported yet (Sprint 103.4): "${raw}"`
      );
    }
    throw new Error(`withAlpha: only hex colors are supported, received "${raw}"`);
  }

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

/**
 * Hex rengi verilen alpha ile `#RRGGBBAA` formatında döndürür.
 * Girişteki mevcut alpha (varsa) üzerine yazılır.
 *
 * @param color `#RGB` | `#RGBA` | `#RRGGBB` | `#RRGGBBAA`
 * @param alpha 0-1 aralığında sonlu sayı (bkz. ALPHA sabitleri)
 */
export function withAlpha(color: string, alpha: number): string {
  if (typeof alpha !== 'number' || !Number.isFinite(alpha)) {
    throw new Error(`withAlpha: alpha must be a finite number, received ${String(alpha)}`);
  }
  if (alpha < 0 || alpha > 1) {
    throw new Error(`withAlpha: alpha must be between 0 and 1, received ${alpha}`);
  }

  const rgb = normalizeHex(color);
  const alphaByte = Math.round(alpha * 255)
    .toString(16)
    .toUpperCase()
    .padStart(2, '0');

  return `#${rgb}${alphaByte}`;
}
