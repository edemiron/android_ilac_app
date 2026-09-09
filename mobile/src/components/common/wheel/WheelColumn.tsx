import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { type ThemeColors } from '../../../contexts/ThemeContext';
import { useHaptics } from '../../../hooks/useHaptics';
import { clampInt } from '../../../domain/dateParts';
import { type WheelColumnId } from '../../../domain/wheelDateModel';
import { playWheelTickSound } from '../../../utils/wheelSound';
import {
  COLUMN_WIDTHS,
  HAPTIC_MIN_INTERVAL_MS,
  tierFor,
  WHEEL_CONTAINER_HEIGHT,
  WHEEL_ITEM_HEIGHT,
  WHEEL_PADDING_VERTICAL,
} from './constants';
import { WheelItem } from './WheelItem';

export interface WheelColumnProps {
  readonly id: WheelColumnId;
  readonly labels: readonly string[];
  readonly firstEnabled: number;
  readonly lastEnabled: number;
  readonly selectedIndex: number;
  readonly onSelect: (index: number) => void;
  readonly accessibilityLabel: string;
  readonly accessibilityValue: string;
  readonly colors: ThemeColors;
  readonly isDark: boolean;
  readonly hapticsEnabled?: boolean;
  readonly soundEnabled?: boolean;
  readonly itemHeight?: number;
}

export function nearestEnabledIndex(
  landed: number,
  first: number,
  last: number,
  count: number
): number {
  if (count === 0) return 0;
  if (first > last) return clampInt(landed, 0, count - 1);
  if (landed < first) return first;
  if (landed > last) return last;
  return landed;
}

const keyByIndex = (_: string, index: number) => String(index);

