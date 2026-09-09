import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Modal: ({ children, visible }: { children: React.ReactNode; visible: boolean }) =>
    visible ? children : null,
  TouchableOpacity: ({ children, onPress, testID, accessibilityLabel, ...props }: any) => {
    const React = require('react');
    return React.createElement(
      'TouchableOpacity',
      { onPress, testID, accessibilityLabel, ...props },
      children
    );
  },
  Pressable: ({ children, onPress }: any) => {
    const React = require('react');
    return React.createElement('Pressable', { onPress }, children);
  },
  FlatList: ({
    data,
    renderItem,
  }: {
    data: Array<string>;
    renderItem: (info: { item: string; index: number }) => React.ReactNode;
  }) => {
    const React = require('react');
    return React.createElement(
      'View',
      null,
      data
        ? data.map((item, index) =>
            React.createElement('View', { key: item.toString() }, renderItem({ item, index }))
          )
        : null
    );
  },
  Platform: {
    OS: 'android',
    select: (obj: Record<string, unknown>) => obj.android ?? obj.default,
  },
  StyleSheet: {
    create: <T,>(s: T): T => s,
    flatten: <T,>(s: T): T => s,
    hairlineWidth: 1,
    absoluteFillObject: {},
  },
  AccessibilityInfo: {
    isScreenReaderEnabled: jest.fn().mockResolvedValue(false),
    addEventListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  },
}));

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      primary: '#14B8A6',
      background: '#0F172A',
      card: '#1E293B',
      text: '#F8FAFC',
      textSecondary: '#94A3B8',
      textMuted: '#64748B',
      border: '#334155',
      borderFocused: '#38BDF8',
      overlay: 'rgba(0,0,0,0.7)',
    },
    isDark: true,
  }),
}));

jest.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'tr', setLanguage: jest.fn(), t: (k: string) => k }),
}));

jest.mock('../../../hooks/useHaptics', () => ({
  useHaptics: () => ({
    selection: jest.fn(),
    light: jest.fn(),
    trigger: jest.fn(),
  }),
}));

import { WheelDatePickerModal } from '../../../components/common/wheel/WheelDatePickerModal';
import { WheelDatePicker } from '../../../components/common/wheel/WheelDatePicker';

