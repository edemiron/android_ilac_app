/**
 * useAddMedicine photo scan (AI kamera/fotoğraf) akışı testleri.
 *
 * v1.9.1 çağrı noktası davranış doğrulaması:
 * 1. `capture.ok === false` durumunda `isAnalyzingPhoto` spinner'ı kilitlenmez (false kalır).
 * 2. `cancelled` (kullanıcı vazgeçti) durumunda SESSİZCE çıkılır (Alert açılmaz).
 * 3. `permission-denied` durumunda 'warning' alert'i gösterilir.
 * 4. `too-large` ve diğer hatalarda 'error' alert'i gösterilir.
 * 5. `ok: true` ve OCR başarı/hata/exception durumlarında spinner temizlenir ve form güncellenir.
 */

import React from 'react';
import { Text } from 'react-native';
import { render, act } from '@testing-library/react-native';

import { useAddMedicine } from '../../hooks/useAddMedicine';
import { captureImageForAI } from '../../utils/imageCapture';
import { recognizeMedicineBoxPhotoAI } from '../../services/aiMedicineService';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Platform: { OS: 'android', select: (objs: Record<string, unknown>) => objs.android },
}));

jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: {} }),
}));

jest.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: { primary: '#007AFF', background: '#FFFFFF', text: '#000000' },
    isDark: false,
  }),
}));

const mockShowAlert = jest.fn();
jest.mock('../../contexts/AlertContext', () => ({
  useAlert: () => ({
    showAlert: mockShowAlert,
    hideAlert: jest.fn(),
  }),
}));

jest.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'tr',
  }),
}));

jest.mock('../../stores/medicineStore', () => ({
  useMedicineStore: () => ({
    getMedicineById: jest.fn(),
    settings: { language: 'tr', wakeUpTime: '08:00', sleepTime: '23:00' },
    getNextAvailableColor: () => '#4CAF50',
    medicines: [],
  }),
}));

jest.mock('../../hooks/useMedicinePersistence', () => ({
  useMedicinePersistence: () => ({
    persistSave: jest.fn().mockResolvedValue(true),
  }),
}));

jest.mock('../../services/globalMedicineService', () => ({
  autocomplete: jest.fn().mockResolvedValue([]),
}));

jest.mock('../../services/drugInteraction', () => ({
  checkInteractions: jest.fn().mockReturnValue([]),
}));

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('expo-file-system', () => ({
  File: jest.fn(),
}));

jest.mock('../../services/aiMedicineService', () => ({
  recognizeMedicineBoxPhotoAI: jest.fn(),
}));

jest.mock('../../utils/imageCapture', () => {
  const actual = jest.requireActual('../../utils/imageCapture');
  return {
    ...actual,
    captureImageForAI: jest.fn(),
  };
});

type HookReturn = ReturnType<typeof useAddMedicine>;
const captureRef: { current: HookReturn | null } = { current: null };

function HookProbe() {
  captureRef.current = useAddMedicine();
  return <Text testID="probe">{String(captureRef.current.isAnalyzingPhoto)}</Text>;
}

