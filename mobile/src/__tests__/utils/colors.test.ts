/**
 * colors.test.ts — Sprint 103.3 + 103.4
 *
 * withAlpha() utility + ALPHA sabitleri test suite.
 * - Hex normalization (5 case)
 * - Alpha boundaries & rounding (4 case)
 * - ALPHA byte-exact regresyon kilidi (mevcut 3 + yeni 8 = 11 assert)
 * - Invalid input (4 case)
 * - rgba/rgb normalization (6 case) — Sprint 103.4
 * - rgba/rgb invalid input (8 case) — Sprint 103.4
 * - cross-format equivalence (2 case) — Sprint 103.4
 *
 * Toplam 31 case.
 */

import { withAlpha, ALPHA } from '../../utils/colors';

describe('withAlpha - normalization', () => {
  it('6-hane uppercase hex + ALPHA.fill → byte-exact #RRGGBB20', () => {
    expect(withAlpha('#10B981', ALPHA.fill)).toBe('#10B98120');
  });

  it('6-hane lowercase hex normalize → uppercase output', () => {
    expect(withAlpha('#10b981', ALPHA.fill)).toBe('#10B98120');
  });

  it('3-hane shorthand → 6-hane expand', () => {
    expect(withAlpha('#FFF', 1)).toBe('#FFFFFFFF');
  });

  it('8-hane mevcut alpha overwrite', () => {
    expect(withAlpha('#10B981FF', ALPHA.tint)).toBe('#10B98110');
  });

  it('4-hane shorthand + mevcut alpha overwrite', () => {
    expect(withAlpha('#F00A', 0)).toBe('#FF000000');
  });
});

describe('withAlpha - alpha boundaries & rounding', () => {
  it('alpha = 0 → #RRGGBB00', () => {
    expect(withAlpha('#10B981', 0)).toBe('#10B98100');
  });

  it('alpha = 1 → #RRGGBBFF', () => {
    expect(withAlpha('#10B981', 1)).toBe('#10B981FF');
  });

  it('alpha = 0.5 → Math.round(127.5) = 128 = 0x80', () => {
    expect(withAlpha('#10B981', 0.5)).toBe('#10B98180');
  });

  it('alpha = 0.02 → Math.round(5.1) = 5 → tek hane padding', () => {
    expect(withAlpha('#10B981', 0.02)).toBe('#10B98105');
  });
});

describe('withAlpha - ALPHA constants are byte-exact', () => {
  it('ALPHA.tint/wash/fill byte karşılığı (Sprint 103.3 regresyon kilidi)', () => {
    expect(withAlpha('#000000', ALPHA.tint)).toBe('#00000010');
    expect(withAlpha('#000000', ALPHA.wash)).toBe('#00000015');
    expect(withAlpha('#000000', ALPHA.fill)).toBe('#00000020');
  });

  it('Sprint 103.4 yeni ALPHA sabitleri byte karşılığı (regresyon kilidi)', () => {
    expect(withAlpha('#000000', ALPHA.haze)).toBe('#0000000D');
    expect(withAlpha('#000000', ALPHA.veil)).toBe('#00000026');
    expect(withAlpha('#000000', ALPHA.veilStrong)).toBe('#0000002E');
    expect(withAlpha('#000000', ALPHA.over)).toBe('#00000033');
    expect(withAlpha('#000000', ALPHA.chip)).toBe('#00000040');
    expect(withAlpha('#000000', ALPHA.scrim)).toBe('#00000099');
    expect(withAlpha('#000000', ALPHA.scrimStrong)).toBe('#000000B3');
    expect(withAlpha('#000000', ALPHA.onLight)).toBe('#000000D9');
  });
});

