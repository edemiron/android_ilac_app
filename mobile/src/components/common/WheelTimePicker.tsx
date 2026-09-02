import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

const ITEM_HEIGHT = 48;
const VISIBLE_COUNT = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_COUNT;

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

interface WheelColumnProps {
  data: number[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  formatItem?: (val: number) => string;
  isDark?: boolean;
}

const WheelColumn: React.FC<WheelColumnProps> = ({
  data,
  selectedIndex,
  onSelect,
  formatItem = (v: number) => v.toString(),
  isDark = false,
}) => {
  const flatListRef = useRef<FlatList>(null);
  const [localIndex, setLocalIndex] = useState(selectedIndex);
  const isUserScrolling = useRef(false);

  // Deterministik piksel snap offsetleri
  const snapOffsets = useMemo(() => data.map((_, i) => i * ITEM_HEIGHT), [data]);

  // Sadece dışarıdan gelen prop değişiminde (kullanıcı kaydırmıyorken) hizala
  useEffect(() => {
    if (!isUserScrolling.current) {
      setLocalIndex(selectedIndex);
      flatListRef.current?.scrollToOffset({
        offset: selectedIndex * ITEM_HEIGHT,
        animated: false,
      });
    }
  }, [selectedIndex]);

  const settleToIndex = useCallback(
    (offsetY: number) => {
      const maxOffset = (data.length - 1) * ITEM_HEIGHT;
      const clampedOffset = Math.max(0, Math.min(offsetY, maxOffset));
      const targetIndex = Math.max(
        0,
        Math.min(Math.round(clampedOffset / ITEM_HEIGHT), data.length - 1)
      );

      setLocalIndex(targetIndex);
      onSelect(targetIndex);
      isUserScrolling.current = false;
    },
    [data.length, onSelect]
  );

  const handleScrollBeginDrag = () => {
    isUserScrolling.current = true;
  };

  const handleMomentumScrollBegin = () => {
    isUserScrolling.current = true;
  };

  const handleScrollEndDrag = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    settleToIndex(e.nativeEvent.contentOffset.y);
  };

  const handleMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    settleToIndex(e.nativeEvent.contentOffset.y);
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    const maxOffset = (data.length - 1) * ITEM_HEIGHT;
    const clampedOffset = Math.max(0, Math.min(offsetY, maxOffset));
    const targetIndex = Math.max(
      0,
      Math.min(Math.round(clampedOffset / ITEM_HEIGHT), data.length - 1)
    );

