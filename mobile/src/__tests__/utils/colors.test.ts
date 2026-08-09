/**
 * colors.test.ts — Sprint 103.3
 *
 * withAlpha() utility + ALPHA sabitleri test suite.
 * - Normalization (5 case)
 * - Alpha boundaries & rounding (4 case)
 * - ALPHA byte-exact regresyon kilidi (1 case, 3 assert)
 * - Invalid input (4 case)
 *
 * Toplam 14 case.
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
  it('ALPHA.tint/wash/fill byte karşılığı (regresyon kilidi)', () => {
    expect(withAlpha('#000000', ALPHA.tint)).toBe('#00000010');
    expect(withAlpha('#000000', ALPHA.wash)).toBe('#00000015');
    expect(withAlpha('#000000', ALPHA.fill)).toBe('#00000020');
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

  it("rgba input → throw (Sprint 103.4 referansı); malformed hex → throw", () => {
    expect(() => withAlpha('rgba(0,0,0,0.5)', 0.5)).toThrow(/103\.4/);
    expect(() => withAlpha('#XYZ', 0.5)).toThrow();
  });
});
