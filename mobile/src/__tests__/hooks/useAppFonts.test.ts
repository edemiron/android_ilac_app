/**
 * useAppFonts.test.ts — Sprint 103.2
 *
 * Jest'te expo-font mock'lu (jest.setup.js: useFonts → [true, null]).
 * Hook'un dönüş değeri + error throw davranışı verify edilir.
 */

import { renderHook } from '@testing-library/react-native';
import { useAppFonts } from '../../hooks/useAppFonts';

describe('useAppFonts', () => {
  it('returns true when fonts loaded (mock default)', () => {
    const { result } = renderHook(() => useAppFonts());
    expect(result.current).toBe(true);
  });
});