describe('useAddMedicine — AI Fotoğraf Tarama Davranışı', () => {
  const mockedCapture = captureImageForAI as jest.Mock;
  const mockedRecognize = recognizeMedicineBoxPhotoAI as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    captureRef.current = null;
  });

  it('1. cancelled: kullanıcı fotoğraftan vazgeçtiğinde spinner kilitlenmez ve sessizce çıkılır', async () => {
    mockedCapture.mockResolvedValue({ ok: false, reason: 'cancelled' });

    render(<HookProbe />);
    expect(captureRef.current?.isAnalyzingPhoto).toBe(false);

    await act(async () => {
      await captureRef.current?.handleScanPhotoBox();
    });

    expect(captureRef.current?.isAnalyzingPhoto).toBe(false);
    expect(mockShowAlert).not.toHaveBeenCalled();
    expect(mockedRecognize).not.toHaveBeenCalled();
  });

  it('2. permission-denied: kamera izni reddedildiğinde warning alert gösterilir ve spinner açılmaz', async () => {
    mockedCapture.mockResolvedValue({ ok: false, reason: 'permission-denied' });

    render(<HookProbe />);

    await act(async () => {
      await captureRef.current?.handleScanPhotoBox();
    });

    expect(captureRef.current?.isAnalyzingPhoto).toBe(false);
    expect(mockShowAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'warning',
        title: 'Kamera İzni Gerekli',
        message: expect.stringContaining('kamera izni'),
      })
    );
    expect(mockedRecognize).not.toHaveBeenCalled();
  });

  it('3. too-large: fotoğraf yükleme sınırını aştığında error alert gösterilir', async () => {
    mockedCapture.mockResolvedValue({ ok: false, reason: 'too-large', base64Length: 7000000 });

    render(<HookProbe />);

    await act(async () => {
      await captureRef.current?.handleScanPhotoBox();
    });

    expect(captureRef.current?.isAnalyzingPhoto).toBe(false);
    expect(mockShowAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        title: 'Fotoğraf İşlenemedi',
        message: expect.stringContaining('Fotoğraf çok büyük'),
      })
    );
    expect(mockedRecognize).not.toHaveBeenCalled();
  });

  it('4. read-failed: dosya okuma hatasında error alert gösterilir', async () => {
    mockedCapture.mockResolvedValue({ ok: false, reason: 'read-failed' });

    render(<HookProbe />);

    await act(async () => {
      await captureRef.current?.handleScanPhotoBox();
    });

    expect(captureRef.current?.isAnalyzingPhoto).toBe(false);
    expect(mockShowAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'error',
        title: 'Fotoğraf İşlenemedi',
      })
    );
  });

  it('5. ok: true ve OCR başarılı: form güncellenir, info alert verilir ve spinner kapatılır', async () => {
    mockedCapture.mockResolvedValue({
      ok: true,
      uri: 'file:///photo.jpg',
      base64: 'valid-base64',
      base64Length: 1000,
    });
    mockedRecognize.mockResolvedValue({
      success: true,
      name: 'Parol 500mg',
      dosage: '500mg tablet',
      form: 'tablet',
      instructions: 'tok',
    });

    render(<HookProbe />);

    await act(async () => {
      await captureRef.current?.handleScanPhotoBox();
    });

    expect(captureRef.current?.isAnalyzingPhoto).toBe(false);
    expect(captureRef.current?.formState.name).toBe('Parol 500mg');
    expect(captureRef.current?.formState.dosage).toBe('500mg tablet');
    expect(captureRef.current?.formState.medicineForm).toBe('tablet');
    expect(captureRef.current?.formState.imageUri).toBe('file:///photo.jpg');

    expect(mockShowAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'info',
        title: 'İlaç Kutusu Tanındı',
      })
    );
  });

  it('6. ok: true ama OCR ilaç kutusunu tanıyamadı: warning alert verilir ve spinner kapatılır', async () => {
    mockedCapture.mockResolvedValue({
      ok: true,
      uri: 'file:///photo.jpg',
      base64: 'valid-base64',
      base64Length: 1000,
    });
    mockedRecognize.mockResolvedValue({
      success: false,
      error: 'Net ilaç kutusu tespit edilemedi.',
    });

    render(<HookProbe />);

    await act(async () => {
      await captureRef.current?.handleScanPhotoBox();
    });

    expect(captureRef.current?.isAnalyzingPhoto).toBe(false);
    expect(mockShowAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'warning',
        title: 'Bilgi Çıkarılamadı',
      })
    );
  });

  it('7. OCR servisi exception fırlatırsa: catch bloğu spinnerı kapatır (kilitlenme önlenir)', async () => {
    mockedCapture.mockResolvedValue({
      ok: true,
      uri: 'file:///photo.jpg',
      base64: 'valid-base64',
      base64Length: 1000,
    });
    mockedRecognize.mockRejectedValue(new Error('Network disconnected'));

    render(<HookProbe />);

    await act(async () => {
      await captureRef.current?.handleScanPhotoBox();
    });

    expect(captureRef.current?.isAnalyzingPhoto).toBe(false);
  });
});