describe('withAlpha - invalid input', () => {
  it('alpha < 0 → throw', () => {
    expect(() => withAlpha('#10B981', -0.1)).toThrow();
  });

  it('alpha > 1 → throw; NaN → throw', () => {
    expect(() => withAlpha('#10B981', 1.1)).toThrow();
    expect(() => withAlpha('#10B981', NaN)).toThrow();
  });

  it("named color ('red' / 'transparent') → throw", () => {
    expect(() => withAlpha('red', 0.5)).toThrow();
    expect(() => withAlpha('transparent', 0.5)).toThrow();
  });

  it('rgba input kabul + malformed hex → throw', () => {
    // Sprint 103.4: rgba artık destekleniyor — byte-exact kanıt
    expect(withAlpha('rgba(0,0,0,0.5)', 0.5)).toBe('#00000080');
    expect(() => withAlpha('#XYZ', 0.5)).toThrow();
  });
});

describe('withAlpha - rgb/rgba normalization (Sprint 103.4)', () => {
  it('rgba(255,255,255,0.05) + alpha=0.05 → #FFFFFF0D (byte-exact)', () => {
    expect(withAlpha('rgba(255,255,255,0.05)', 0.05)).toBe('#FFFFFF0D');
  });

  it('rgba(255,255,255,0.25) + alpha=0.25 → #FFFFFF40', () => {
    expect(withAlpha('rgba(255,255,255,0.25)', 0.25)).toBe('#FFFFFF40');
  });

  it('rgb(16, 185, 129) 3-arg + alpha=1 → #10B981FF', () => {
    expect(withAlpha('rgb(16, 185, 129)', 1)).toBe('#10B981FF');
  });

  it('RGBA(16,185,129,0.5) case-insensitive, no space + alpha=0.5 → #10B98180', () => {
    expect(withAlpha('RGBA(16,185,129,0.5)', 0.5)).toBe('#10B98180');
  });

  it('rgba( 16 , 185 , 129 , 0.15 ) fazla whitespace + alpha=0.15 → #10B98126', () => {
    expect(withAlpha('rgba( 16 , 185 , 129 , 0.15 )', 0.15)).toBe('#10B98126');
  });

  it('rgba(16, 185, 129, .5) leading-dot ondalık alpha + alpha=0.5 → #10B98180', () => {
    expect(withAlpha('rgba(16, 185, 129, .5)', 0.5)).toBe('#10B98180');
  });
});

describe('withAlpha - rgb/rgba invalid input (Sprint 103.4)', () => {
  it('rgb(256,0,0) range dışı → throw', () => {
    expect(() => withAlpha('rgb(256,0,0)', 0.5)).toThrow();
  });

  it('rgb(-1,0,0) negatif → throw', () => {
    expect(() => withAlpha('rgb(-1,0,0)', 0.5)).toThrow();
  });

  it('rgb(16.5, 185, 129) ondalık RGB → throw', () => {
    expect(() => withAlpha('rgb(16.5, 185, 129)', 0.5)).toThrow();
  });

  it('rgba(0,0) eksik argüman → throw', () => {
    expect(() => withAlpha('rgba(0,0)', 0.5)).toThrow();
  });

  it('rgba(0,0,0,0.5,1) fazla argüman → throw', () => {
    expect(() => withAlpha('rgba(0,0,0,0.5,1)', 0.5)).toThrow();
  });

  it('rgba() boş → throw', () => {
    expect(() => withAlpha('rgba()', 0.5)).toThrow();
  });

  it('rgba(0 0 0 / 0.5) modern space syntax → throw', () => {
    expect(() => withAlpha('rgba(0 0 0 / 0.5)', 0.5)).toThrow();
  });

  it('rgba(var(--x), 0.5) CSS var → throw', () => {
    expect(() => withAlpha('rgba(var(--x), 0.5)', 0.5)).toThrow();
  });
});

describe('withAlpha - cross-format equivalence (Sprint 103.4)', () => {
  it('hex+ALPHA === rgba+ALPHA aynı çıktı', () => {
    expect(withAlpha('#10B981', ALPHA.fill)).toBe(
      withAlpha('rgba(16, 185, 129, 0.125)', ALPHA.fill)
    );
  });

  it('shorthand hex === rgb aynı çıktı', () => {
    expect(withAlpha('#FFF', 0.5)).toBe(withAlpha('rgb(255,255,255)', 0.5));
  });
});
