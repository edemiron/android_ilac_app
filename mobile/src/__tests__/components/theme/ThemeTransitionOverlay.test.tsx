/**
 * ThemeTransitionOverlay.test.tsx — Sprint 104.5
 * Tema geçişi (dark/light) animasyon perdesinin render ve timing testleri
 */

import React from 'react';
import { render, act } from '@testing-library/react-native';

const mockAnimatedValue = {
  setValue: jest.fn(),
  interpolate: jest.fn(),
};

jest.mock('react-native', () => ({
  __esModule: true,
  View: 'View',
  Animated: {
    Value: jest.fn(() => mockAnimatedValue),
    timing: jest.fn(() => ({
      start: (cb?: (res: { finished: boolean }) => void) => cb && cb({ finished: true }),
    })),
    View: 'Animated.View',
  },
  StyleSheet: {
    create: <T,>(s: T): T => s,
    absoluteFillObject: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  },
}));

let mockIsDark = false;

jest.mock('../../../contexts/ThemeContext', () => ({
  useThemeSafe: () => ({
    isDark: mockIsDark,
  }),
  lightColors: { background: '#F8FAFC' },
  darkColors: { background: '#0F172A' },
}));

import { ThemeTransitionOverlay } from '../../../components/theme/ThemeTransitionOverlay';

describe('ThemeTransitionOverlay', () => {
  beforeEach(() => {
    mockIsDark = false;
    jest.clearAllMocks();
  });

  it('ilk renderda perde aktif olmaz (null döner)', () => {
    const { toJSON } = render(<ThemeTransitionOverlay />);
    expect(toJSON()).toBeNull();
  });

  it('tema durumu ayni kaldiginda render bozulmaz', () => {
    const { rerender, toJSON } = render(<ThemeTransitionOverlay />);
    rerender(<ThemeTransitionOverlay />);
    expect(toJSON()).toBeNull();
  });

  it('isDark degistiginde animasyon tetiklenir ve perde render edilir', () => {
    const { rerender, toJSON } = render(<ThemeTransitionOverlay />);
    expect(toJSON()).toBeNull();

    // Koyu moda gecis
    mockIsDark = true;
    act(() => {
      rerender(<ThemeTransitionOverlay />);
    });

    expect(mockAnimatedValue.setValue).toHaveBeenCalledWith(1);
  });
});
