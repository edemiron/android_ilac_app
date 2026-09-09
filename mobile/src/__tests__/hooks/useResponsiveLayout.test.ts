import { renderHook } from '@testing-library/react-native';
import { useWindowDimensions } from 'react-native';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';

jest.mock('react-native', () => ({
  useWindowDimensions: jest.fn(),
}));

describe('useResponsiveLayout', () => {
  it('detects phone form factor (< 600dp)', () => {
    (useWindowDimensions as jest.Mock).mockReturnValue({
      width: 390,
      height: 844,
    });

    const { result } = renderHook(() => useResponsiveLayout());
    expect(result.current.isTablet).toBe(false);
    expect(result.current.numColumns).toBe(1);
    expect(result.current.horizontalPadding).toBe(16);
    expect(result.current.fontSizeMultiplier).toBe(1.0);
  });

  it('detects tablet form factor (>= 600dp / 768dp)', () => {
    (useWindowDimensions as jest.Mock).mockReturnValue({
      width: 800,
      height: 1280,
    });

    const { result } = renderHook(() => useResponsiveLayout());
    expect(result.current.isTablet).toBe(true);
    expect(result.current.numColumns).toBe(2);
    expect(result.current.contentMaxWidth).toBe(980);
    expect(result.current.horizontalPadding).toBe(24);
    expect(result.current.fontSizeMultiplier).toBe(1.15);
  });
});
