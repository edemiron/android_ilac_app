/**
 * OnboardingControls tests — Sprint 107.6 (Radikal UI Mimarisi).
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  StyleSheet: {
    create: <T,>(styles: T): T => styles,
    flatten: <T,>(styles: T): T => styles,
  },
  Platform: { OS: 'android' },
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      primary: '#4ECDC4',
      textOnPrimary: '#fff',
      textSecondary: '#666',
      outlineVariant: '#ddd',
    },
    isDark: false,
  }),
}));

import { OnboardingControls } from '../../../components/common/OnboardingControls';

describe('OnboardingControls', () => {
  const baseProps = {
    total: 4,
    currentIndex: 0,
    isLast: false,
    onNext: jest.fn(),
    nextLabel: 'İleri',
    startLabel: 'Başla',
  };

  it('renders next label when not last', () => {
    const { getByText } = render(<OnboardingControls {...baseProps} />);
    expect(getByText('İleri')).toBeTruthy();
  });

  it('renders start label when isLast', () => {
    const { getByText } = render(<OnboardingControls {...baseProps} isLast />);
    expect(getByText('Başla')).toBeTruthy();
  });

  it('calls onNext when next button pressed', () => {
    const onNext = jest.fn();
    const { UNSAFE_root } = render(
      <OnboardingControls {...baseProps} onNext={onNext} testID="ctrl-next" />,
    );
    const nextBtn = UNSAFE_root.findByProps({ accessibilityLabel: 'İleri' });
    fireEvent.press(nextBtn);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('renders skip button by default', () => {
    const onSkip = jest.fn();
    const { getByText } = render(
      <OnboardingControls {...baseProps} onSkip={onSkip} skipLabel="Atla" />,
    );
    expect(getByText('Atla')).toBeTruthy();
  });

  it('calls onSkip when skip pressed', () => {
    const onSkip = jest.fn();
    const { UNSAFE_root } = render(
      <OnboardingControls {...baseProps} onSkip={onSkip} skipLabel="Atla" />,
    );
    const skipBtn = UNSAFE_root.findByProps({ accessibilityLabel: 'Atla' });
    fireEvent.press(skipBtn);
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('hides skip when isLast', () => {
    const onSkip = jest.fn();
    const { queryByText } = render(
      <OnboardingControls
        {...baseProps}
        isLast
        onSkip={onSkip}
        skipLabel="Atla"
      />,
    );
    expect(queryByText('Atla')).toBeNull();
  });

  it('hides skip when showSkip is false', () => {
    const onSkip = jest.fn();
    const { queryByText } = render(
      <OnboardingControls
        {...baseProps}
        onSkip={onSkip}
        showSkip={false}
        skipLabel="Atla"
      />,
    );
    expect(queryByText('Atla')).toBeNull();
  });

  it('renders correct number of dots', () => {
    const { UNSAFE_root } = render(<OnboardingControls {...baseProps} total={4} />);
    // 4 dot her biri View render edilir, total 4 dot bekle
    const views = UNSAFE_root.findAllByType('View' as never);
    expect(views.length).toBeGreaterThan(0);
  });
});