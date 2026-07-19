import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Auth context, theme, language ve alert context'leri izole et.
// Login ekrani navigation/auth'e bagimli; burada sadece form elemanlarinin
// dogru render edildigini ve temel validation akisinin calistigini dogruluyoruz.
jest.mock('react-native', () => ({
  StyleSheet: {
    create: <T,>(styles: T): T => styles,
    flatten: <T,>(styles: T): T => styles,
  },
  Platform: {
    OS: 'android',
  },
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  ScrollView: 'ScrollView',
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  ActivityIndicator: 'ActivityIndicator',
  TextInput: 'TextInput',
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 1, fontScale: 1 }),
}));

const mockLogin = jest.fn();
const mockResetPassword = jest.fn();
const mockClearError = jest.fn();
const mockShowError = jest.fn();

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    resetPassword: mockResetPassword,
    loginWithGoogleProvider: jest.fn(),
    isGoogleAvailable: false,
    googleAvailabilityReason: 'mocked',
    isLoading: false,
    error: null,
    clearError: mockClearError,
  }),
}));

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#fff',
      surface: '#f5f5f5',
      text: '#000',
      primary: '#4ECDC4',
      border: '#ddd',
      danger: '#ff0000',
    },
  }),
}));

jest.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'tr',
    t: { common: {} },
  }),
}));

jest.mock('../../contexts/AlertContext', () => ({
  useAlert: () => ({
    showError: mockShowError,
    showInfo: jest.fn(),
    showSuccess: jest.fn(),
  }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

import LoginScreen from '../../screens/LoginScreen';

// NOT: Bu test Sprint 3'te (notifications.ts modüler bölünme) veya LoginScreen
// refactor'unda yeniden aktif edilecek. Şu an fireEvent.press('Giriş Yap') butonu
// tetiklenmiyor (büyük olasılıkla testID veya erişilebilirlik sorunu).
// SPRINT 1 GÜNCELLEME: LoginScreen'e testID="login-button" eklendi.
// describe.skip kaldirildi, testID ile hedefleme yapildi.
describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders email and password inputs and the primary action button', () => {
    const { getByPlaceholderText, getByTestId } = render(<LoginScreen />);

    // Placeholder metinleri Turkce/Ingilizce olabilir
    expect(getByPlaceholderText('ornek@email.com')).toBeTruthy();
    expect(getByPlaceholderText(/•/)).toBeTruthy();
    // Login butonu (testID ile)
    expect(getByTestId('login-button')).toBeTruthy();
  });

  it('shows validation error when submitting without email', () => {
    const { getByTestId } = render(<LoginScreen />);

    // testID ile butonu hedefle
    fireEvent.press(getByTestId('login-button'));

    // E-posta adresi girilmemisse hata gosterilir; login cagrilmaz
    expect(mockShowError).toHaveBeenCalled();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('calls login with provided credentials (normalization happens in authService)', () => {
    const { getByPlaceholderText, getByTestId } = render(<LoginScreen />);

    const emailInput = getByPlaceholderText('ornek@email.com');
    const passwordInput = getByPlaceholderText(/•/);

    fireEvent.changeText(emailInput, '  User@Example.COM ');
    fireEvent.changeText(passwordInput, 'secret123');

    fireEvent.press(getByTestId('login-button'));

    // LoginScreen email'i olduğu gibi gönderir; normalization authService'te olur
    // (bu test mock'unda authService normalleştirme yok).
    expect(mockLogin).toHaveBeenCalledTimes(1);
    const callArgs = mockLogin.mock.calls[0];
    // Email (trimmed) ve password mock'a geçirildi
    expect(callArgs[0]).toBe('User@Example.COM');
    expect(callArgs[1]).toBe('secret123');
  });
});
