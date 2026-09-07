import React, { useCallback, useMemo, useReducer, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { type ThemeColors } from '../../../contexts/ThemeContext';
import { isoToParts, partsToIso, type DateParts } from '../../../domain/dateParts';
import {
  buildColumns,
  createWheelDateReducer,
  makeDateRange,
  type DateRange,
  type WheelColumnId,
  type WheelDateState,
} from '../../../domain/wheelDateModel';
import { SELECTION_LINE_TOP_1, SELECTION_LINE_TOP_2, WHEEL_CONTAINER_HEIGHT } from './constants';
import { WheelColumn } from './WheelColumn';

export interface WheelDatePickerProps {
  readonly value: string; // 'yyyy-MM-dd' veya ''
  readonly range?: { readonly min: string; readonly max: string };
  readonly onChange: (iso: string, parts: DateParts) => void;
  readonly colors: ThemeColors;
  readonly isDark: boolean;
  readonly isTr: boolean;
  readonly columnOrder?: readonly WheelColumnId[];
  readonly hapticsEnabled?: boolean;
  readonly soundEnabled?: boolean;
}

export const WheelDatePicker = React.memo(function WheelDatePicker({
  value,
  range,
  onChange,
  colors,
  isDark,
  isTr,
  columnOrder = ['day', 'month', 'year'],
  hapticsEnabled = true,
  soundEnabled = true,
}: WheelDatePickerProps) {
  const resolvedRange: DateRange = useMemo(() => {
    const minParts = range?.min ? isoToParts(range.min) : null;
    const maxParts = range?.max ? isoToParts(range.max) : null;

    const fallbackMin: DateParts = { year: 1910, month: 1, day: 1 };
    const fallbackMax: DateParts = { year: 2026, month: 12, day: 31 };

    return (
      makeDateRange(minParts ?? fallbackMin, maxParts ?? fallbackMax) ??
      makeDateRange(fallbackMin, fallbackMax)!
    );
  }, [range?.min, range?.max]);

  const initialParts: DateParts = useMemo(() => {
    const parsed = value ? isoToParts(value) : null;
    if (parsed) return parsed;
    // Boş ise akıllı başlangıç: 1980-01-01 veya min/max arası
    const defaultYear =
      resolvedRange.min.year <= 1980 && resolvedRange.max.year >= 1980
        ? 1980
        : resolvedRange.min.year;
    return { year: defaultYear, month: 1, day: 1 };
  }, [value, resolvedRange]);

  const reducer = useMemo(() => createWheelDateReducer(resolvedRange), [resolvedRange]);

  const [state, dispatch] = useReducer(reducer, {
    parts: initialParts,
    lastExplicitDay: initialParts.day,
  } as WheelDateState);

  // Sütun modelleri (gün, ay, yıl)
  const columns = useMemo(
    () => buildColumns(state, resolvedRange, isTr),
    [state, resolvedRange, isTr]
  );

  const columnMap = useMemo(() => {
    const map = new Map<WheelColumnId, (typeof columns)[number]>();
    for (const col of columns) {
      map.set(col.id, col);
    }
    return map;
  }, [columns]);

  const stateRef = useRef(state);
  stateRef.current = state;

  const handleSelect = useCallback(
    (id: WheelColumnId, index: number) => {
      const currentState = stateRef.current;
      let nextState: WheelDateState;
      if (id === 'day') {
        nextState = reducer(currentState, { type: 'setDay', day: index + 1 });
      } else if (id === 'month') {
        nextState = reducer(currentState, { type: 'setMonth', month: index + 1 });
      } else {
        const year = resolvedRange.min.year + index;
        nextState = reducer(currentState, { type: 'setYear', year });
      }
      dispatch({ type: 'reset', parts: nextState.parts });
      onChange(partsToIso(nextState.parts), nextState.parts);
    },
    [reducer, resolvedRange.min.year, onChange]
  );

  const onSelectDay = useCallback((idx: number) => handleSelect('day', idx), [handleSelect]);
  const onSelectMonth = useCallback((idx: number) => handleSelect('month', idx), [handleSelect]);
  const onSelectYear = useCallback((idx: number) => handleSelect('year', idx), [handleSelect]);

  const getSelectHandler = useCallback(
    (colId: WheelColumnId) => {
      switch (colId) {
        case 'day':
          return onSelectDay;
        case 'month':
          return onSelectMonth;
        case 'year':
          return onSelectYear;
      }
    },
    [onSelectDay, onSelectMonth, onSelectYear]
  );

  // İki yatay mavi / camgöbeği seçim çizgisi (kullanıcı referans görselindeki gibi)
  const selectionLineColor = isDark ? '#38BDF8' : '#0284C7';

  return (
    <View style={styles.container}>
      <View style={styles.wheelRow}>
        {columnOrder.map(colId => {
          const col = columnMap.get(colId);
          if (!col) return null;

          const a11yColLabel =
            colId === 'day'
              ? isTr
                ? 'Gün'
                : 'Day'
              : colId === 'month'
                ? isTr
                  ? 'Ay'
                  : 'Month'
                : isTr
                  ? 'Yıl'
                  : 'Year';

          return (
            <WheelColumn
              key={col.id}
              id={col.id}
              labels={col.labels}
              firstEnabled={col.firstEnabled}
              lastEnabled={col.lastEnabled}
              selectedIndex={col.selectedIndex}
              onSelect={getSelectHandler(col.id)}
              accessibilityLabel={a11yColLabel}
              accessibilityValue={col.accessibilityValue}
              colors={colors}
              isDark={isDark}
              hapticsEnabled={hapticsEnabled}
              soundEnabled={soundEnabled}
            />
          );
        })}
      </View>

      {/* Ortadaki seçili satırı vurgulayan İKİ YATAY MAVİ ÇİZGİ */}
      <View
        pointerEvents="none"
        style={[
          styles.selectionLine,
          {
            top: SELECTION_LINE_TOP_1,
            backgroundColor: selectionLineColor,
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          styles.selectionLine,
          {
            top: SELECTION_LINE_TOP_2,
            backgroundColor: selectionLineColor,
          },
        ]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    height: WHEEL_CONTAINER_HEIGHT,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  wheelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  selectionLine: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    height: 2,
    borderRadius: 1,
  },
});
