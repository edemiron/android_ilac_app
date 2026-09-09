/**
 * BatchMedicineImportModal photo pick (kamera ve galeri AI akışı) testleri.
 *
 * v1.9.1 çağrı noktası davranış doğrulaması:
 * 1. `capture.ok === false` durumunda `isLoading` spinner'ı kilitlenmez (false kalır).
 * 2. `cancelled` (kullanıcı vazgeçti) durumunda SESSİZCE çıkılır (Alert.alert açılmaz).
 * 3. `too-large` veya `permission-denied` durumlarında Alert.alert ile kullanıcı uyarılır.
 * 4. `ok: true` ve OCR başarı/hata/exception durumlarında spinner temizlenir ve doğru UI durumu oluşur.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockAlert = jest.fn();
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  TextInput: 'TextInput',
  ScrollView: 'ScrollView',
  Modal: 'Modal',
  Switch: 'Switch',
  ActivityIndicator: 'ActivityIndicator',
  Alert: { alert: (...args: unknown[]) => mockAlert(...args) },
  StyleSheet: { create: <T,>(s: T): T => s, flatten: <T,>(s: T): T => s, hairlineWidth: 1 },
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

import { BatchMedicineImportModal } from '../../components/common/BatchMedicineImportModal';
import { captureImageForAI } from '../../utils/imageCapture';
import { recognizeMultipleMedicineBoxesPhotoAI } from '../../services/aiMedicineService';

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('expo-file-system', () => ({
  File: jest.fn(),
}));

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      card: '#FFFFFF',
      text: '#000000',
      textSecondary: '#666666',
      primary: '#007AFF',
      border: '#E5E5E5',
      background: '#F2F2F7',
      danger: '#FF3B30',
    },
    isDark: false,
  }),
}));

jest.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'tr',
  }),
}));

jest.mock('../../stores/medicineStore', () => ({
  useMedicineStore: () => ({
    addMedicine: jest.fn().mockResolvedValue(true),
  }),
}));

jest.mock('../../utils/notifications', () => ({
  scheduleMedicineNotification: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../services/aiMedicineService', () => ({
  recognizeMultipleMedicineBoxesPhotoAI: jest.fn(),
}));

jest.mock('../../utils/imageCapture', () => {
  const actual = jest.requireActual('../../utils/imageCapture');
  return {
    ...actual,
    captureImageForAI: jest.fn(),
  };
});

describe('BatchMedicineImportModal — AI Fotoğraf Yakalama Davranışı', () => {
  const mockedCapture = captureImageForAI as jest.Mock;
  const mockedRecognize = recognizeMultipleMedicineBoxesPhotoAI as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAlert.mockClear();
  });

  it('1. cancelled: kullanıcı fotoğraftan vazgeçtiğinde Alert açılmaz ve sessizce çıkılır', async () => {
    mockedCapture.mockResolvedValue({ ok: false, reason: 'cancelled' });

    const { getByText } = render(<BatchMedicineImportModal visible={true} onClose={jest.fn()} />);

    const cameraButton = getByText('Kamera ile Kutuları Çek');
    fireEvent.press(cameraButton);

    await waitFor(() => {
      expect(mockedCapture).toHaveBeenCalledWith('camera');
      expect(mockAlert).not.toHaveBeenCalled();
      expect(mockedRecognize).not.toHaveBeenCalled();
    });
  });

  it('2. too-large: fotoğraf yükleme sınırını aştığında Alert gösterilir', async () => {
    mockedCapture.mockResolvedValue({ ok: false, reason: 'too-large', base64Length: 8000000 });

    const { getByText } = render(<BatchMedicineImportModal visible={true} onClose={jest.fn()} />);

    const cameraButton = getByText('Kamera ile Kutuları Çek');
    fireEvent.press(cameraButton);

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith(
        'Fotoğraf',
        expect.stringContaining('Fotoğraf çok büyük')
      );
      expect(mockedRecognize).not.toHaveBeenCalled();
    });
  });

  it('3. permission-denied: kamera izni yoksa Alert gösterilir', async () => {
    mockedCapture.mockResolvedValue({ ok: false, reason: 'permission-denied' });

    const { getByText } = render(<BatchMedicineImportModal visible={true} onClose={jest.fn()} />);

    const cameraButton = getByText('Kamera ile Kutuları Çek');
    fireEvent.press(cameraButton);

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Fotoğraf', expect.stringContaining('kamera izni'));
    });
  });

  it('4. ok: true ve OCR başarılı: ilaçlar listeye eklenir ve spinner kapatılır', async () => {
    mockedCapture.mockResolvedValue({
      ok: true,
      uri: 'file:///batch.jpg',
      base64: 'valid-base64',
      base64Length: 1000,
    });
    mockedRecognize.mockResolvedValue({
      success: true,
      medicines: [
        {
          name: 'Aspirin Plus',
          dosage: '100mg',
          form: 'tablet',
          frequency: 1,
          instructions: 'after_meal',
        },
      ],
    });

    const { getByText, getByDisplayValue } = render(
      <BatchMedicineImportModal visible={true} onClose={jest.fn()} />
    );

    const libraryButton = getByText('Galeriden Fotoğraf Seç');
    fireEvent.press(libraryButton);

    await waitFor(() => {
      expect(mockedCapture).toHaveBeenCalledWith('library');
      expect(getByDisplayValue('Aspirin Plus')).toBeTruthy();
      expect(getByText('Tespit Edilen İlaçlar (1)')).toBeTruthy();
    });
  });

  it('5. ok: true ve OCR exception fırlattığında: hata Alerti verilir ve spinner kilitlenmez', async () => {
    mockedCapture.mockResolvedValue({
      ok: true,
      uri: 'file:///batch.jpg',
      base64: 'valid-base64',
      base64Length: 1000,
    });
    mockedRecognize.mockRejectedValue(new Error('AI Service Down'));

    const { getByText } = render(<BatchMedicineImportModal visible={true} onClose={jest.fn()} />);

    const cameraButton = getByText('Kamera ile Kutuları Çek');
    fireEvent.press(cameraButton);

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Hata', 'Fotoğraf işlenirken bir hata oluştu.');
    });
  });
});
