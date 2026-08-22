import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
  TouchableOpacity,
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

  useEffect(() => {
    setLocalIndex(selectedIndex);
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({
        offset: selectedIndex * ITEM_HEIGHT,
        animated: false,
      });
    }
  }, [selectedIndex]);

  const handleMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    const index = Math.max(0, Math.min(Math.round(offsetY / ITEM_HEIGHT), data.length - 1));
    setLocalIndex(index);
    onSelect(index);
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    const index = Math.max(0, Math.min(Math.round(offsetY / ITEM_HEIGHT), data.length - 1));
    if (index !== localIndex) {
      setLocalIndex(index);
    }
  };

  const handleItemPress = (index: number) => {
    setLocalIndex(index);
    onSelect(index);
    flatListRef.current?.scrollToOffset({
      offset: index * ITEM_HEIGHT,
      animated: true,
    });
  };

  return (
    <View style={styles.columnContainer}>
      {/* İki Yatay Çizgi: Seçili elemanın üstü ve altı (Görseldeki gibi) */}
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
        snapToAlignment="center"
        decelerationRate="fast"
        getItemLayout={(_, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
        initialScrollIndex={selectedIndex}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        ListHeaderComponent={<View style={{ height: ITEM_HEIGHT * 2 }} />}
        ListFooterComponent={<View style={{ height: ITEM_HEIGHT * 2 }} />}
        renderItem={({ item, index }) => {
          const distance = Math.abs(index - localIndex);

          // Görseldeki hiyerarşik renk ve boyutlandırma
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
              activeOpacity={0.8}
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

  // İlk saat ve dakikayı belirle
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

  const handleHourSelect = (index: number) => {
    const newHour = HOURS[index];
    setHours(newHour);
    const timeStr = `${newHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    onChange(timeStr, newHour, minutes);
  };

  const handleMinuteSelect = (index: number) => {
    const newMinute = MINUTES[index];
    setMinutes(newMinute);
    const timeStr = `${hours.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}`;
    onChange(timeStr, hours, newMinute);
  };

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

      {/* Sütunlar Arası Boşluk */}
      <View style={styles.columnGap} />

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
    marginVertical: 10,
  },
  columnContainer: {
    width: 90,
    height: WHEEL_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
  },
  columnGap: {
    width: 30,
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
