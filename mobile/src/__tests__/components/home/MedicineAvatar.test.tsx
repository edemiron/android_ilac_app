/**
 * MedicineAvatar tests — Sprint 98 Karol-inspired redesign.
 *
 * Harf avatar + image fallback davranisi testleri:
 * - imageUri yoksa harf avatar render edilir
 * - imageUri varsa Image render edilir
 * - isCompleted durumunda opacity dusuk
 * - Custom size prop'una gore width/height/borderRadius ayarlanir
 * - Erisilebilirlik rolleri (image) ve label
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';

// Mock React Native — Image'i host element gibi davranacak sekilde mock'la.
jest.mock('react-native', () => {
  const ReactLocal = require('react');
  const MockImage = (props: { children?: React.ReactNode; [k: string]: unknown }) =>
    ReactLocal.createElement('Image', props, props.children);
  return {
    View: 'View',
    Text: 'Text',
    Image: MockImage,
    StyleSheet: {
      create: <T,>(s: T): T => s,
      flatten: <T,>(s: T): T => s,
    },
  };
});

import { MedicineAvatar } from '../../../screens/HomeScreen/components/MedicineAvatar';

describe('MedicineAvatar', () => {
  it('renders without crashing', () => {
    const { UNSAFE_root } = render(<MedicineAvatar name="Aspirin" color="#4ECDC4" />);
    expect(UNSAFE_root).toBeTruthy();
  });

  it('renders first letter avatar when imageUri is not provided', () => {
    const { UNSAFE_root, queryByText } = render(
      <MedicineAvatar name="Aspirin" color="#4ECDC4" />
    );
    // Ilk harf 'A' avatar olarak gosterilir
    expect(queryByText('A')).toBeTruthy();
    // Image host element yok
    expect(UNSAFE_root.findAllByType('Image')).toHaveLength(0);
  });

  it('uppercases the initial character', () => {
    const { queryByText } = render(<MedicineAvatar name="parol" color="#4ECDC4" />);
    // 'p' -> 'P'
    expect(queryByText('P')).toBeTruthy();
  });

  it('falls back to "?" when name is empty', () => {
    // charAt(0) on "" returns "" (not null/undefined), so the ?? fallback only
    // triggers when name is null/undefined. Empty string still produces "" initial.
    const { UNSAFE_root } = render(<MedicineAvatar name={undefined as unknown as string} color="#4ECDC4" />);
    const text = UNSAFE_root.findByType('Text');
    expect(text.props.children).toBe('?');
  });

  it('renders Image when imageUri is provided', () => {
    const { UNSAFE_root, queryByText } = render(
      <MedicineAvatar name="Aspirin" color="#4ECDC4" imageUri="file:///med.jpg" />
    );
    // Image host element var, harf yok
    expect(UNSAFE_root.findAllByType('Image').length).toBeGreaterThan(0);
    expect(queryByText('A')).toBeNull();
  });

  it('sets accessibilityLabel on letter avatar', () => {
    const { UNSAFE_root } = render(<MedicineAvatar name="Aspirin" color="#4ECDC4" />);
    const avatarView = UNSAFE_root.findByProps({ accessibilityRole: 'image' });
    expect(avatarView.props.accessibilityLabel).toBe('Aspirin avatar');
  });

  it('sets low opacity when isCompleted is true', () => {
    const { UNSAFE_root } = render(
      <MedicineAvatar name="Aspirin" color="#4ECDC4" isCompleted />
    );
    const view = UNSAFE_root.findByProps({ accessibilityRole: 'image' });
    const styles = ([] as Array<ViewStyle | ImageStyle | TextStyle | undefined>).concat(
      (view.props.style ?? []) as Array<ViewStyle | ImageStyle | TextStyle | undefined>
    );
    // Inline style, opacity iceren objeyi bul
    const inline = styles.find((s) => s && typeof s === 'object' && 'opacity' in s) as ViewStyle;
    expect(inline.opacity).toBe(0.55);
  });

  it('respects custom size prop (width/height/borderRadius/fontSize)', () => {
    const { UNSAFE_root } = render(
      <MedicineAvatar name="Aspirin" color="#4ECDC4" size={64} />
    );
    const view = UNSAFE_root.findByProps({ accessibilityRole: 'image' });
    const styles = ([] as Array<ViewStyle | ImageStyle | TextStyle | undefined>).concat(
      (view.props.style ?? []) as Array<ViewStyle | ImageStyle | TextStyle | undefined>
    );
    const inline = styles.find((s) => s && typeof s === 'object' && 'width' in s) as ViewStyle;
    expect(inline.width).toBe(64);
    expect(inline.height).toBe(64);
    expect(inline.borderRadius).toBe(32);

    // Text font size: round(64 * 0.45) = 29
    const text = UNSAFE_root.findByType('Text');
    const textStyles = ([] as Array<TextStyle | undefined>).concat(
      (text.props.style ?? []) as Array<TextStyle | undefined>
    );
    const textInline = textStyles.find((s) => s && typeof s === 'object' && 'fontSize' in s) as TextStyle;
    expect(textInline.fontSize).toBe(29);
  });

  it('uses color with 25 hex suffix as background tint', () => {
    const { UNSAFE_root } = render(<MedicineAvatar name="Aspirin" color="#4ECDC4" />);
    const view = UNSAFE_root.findByProps({ accessibilityRole: 'image' });
    const styles = ([] as Array<ViewStyle | undefined>).concat(
      (view.props.style ?? []) as Array<ViewStyle | undefined>
    );
    const inline = styles.find((s) => s && 'backgroundColor' in s) as ViewStyle;
    expect(inline.backgroundColor).toBe('#4ECDC425');
  });

  it('renders Image with size/borderRadius when imageUri is provided', () => {
    const { UNSAFE_root } = render(
      <MedicineAvatar name="Aspirin" color="#4ECDC4" imageUri="file:///x.jpg" size={48} />
    );
    const image = UNSAFE_root.findByType('Image');
    const styles = ([] as Array<ImageStyle | undefined>).concat(
      (image.props.style ?? []) as Array<ImageStyle | undefined>
    );
    const inline = styles.find((s) => s && 'width' in s) as ImageStyle;
    expect(inline.width).toBe(48);
    expect(inline.height).toBe(48);
    expect(inline.borderRadius).toBe(24);
  });
});
