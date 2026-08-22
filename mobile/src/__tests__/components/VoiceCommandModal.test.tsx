import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { VoiceCommandModal } from '../../components/common/VoiceCommandModal';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  ActivityIndicator: 'ActivityIndicator',
  Modal: 'Modal',
  StyleSheet: { create: <T,>(s: T): T => s, flatten: <T,>(s: T): T => s, hairlineWidth: 1 },
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

jest.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'tr',
    t: (key: string) => key,
  }),
}));

describe('VoiceCommandModal', () => {
  it('renders correctly when visible', () => {
    const onCommandRecognized = jest.fn();
    const onClose = jest.fn();

    const { getByText } = render(
      <VoiceCommandModal
        visible={true}
        onCommandRecognized={onCommandRecognized}
        onClose={onClose}
      />
    );

    expect(getByText('Sesli Komut')).toBeTruthy();
    expect(getByText('"Aldım"')).toBeTruthy();
    expect(getByText('"Ertele"')).toBeTruthy();
    expect(getByText('"Atla"')).toBeTruthy();
  });

  it('triggers onCommandRecognized with TAKE when Aldım quick button is clicked', () => {
    jest.useFakeTimers();
    const onCommandRecognized = jest.fn();
    const onClose = jest.fn();

    const { getByText } = render(
      <VoiceCommandModal
        visible={true}
        onCommandRecognized={onCommandRecognized}
        onClose={onClose}
      />
    );

    fireEvent.press(getByText('"Aldım"'));
    jest.advanceTimersByTime(700);

    expect(onCommandRecognized).toHaveBeenCalledWith('TAKE');
    expect(onClose).toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('triggers onCommandRecognized with SNOOZE when Ertele quick button is clicked', () => {
    jest.useFakeTimers();
    const onCommandRecognized = jest.fn();
    const onClose = jest.fn();

    const { getByText } = render(
      <VoiceCommandModal
        visible={true}
        onCommandRecognized={onCommandRecognized}
        onClose={onClose}
      />
    );

    fireEvent.press(getByText('"Ertele"'));
    jest.advanceTimersByTime(700);

    expect(onCommandRecognized).toHaveBeenCalledWith('SNOOZE');
    expect(onClose).toHaveBeenCalled();
    jest.useRealTimers();
  });
});