describe('WheelDatePicker & WheelDatePickerModal', () => {
  const dummyColors = {
    primary: '#14B8A6',
    background: '#0F172A',
    card: '#1E293B',
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    border: '#334155',
    borderFocused: '#38BDF8',
    overlay: 'rgba(0,0,0,0.7)',
  } as any;

  describe('WheelDatePicker presentational', () => {
    it('renders with given ISO date without errors', () => {
      const onChange = jest.fn();
      const { toJSON } = render(
        <WheelDatePicker
          value="1980-05-15"
          onChange={onChange}
          colors={dummyColors}
          isDark={true}
          isTr={true}
        />
      );
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('WheelDatePickerModal', () => {
    it('renders modal dialog when visible=true', () => {
      const onConfirm = jest.fn();
      const onCancel = jest.fn();

      const { getByText, getByLabelText } = render(
        <WheelDatePickerModal
          visible={true}
          value="1970-03-15"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );

      expect(getByText('Doğum Tarihi Seçin')).toBeTruthy();
      expect(getByLabelText('İptal')).toBeTruthy();
      expect(getByLabelText('Tamam')).toBeTruthy();
    });

    it('calls onCancel when Cancel button is pressed', () => {
      const onConfirm = jest.fn();
      const onCancel = jest.fn();

      const { getByLabelText } = render(
        <WheelDatePickerModal
          visible={true}
          value="1970-03-15"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );

      fireEvent.press(getByLabelText('İptal'));
      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onConfirm).not.toHaveBeenCalled();
    });

    it('calls onConfirm with draft ISO when OK button is pressed', () => {
      const onConfirm = jest.fn();
      const onCancel = jest.fn();

      const { getByLabelText } = render(
        <WheelDatePickerModal
          visible={true}
          value="1970-03-15"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );

      fireEvent.press(getByLabelText('Tamam'));
      expect(onConfirm).toHaveBeenCalledWith('1970-03-15');
      expect(onCancel).not.toHaveBeenCalled();
    });
  });

  /**
   * YENİ-2 regresyon kapısı — doğum tarihinin sessizce kayması.
   *
   * Kusur: `WheelDatePicker.handleSelect` doğru aksiyonu reducer ile
   * HESAPLIYOR ama ardından `dispatch({ type: 'reset', parts })` yapıyordu.
   * `case 'reset'` ise `lastExplicitDay: action.parts.day` yazıyor — yani
   * HALİHAZIRDA KIRPILMIŞ günü. Oysa `case 'setMonth'` onu koruyor.
   *
   * Sonuç: 31 Ocak 1975 → Şubat → geri Ocak = 1975-01-28, ÜÇ GÜN YANLIŞ
   * doğum tarihi ve hiçbir uyarı yok. Yaş `calculateAge` üzerinden doz/yaş
   * bazlı karar desteğini ve acil tıbbi kimlik rozetini beslediği için bu bir
   * klinik veri bozulması.
   *
   * `wheelDateModel.test.ts` bunu yakalamıyordu çünkü `setMonth`'i DOĞRUDAN
   * dispatch ediyor — bileşenin `reset` üzerinden atladığı yol hiç test
   * edilmiyordu. Bu blok tam olarak o bileşen yolunu sürüyor.
   */
  describe('WheelDatePicker — gün koruma (YENİ-2)', () => {
    /**
     * Çark öğelerini HAM ağaçtan bulur.
     *
     * `getByText` KULLANILAMAZ: `WheelItem`, v2.1.0'ın "sütun başına tek
     * `accessibilityRole="adjustable"` düğümü" TalkBack kuralı gereği
     * `accessibilityElementsHidden` + `importantForAccessibility="no-hide-descendants"`
     * taşıyor ve RNTL sorguları a11y ağacından gizlenmiş öğeleri eler.
     * Öğeler görsel olarak var (160 metin render oluyor) ama sorgulanabilir
     * değiller — bu yüzden `root.findAll` ile iniliyor.
     */
    const findItem = (root: ReturnType<typeof render>['root'], label: string) => {
      const collectText = (node: unknown): string => {
        if (node == null) return '';
        if (typeof node === 'string') return node;
        if (Array.isArray(node)) return node.map(collectText).join('');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return collectText((node as any).children);
      };
      const matches = root.findAll(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (node: any) => node.type === 'TouchableOpacity' && collectText(node.children) === label,
        { deep: true }
      );
      if (matches.length === 0) {
        throw new Error(`Çark öğesi bulunamadı: "${label}"`);
      }
      return matches[0];
    };

    const renderPicker = (value: string) => {
      const onChange = jest.fn();
      const utils = render(
        <WheelDatePicker
          value={value}
          onChange={onChange}
          colors={dummyColors}
          isDark={true}
          isTr={true}
        />
      );
      return { onChange, root: utils.root };
    };

    it('31 Oca → Şub → Oca kaydırması günü 31 olarak KORUR', () => {
      const { onChange, root } = renderPicker('1975-01-31');

      // Şubat'a kaydır: 31 → 28'e kırpılması DOĞRU davranış (1975 artık yıl değil).
      fireEvent.press(findItem(root, 'Şub'));
      expect(onChange).toHaveBeenLastCalledWith('1975-02-28', {
        year: 1975,
        month: 2,
        day: 28,
      });

      // Geri Ocak'a kaydır: `lastExplicitDay` korunduysa 31'e dönmeli.
      // Eski kusurda buradan '1975-01-28' dönüyordu — ÜÇ GÜN YANLIŞ doğum tarihi.
      fireEvent.press(findItem(root, 'Oca'));
      expect(onChange).toHaveBeenLastCalledWith('1975-01-31', {
        year: 1975,
        month: 1,
        day: 31,
      });
    });

    it('artık yılda 29 Şub → Oca kaydırması 29 günü KORUR', () => {
      const { onChange, root } = renderPicker('1980-02-29');

      // 1980 artık yıl; Ocak'a kaydırınca açık gün (29) korunmalı.
      fireEvent.press(findItem(root, 'Oca'));
      expect(onChange).toHaveBeenLastCalledWith('1980-01-29', {
        year: 1980,
        month: 1,
        day: 29,
      });
    });

    it('kullanıcının hiç açıkça seçmediği gün korunmaz (28 Şub 1975 → Oca = 28)', () => {
      const { onChange, root } = renderPicker('1975-02-28');

      // 1975 artık yıl değil; giriş zaten 28. Ocak 31 gün ama kullanıcı 31'i
      // HİÇ açıkça seçmedi, dolayısıyla lastExplicitDay 28 kalmalı.
      // Bu test korumanın "sihirli 31" değil GERÇEK kullanıcı seçimi olduğunu kanıtlar.
      fireEvent.press(findItem(root, 'Oca'));
      expect(onChange).toHaveBeenLastCalledWith('1975-01-28', {
        year: 1975,
        month: 1,
        day: 28,
      });
    });

    it('yıl kaydırması açık günü korur (31 Ara 1975 → 1976)', () => {
      const { onChange, root } = renderPicker('1975-12-31');

      fireEvent.press(findItem(root, '1976'));
      expect(onChange).toHaveBeenLastCalledWith('1976-12-31', {
        year: 1976,
        month: 12,
        day: 31,
      });
    });
  });
});