    if (targetIndex !== localIndex) {
      setLocalIndex(targetIndex);
    }
  };

  const handleItemPress = (index: number) => {
    isUserScrolling.current = false;
    setLocalIndex(index);
    onSelect(index);
    flatListRef.current?.scrollToOffset({
      offset: index * ITEM_HEIGHT,
      animated: true,
    });
  };

  return (
    <View style={styles.columnContainer}>
      {/* İki Yatay Çizgi: Seçili elemanın üstü ve altı */}
      <View
        pointerEvents="none"
        style={[
          styles.dividerLine,
          styles.dividerTop,
          { borderColor: isDark ? '#475569' : '#CBD5E1' },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.dividerLine,
          styles.dividerBottom,
          { borderColor: isDark ? '#475569' : '#CBD5E1' },
        ]}
      />

      <FlatList
        ref={flatListRef}
        data={data}
        keyExtractor={item => item.toString()}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        snapToOffsets={snapOffsets}
        decelerationRate={Platform?.OS === 'ios' ? 'normal' : 'fast'}
        contentContainerStyle={styles.flatListContent}
        getItemLayout={(_, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
        initialScrollIndex={selectedIndex}
        onScrollBeginDrag={handleScrollBeginDrag}
        onMomentumScrollBegin={handleMomentumScrollBegin}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        overScrollMode="never"
        bounces={true}
        nestedScrollEnabled={true}
        renderItem={({ item, index }) => {
          const distance = Math.abs(index - localIndex);

          let textColor = isDark ? '#F8FAFC' : '#1E293B';
          let fontSize = 30;
          let fontWeight: '700' | '400' | '300' = '700';

          if (distance === 1) {
            textColor = isDark ? '#94A3B8' : '#64748B';
            fontSize = 22;
            fontWeight = '400';
          } else if (distance >= 2) {
            textColor = isDark ? '#475569' : '#94A3B8';
            fontSize = 18;
            fontWeight = '300';
          }

          return (
            <TouchableOpacity
              style={styles.itemWrapper}
              onPress={() => handleItemPress(index)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.itemText,
                  {
                    color: textColor,
                    fontSize,
                    fontWeight,
                  },
                ]}
              >
                {formatItem(item)}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};

export interface WheelTimePickerProps {
  value: Date | string; // 'HH:mm' veya Date
  onChange: (timeString: string, hours: number, minutes: number) => void;
}

export const WheelTimePicker: React.FC<WheelTimePickerProps> = ({ value, onChange }) => {
  const { isDark } = useTheme();

  const parseInitialTime = useCallback(() => {
    if (value instanceof Date) {
      return { hours: value.getHours(), minutes: value.getMinutes() };
    }
    if (typeof value === 'string' && value.includes(':')) {
      const [h, m] = value.split(':').map(n => parseInt(n, 10));
      return {
        hours: isNaN(h) ? 12 : Math.min(23, Math.max(0, h)),
        minutes: isNaN(m) ? 0 : Math.min(59, Math.max(0, m)),
      };
    }
    return { hours: 12, minutes: 0 };
  }, [value]);

  const initial = parseInitialTime();
  const [hours, setHours] = useState(initial.hours);
  const [minutes, setMinutes] = useState(initial.minutes);

  useEffect(() => {
    const updated = parseInitialTime();
    setHours(updated.hours);
    setMinutes(updated.minutes);
  }, [parseInitialTime]);

  const handleHourSelect = useCallback(
    (index: number) => {
      const newHour = HOURS[index];
      setHours(newHour);
      const timeStr = `${newHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      onChange(timeStr, newHour, minutes);
    },
    [minutes, onChange]
  );

  const handleMinuteSelect = useCallback(
    (index: number) => {
      const newMinute = MINUTES[index];
      setMinutes(newMinute);
      const timeStr = `${hours.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}`;
      onChange(timeStr, hours, newMinute);
    },
    [hours, onChange]
  );

  return (
    <View style={styles.pickerContainer}>
      {/* Saat Sütunu */}
      <WheelColumn
        data={HOURS}
        selectedIndex={hours}
        onSelect={handleHourSelect}
        formatItem={v => v.toString()}
        isDark={isDark}
      />

      {/* Sütunlar Arası İki Nokta (Separator) */}
      <View style={styles.separatorContainer}>
        <Text style={[styles.separatorText, { color: isDark ? '#94A3B8' : '#64748B' }]}>:</Text>
      </View>

      {/* Dakika Sütunu */}
      <WheelColumn
        data={MINUTES}
        selectedIndex={minutes}
        onSelect={handleMinuteSelect}
        formatItem={v => v.toString().padStart(2, '0')}
        isDark={isDark}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  pickerContainer: {
    height: WHEEL_HEIGHT,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginVertical: 8,
  },
  columnContainer: {
    width: 90,
    height: WHEEL_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
  },
  separatorContainer: {
    width: 24,
    height: WHEEL_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  separatorText: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 4,
  },
  flatListContent: {
    paddingVertical: ITEM_HEIGHT * 2,
  },
  itemWrapper: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  dividerLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1.5,
    borderBottomWidth: 1.5,
    zIndex: 10,
  },
  dividerTop: {
    top: ITEM_HEIGHT * 2,
  },
  dividerBottom: {
    top: ITEM_HEIGHT * 3,
  },
});
