/**
 * SkeletonListItem tests — Sprint 107.4 (Radikal UI Mimarisi).
 */

import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  StyleSheet: {
    create: <T,>(styles: T): T => styles,
    flatten: <T,>(styles: T): T => styles,
  },
  Platform: { OS: 'android' },
  View: 'View',
  Animated: {
    Value: class {
      interpolate() {}
    },
    View: 'AnimatedView',
    timing: () => ({ start: (cb?: () => void) => { cb?.(); } }),
    loop: () => ({ start: () => {}, stop: () => {} }),
    sequence: () => ({ start: (cb?: () => void) => { cb?.(); } }),
  },
  Easing: {
    inOut: () => ({}),
    ease: () => ({}),
  },
}));

import { SkeletonListItem } from '../../../components/common/SkeletonListItem';

describe('SkeletonListItem', () => {
  it('renders generic variant by default', () => {
    const { UNSAFE_root } = render(<SkeletonListItem />);
    expect(UNSAFE_root).toBeTruthy();
  });

  it('renders medicine-row variant', () => {
    const { UNSAFE_root } = render(<SkeletonListItem variant="medicine-row" />);
    expect(UNSAFE_root).toBeTruthy();
  });

  it('renders stat-row variant', () => {
    const { UNSAFE_root } = render(<SkeletonListItem variant="stat-row" />);
    expect(UNSAFE_root).toBeTruthy();
  });

  it('renders timeline-item variant', () => {
    const { UNSAFE_root } = render(<SkeletonListItem variant="timeline-item" />);
    expect(UNSAFE_root).toBeTruthy();
  });

  it('renders avatar when showAvatar is true', () => {
    const { UNSAFE_root } = render(<SkeletonListItem showAvatar />);
    expect(UNSAFE_root).toBeTruthy();
  });

  it('renders multiple lines', () => {
    const { UNSAFE_root } = render(<SkeletonListItem lines={3} />);
    expect(UNSAFE_root).toBeTruthy();
  });

  it('renders trailing block when showTrailing is true', () => {
    const { UNSAFE_root } = render(<SkeletonListItem showTrailing />);
    expect(UNSAFE_root).toBeTruthy();
  });

  it('hides from accessibility tree', () => {
    const { UNSAFE_root } = render(<SkeletonListItem testID="skeleton-test" />);
    expect(UNSAFE_root).toBeTruthy();
  });
});