/**
 * MotiPressable.tsx — Sprint 97.1 TouchableOpacity drop-in replacement.
 *
 * Moti (Reanimated worklets) üzerinde scale-based press animasyonu sağlar.
 * useHaptics entegrasyonu default `light` haptic ile gelir; onPressHaptic ile
 * özelleştirilebilir veya `false` ile kapatılabilir.
 *
 * Davranış:
 *   - pressed → scale 1 → scaleTo (default 0.97)
 *   - press transition: motiTransitions.press (150ms timing)
 *   - disabled durumda animasyon YOK, haptic YOK, callback YOK
 *   - haptic sadece onPress içinde çağrılır (onPressIn/onPress karışmaz)
 *
 * Kullanım:
 *   <MotiPressable onPress={handleSave} onPressHaptic="success">
 *     <Text>Kaydet</Text>
 *   </MotiPressable>
 *
 *   // Mevcut TouchableOpacity ile aynı interface — style, accessibility,
 *   // onLongPress, onPressIn, onPressOut, hitSlop vb. Pressable üzerinden aktarılır.
 */

import React, { useCallback, useState } from 'react';
import {
  Pressable,
  type PressableProps,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { MotiView } from 'moti';

import { useHaptics, type HapticType } from '../../hooks/useHaptics';
import { motiTransitions } from '../../theme/moti-config';

export interface MotiPressableProps
  extends Omit<PressableProps, 'style' | 'children'> {
  children: React.ReactNode;
  onPress?: (e: GestureResponderEvent) => void;
  /**
   * Press edildiğinde tetiklenecek haptic tipi.
   * - default: 'light'
   * - false: haptic çağrılmasın (örn. başka yerde haptic var)
   */
  onPressHaptic?: HapticType | false;
  /**
   * Press sırasında scale değeri. default 0.97.
   */
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
}

export function MotiPressable({
  children,
  onPress,
  onPressHaptic = 'light',
  scaleTo = 0.97,
  disabled,
  style,
  onPressIn,
  onPressOut,
  ...rest
}: MotiPressableProps) {
  const [pressed, setPressed] = useState(false);
  const haptics = useHaptics();

  const handlePress = useCallback(
    (e: GestureResponderEvent) => {
      if (disabled) return;
      if (onPressHaptic !== false) {
        haptics.trigger(onPressHaptic);
      }
      onPress?.(e);
    },
    [disabled, onPressHaptic, onPress, haptics]
  );

  const handlePressIn = useCallback(
    (e: GestureResponderEvent) => {
      if (!disabled) setPressed(true);
      onPressIn?.(e);
    },
    [disabled, onPressIn]
  );

  const handlePressOut = useCallback(
    (e: GestureResponderEvent) => {
      setPressed(false);
      onPressOut?.(e);
    },
    [onPressOut]
  );

  // scaleTo: 1 = animasyonsuz (no-op davranış, sadece haptic wrapper olarak kullanılabilir)
  const shouldAnimate = scaleTo < 1 && !disabled;
  const targetScale = shouldAnimate && pressed ? scaleTo : 1;

  return (
    <MotiView
      from={{ scale: 1 }}
      animate={{ scale: targetScale }}
      transition={motiTransitions.press}
      style={style}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        {...rest}
      >
        {children}
      </Pressable>
    </MotiView>
  );
}