export const WheelColumn = React.memo(function WheelColumn({
  id,
  labels,
  firstEnabled,
  lastEnabled,
  selectedIndex,
  onSelect,
  accessibilityLabel,
  accessibilityValue,
  colors,
  hapticsEnabled = true,
  soundEnabled = true,
  itemHeight = WHEEL_ITEM_HEIGHT,
}: WheelColumnProps) {
  const listRef = useRef<FlatList<string>>(null);
  const [localIndex, setLocalIndex] = useState(selectedIndex);
  const isUserScrolling = useRef(false);
  const isMomentumScrolling = useRef(false);
  const dragEndTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEmittedIndex = useRef(selectedIndex);
  const lastHapticAt = useRef(0);
  const haptics = useHaptics();

  // Deterministik piksel snap offsetleri
  const snapOffsets = useMemo(() => labels.map((_, i) => i * itemHeight), [labels, itemHeight]);

  const triggerTickFeedback = useCallback(() => {
    if (soundEnabled) {
      playWheelTickSound();
    }
    if (!hapticsEnabled) return;
    const now = Date.now();
    if (now - lastHapticAt.current < HAPTIC_MIN_INTERVAL_MS) return;
    lastHapticAt.current = now;
    haptics.selection();
  }, [haptics, hapticsEnabled, soundEnabled]);

  const emit = useCallback(
    (index: number) => {
      if (index === lastEmittedIndex.current) return; // INV-5: Tekilleştirme
      lastEmittedIndex.current = index;
      onSelect(index);
    },
    [onSelect]
  );

  const settle = useCallback(
    (offsetY: number, source: 'user' | 'programmatic') => {
      const count = labels.length;
      const rawIndex = clampInt(Math.round(offsetY / itemHeight), 0, count - 1);
      const target =
        rawIndex >= firstEnabled && rawIndex <= lastEnabled
          ? rawIndex
          : nearestEnabledIndex(rawIndex, firstEnabled, lastEnabled, count);

      setLocalIndex(target);

      // Yalnızca devre dışı (disabled) sınır dışı bir elemana düşülmüşse düzeltme kaydırması yap
      if (target !== rawIndex) {
        listRef.current?.scrollToOffset({
          offset: target * itemHeight,
          animated: true,
        });
      }

      if (source === 'user') {
        emit(target);
        if (hapticsEnabled) {
          haptics.selection();
        }
        if (soundEnabled) {
          playWheelTickSound();
        }
      }
      isUserScrolling.current = false;
      isMomentumScrolling.current = false;
    },
    [
      labels.length,
      itemHeight,
      firstEnabled,
      lastEnabled,
      emit,
      haptics,
      hapticsEnabled,
      soundEnabled,
    ]
  );

  // Unmount temizliği
  useEffect(() => {
    return () => {
      if (dragEndTimeoutRef.current) {
        clearTimeout(dragEndTimeoutRef.current);
      }
    };
  }, []);

  // Prop senkronizasyonu — Ebeveyn değiştiğinde hizala, kullanıcı kaydırıyorken ASLA müdahale etme (INV-4)
  useEffect(() => {
    if (isUserScrolling.current || isMomentumScrolling.current) return;
    if (selectedIndex === lastEmittedIndex.current) return;
    lastEmittedIndex.current = selectedIndex;
    setLocalIndex(selectedIndex);
    listRef.current?.scrollToOffset({
      offset: selectedIndex * itemHeight,
      animated: false,
    });
  }, [selectedIndex, itemHeight]);

  const handleScrollBeginDrag = useCallback(() => {
    isUserScrolling.current = true;
    if (dragEndTimeoutRef.current) {
      clearTimeout(dragEndTimeoutRef.current);
      dragEndTimeoutRef.current = null;
    }
  }, []);

  const handleScrollEndDrag = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      // Sürükleme bittiğinde momentumun doğal şekilde akmasına izin ver.
      // Sadece kullanıcının hiç momentum oluşturmadan parmağını sabit bırakması durumu için 120ms güvenlik fallback'i
      if (dragEndTimeoutRef.current) {
        clearTimeout(dragEndTimeoutRef.current);
      }
      const offsetY = e.nativeEvent.contentOffset.y;
      dragEndTimeoutRef.current = setTimeout(() => {
        if (!isMomentumScrolling.current && isUserScrolling.current) {
          settle(offsetY, 'user');
        }
      }, 120);
    },
    [settle]
  );

  const handleMomentumBegin = useCallback(() => {
    isMomentumScrolling.current = true;
    isUserScrolling.current = true;
    if (dragEndTimeoutRef.current) {
      clearTimeout(dragEndTimeoutRef.current);
      dragEndTimeoutRef.current = null;
    }
  }, []);

  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      isMomentumScrolling.current = false;
      if (dragEndTimeoutRef.current) {
        clearTimeout(dragEndTimeoutRef.current);
        dragEndTimeoutRef.current = null;
      }
      settle(e.nativeEvent.contentOffset.y, 'user');
    },
    [settle]
  );

  // 60 FPS akıcı görsel takip: Kaydırma anında ortadaki satırın dinamik büyümesi ve haptic + mekanik ses
  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = e.nativeEvent.contentOffset.y;
      const count = labels.length;
      const rawIndex = clampInt(Math.round(offsetY / itemHeight), 0, count - 1);
      if (rawIndex !== localIndex) {
        setLocalIndex(rawIndex);
        triggerTickFeedback();
      }
    },
    [itemHeight, labels.length, localIndex, triggerTickFeedback]
  );

  const handleItemPress = useCallback(
    (targetIndex: number) => {
      if (targetIndex < firstEnabled || targetIndex > lastEnabled) return;
      isUserScrolling.current = false;
      isMomentumScrolling.current = false;
      if (dragEndTimeoutRef.current) {
        clearTimeout(dragEndTimeoutRef.current);
        dragEndTimeoutRef.current = null;
      }
      setLocalIndex(targetIndex);
      listRef.current?.scrollToOffset({
        offset: targetIndex * itemHeight,
        animated: true,
      });
      emit(targetIndex);
      if (hapticsEnabled) {
        haptics.selection();
      }
      if (soundEnabled) {
        playWheelTickSound();
      }
    },
    [firstEnabled, lastEnabled, itemHeight, emit, haptics, hapticsEnabled, soundEnabled]
  );

  // A11y TalkBack / VoiceOver tek adım desteği
  const stepAndScroll = useCallback(
    (delta: 1 | -1) => {
      const next = clampInt(selectedIndex + delta, firstEnabled, lastEnabled);
      if (next === selectedIndex) return;
      setLocalIndex(next);
      listRef.current?.scrollToOffset({ offset: next * itemHeight, animated: true });
      lastEmittedIndex.current = next;
      onSelect(next);
      if (hapticsEnabled) {
        haptics.selection();
      }
      if (soundEnabled) {
        playWheelTickSound();
      }
    },
    [
      selectedIndex,
      firstEnabled,
      lastEnabled,
      itemHeight,
      onSelect,
      haptics,
      hapticsEnabled,
      soundEnabled,
    ]
  );

  const handleAccessibilityAction = useCallback(
    (e: { nativeEvent: { actionName: string } }) => {
      switch (e.nativeEvent.actionName) {
        case 'increment':
          stepAndScroll(1);
          break;
        case 'decrement':
          stepAndScroll(-1);
          break;
        case 'activate':
          if (hapticsEnabled) {
            haptics.selection();
          }
          if (soundEnabled) {
            playWheelTickSound();
          }
          break;
      }
    },
    [stepAndScroll, haptics, hapticsEnabled, soundEnabled]
  );

  const getItemLayout = useCallback(
    (_: unknown, index: number) => ({
      length: itemHeight,
      offset: itemHeight * index,
      index,
    }),
    [itemHeight]
  );

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<string>) => {
      const distance = Math.abs(index - localIndex);
      const tier = tierFor(distance);
      const enabled = index >= firstEnabled && index <= lastEnabled;

      return (
        <WheelItem
          label={item}
          tier={tier}
          enabled={enabled}
          colors={colors}
          itemHeight={itemHeight}
          onPress={handleItemPress}
          index={index}
        />
      );
    },
    [localIndex, firstEnabled, lastEnabled, colors, itemHeight, handleItemPress]
  );

  const contentPadding = useMemo(
    () => ({
      paddingVertical: WHEEL_PADDING_VERTICAL,
    }),
    []
  );

  const columnWidth = COLUMN_WIDTHS[id] ?? 80;

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: accessibilityValue }}
      accessibilityActions={[
        { name: 'increment', label: 'Artır' },
        { name: 'decrement', label: 'Azalt' },
      ]}
      onAccessibilityAction={handleAccessibilityAction}
      style={[
        styles.columnContainer,
        {
          width: columnWidth,
          height: WHEEL_CONTAINER_HEIGHT,
        },
      ]}
    >
      <FlatList
        ref={listRef}
        data={labels}
        keyExtractor={keyByIndex}
        renderItem={renderItem}
        extraData={localIndex}
        getItemLayout={getItemLayout}
        initialScrollIndex={selectedIndex}
        snapToInterval={itemHeight}
        snapToOffsets={snapOffsets}
        decelerationRate={Platform.OS === 'ios' ? 'normal' : 'fast'}
        disableIntervalMomentum={false}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        nestedScrollEnabled
        bounces={Platform.OS === 'ios'}
        windowSize={11}
        initialNumToRender={Math.min(labels.length, 30)}
        maxToRenderPerBatch={Math.min(labels.length, 30)}
        updateCellsBatchingPeriod={16}
        removeClippedSubviews={false}
        contentContainerStyle={contentPadding}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        onScroll={handleScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollBegin={handleMomentumBegin}
        onMomentumScrollEnd={handleMomentumEnd}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  columnContainer: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
