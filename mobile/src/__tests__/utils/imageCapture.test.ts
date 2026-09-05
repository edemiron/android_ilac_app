/**
 * imageCapture — AI gorsel yakalama akisinin davranis testleri (v1.9.1).
 *
 * Bu testler SEKIL degil DAVRANIS pinliyor: "picker'a hangi secenekler
 * gecildi" ve "hangi durumda ne dondu". Ozellikle `base64: true`nin
 * GECILMEDIGI ayrica dogrulaniyor — hatanin kok nedeni oydu.
 */

import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';

import {
  captureImageForAI,
  captureFailureMessage,
  exceedsUploadLimit,
  MAX_UPLOAD_BASE64_CHARS,
  CAPTURE_QUALITY,
} from '../../utils/imageCapture';

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

const mockBase64 = jest.fn<Promise<string>, []>();

jest.mock('expo-file-system', () => ({
  File: jest.fn(),
}));

const picker = ImagePicker as jest.Mocked<typeof ImagePicker>;
const FileMock = File as unknown as jest.Mock;

const asset = (uri = 'file:///photo.jpg') => ({
  canceled: false as const,
  assets: [{ uri }],
});

beforeEach(() => {
  jest.clearAllMocks();
  mockBase64.mockResolvedValue('AAAA');
  FileMock.mockImplementation(() => ({ base64: mockBase64 }));
  picker.requestCameraPermissionsAsync.mockResolvedValue({ granted: true } as never);
  picker.launchCameraAsync.mockResolvedValue(asset() as never);
  picker.launchImageLibraryAsync.mockResolvedValue(asset() as never);
});

describe('captureImageForAI — picker secenekleri', () => {
  it('kameraya ASLA base64: true gecmez', async () => {
    await captureImageForAI('camera');

    expect(picker.launchCameraAsync).toHaveBeenCalledTimes(1);
    const options = picker.launchCameraAsync.mock.calls[0][0] ?? {};
    expect(options.base64).toBeUndefined();
  });

  it('galeriye ASLA base64: true gecmez', async () => {
    await captureImageForAI('library');

    expect(picker.launchImageLibraryAsync).toHaveBeenCalledTimes(1);
    const options = picker.launchImageLibraryAsync.mock.calls[0][0] ?? {};
    expect(options.base64).toBeUndefined();
  });

  it('her iki kaynakta da ayni kaliteyi kullanir', async () => {
    await captureImageForAI('camera');
    await captureImageForAI('library');

    expect(picker.launchCameraAsync.mock.calls[0][0]?.quality).toBe(CAPTURE_QUALITY);
    expect(picker.launchImageLibraryAsync.mock.calls[0][0]?.quality).toBe(CAPTURE_QUALITY);
  });

  it('base64 kodlamayi picker DONDUKTEN SONRA yapar', async () => {
    const order: string[] = [];
    picker.launchCameraAsync.mockImplementation(async () => {
      order.push('picker');
      return asset() as never;
    });
    mockBase64.mockImplementation(async () => {
      order.push('encode');
      return 'AAAA';
    });

    await captureImageForAI('camera');

    expect(order).toEqual(['picker', 'encode']);
  });
});

describe('captureImageForAI — izin', () => {
  it('kamera izni yoksa picker acilmaz', async () => {
    picker.requestCameraPermissionsAsync.mockResolvedValue({ granted: false } as never);

    const result = await captureImageForAI('camera');

    expect(result).toEqual({ ok: false, reason: 'permission-denied' });
    expect(picker.launchCameraAsync).not.toHaveBeenCalled();
  });

  it('galeri icin kamera izni istemez', async () => {
    await captureImageForAI('library');

    expect(picker.requestCameraPermissionsAsync).not.toHaveBeenCalled();
  });
});

describe('captureImageForAI — sonuclar', () => {
  it('basarili yakalamada uri ve base64 doner', async () => {
    mockBase64.mockResolvedValue('QUJD');

    const result = await captureImageForAI('camera');

    expect(result).toEqual({
      ok: true,
      uri: 'file:///photo.jpg',
      base64: 'QUJD',
      base64Length: 4,
    });
  });

  it('kullanici vazgecerse cancelled doner ve dosya okunmaz', async () => {
    picker.launchCameraAsync.mockResolvedValue({ canceled: true, assets: null } as never);

    const result = await captureImageForAI('camera');

    expect(result).toEqual({ ok: false, reason: 'cancelled' });
    expect(FileMock).not.toHaveBeenCalled();
  });

  it('asset yoksa no-image doner', async () => {
    picker.launchCameraAsync.mockResolvedValue({ canceled: false, assets: [] } as never);

    const result = await captureImageForAI('camera');

    expect(result).toEqual({ ok: false, reason: 'no-image' });
  });

  it('dosya okunamazsa read-failed doner (patlamaz)', async () => {
    mockBase64.mockRejectedValue(new Error('EACCES'));

    const result = await captureImageForAI('camera');

    expect(result).toEqual({ ok: false, reason: 'read-failed' });
  });

  it('bos base64 read-failed sayilir', async () => {
    mockBase64.mockResolvedValue('');

    const result = await captureImageForAI('camera');

    expect(result).toEqual({ ok: false, reason: 'read-failed' });
  });

  it('sinirin ustundeki gorseli SUNUCUYA GONDERMEDEN reddeder', async () => {
    const oversized = 'A'.repeat(MAX_UPLOAD_BASE64_CHARS + 1);
    mockBase64.mockResolvedValue(oversized);

    const result = await captureImageForAI('camera');

    expect(result).toEqual({
      ok: false,
      reason: 'too-large',
      base64Length: oversized.length,
    });
  });

  it('picker patlarsa read-failed doner (patlamaz)', async () => {
    picker.launchCameraAsync.mockRejectedValue(new Error('activity died'));

    const result = await captureImageForAI('camera');

    expect(result).toEqual({ ok: false, reason: 'read-failed' });
  });
});

describe('exceedsUploadLimit', () => {
  it('sinirin tam ustunu reddeder, sinirin kendisini kabul eder', () => {
    expect(exceedsUploadLimit(MAX_UPLOAD_BASE64_CHARS)).toBe(false);
    expect(exceedsUploadLimit(MAX_UPLOAD_BASE64_CHARS + 1)).toBe(true);
  });

  it('sunucu sinirinin (8 MB) altinda kalir', () => {
    expect(MAX_UPLOAD_BASE64_CHARS).toBeLessThan(8 * 1024 * 1024);
  });
});

describe('captureFailureMessage', () => {
  it('iptalde mesaj URETMEZ (kullaniciya uyari gosterilmemeli)', () => {
    expect(captureFailureMessage('cancelled', 'tr')).toBeNull();
    expect(captureFailureMessage('cancelled', 'en')).toBeNull();
  });

  it.each(['permission-denied', 'too-large', 'no-image', 'read-failed'] as const)(
    '%s icin iki dilde de mesaj uretir',
    reason => {
      expect(captureFailureMessage(reason, 'tr')).toBeTruthy();
      expect(captureFailureMessage(reason, 'en')).toBeTruthy();
    }
  );

  it('cok buyuk gorselde kullaniciya NE YAPACAGINI soyler', () => {
    expect(captureFailureMessage('too-large', 'tr')).toMatch(/uzaktan|yakınlaştır/i);
  });
});
