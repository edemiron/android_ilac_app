/**
 * Hesap silme akışının SIRA garantisi.
 *
 * Bu dosyanın var olma sebebi tek bir cümle: **sunucu başarısız olursa
 * yerel veri SİLİNMEMELİ.** Tersi, kullanıcıyı olabilecek en kötü
 * bileşimde bırakır — elindeki kopya gitmiş, buluttaki her şey duruyor,
 * ve ekranda "hesabınız silindi" yazıyor.
 *
 * Ayrıca: onay kelimesi yazılmadan `deleteAccountAndData()` çağrılırsa
 * hiçbir şey olmamalı. Düğme `disabled` olsa da fonksiyon doğrudan
 * çağrılabilir (test, gelecekteki bir kısayol, bir kod yolu hatası); yıkıcı
 * bir işlemin tek savunması arayüz olamaz.
 */

import React from 'react';
import { Text } from 'react-native';
import { render, act, waitFor } from '@testing-library/react-native';

import { useAccountDeletion } from '../../hooks/useAccountDeletion';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
}));

const mockRequestServerAccountDeletion = jest.fn();
jest.mock('../../services/accountDeletionService', () => ({
  requestServerAccountDeletion: (...args: unknown[]) => mockRequestServerAccountDeletion(...args),
}));

const mockClearAllData = jest.fn();
jest.mock('../../stores/medicineStore', () => ({
  useMedicineStore: (selector: (state: unknown) => unknown) =>
    selector({ clearAllData: mockClearAllData }),
}));

type Harness = ReturnType<typeof useAccountDeletion>;

let captured: Harness;

function Probe({ onDeleted }: { onDeleted: () => Promise<void> | void }) {
  captured = useAccountDeletion({ language: 'tr', onDeleted });
  return <Text>{captured.phase}</Text>;
}

describe('useAccountDeletion', () => {
  let onDeleted: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestServerAccountDeletion.mockResolvedValue({ success: true });
    mockClearAllData.mockResolvedValue(undefined);
    onDeleted = jest.fn().mockResolvedValue(undefined);
  });

  it('onay kelimesi yazilmadan HICBIR SEY yapmaz', async () => {
    render(<Probe onDeleted={onDeleted} />);

    expect(captured.canDelete).toBe(false);

    await act(async () => {
      await captured.deleteAccountAndData();
    });

    expect(mockRequestServerAccountDeletion).not.toHaveBeenCalled();
    expect(mockClearAllData).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
    expect(captured.phase).toBe('idle');
  });

  it('yanlis onay kelimesi de yetmez', async () => {
    render(<Probe onDeleted={onDeleted} />);

    await act(async () => {
      captured.setConfirmationInput('SI');
    });
    expect(captured.canDelete).toBe(false);

    await act(async () => {
      await captured.deleteAccountAndData();
    });

    expect(mockRequestServerAccountDeletion).not.toHaveBeenCalled();
  });

  it('dogru onayla: SUNUCU -> YEREL -> CIKIS sirasiyla ilerler', async () => {
    const order: string[] = [];
    mockRequestServerAccountDeletion.mockImplementation(async () => {
      order.push('server');
      return { success: true };
    });
    mockClearAllData.mockImplementation(async () => {
      order.push('local');
    });
    onDeleted.mockImplementation(async () => {
      order.push('signout');
    });

    render(<Probe onDeleted={onDeleted} />);

    await act(async () => {
      captured.setConfirmationInput('SİL');
    });
    expect(captured.canDelete).toBe(true);

    await act(async () => {
      await captured.deleteAccountAndData();
    });

    expect(order).toEqual(['server', 'local', 'signout']);
    await waitFor(() => expect(captured.phase).toBe('done'));
  });

  it('yerel temizleme BULUTU tekrar silmeye CALISMAZ', async () => {
    // Bulut adim 1'de silindi. `deleteFromCloud: true` gecmek, artik var
    // olmayan bir kimlikle Firestore'a yazma denemesi olurdu.
    render(<Probe onDeleted={onDeleted} />);

    await act(async () => {
      captured.setConfirmationInput('sil');
    });
    await act(async () => {
      await captured.deleteAccountAndData();
    });

    expect(mockClearAllData).toHaveBeenCalledWith({ deleteFromCloud: false });
  });

  it('SUNUCU BASARISIZ olursa yerel veri KORUNUR ve cikis yapilmaz', async () => {
    mockRequestServerAccountDeletion.mockRejectedValue(new Error('network'));

    render(<Probe onDeleted={onDeleted} />);

    await act(async () => {
      captured.setConfirmationInput('SİL');
    });
    await act(async () => {
      await captured.deleteAccountAndData();
    });

    // EN ONEMLI IDDIA.
    expect(mockClearAllData).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();

    expect(captured.phase).toBe('error');
    expect(captured.errorMessage).toBeTruthy();
    // Kullaniciya verisinin HALA ERISILEBILIR oldugu soylenmeli.
    expect(captured.errorMessage).toMatch(/erişebiliyorsunuz/i);
  });

  it('yerel temizleme cokerse akis YINE tamamlanir', async () => {
    // Sunucudaki veri gitti; kullaniciya "silinemedi" demek YANLIS olurdu.
    mockClearAllData.mockRejectedValue(new Error('storage'));

    render(<Probe onDeleted={onDeleted} />);

    await act(async () => {
      captured.setConfirmationInput('SİL');
    });
    await act(async () => {
      await captured.deleteAccountAndData();
    });

    expect(onDeleted).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(captured.phase).toBe('done'));
    expect(captured.errorMessage).toBeNull();
  });

  it('reset onay girdisini ve hatayi temizler', async () => {
    mockRequestServerAccountDeletion.mockRejectedValue(new Error('network'));

    render(<Probe onDeleted={onDeleted} />);

    await act(async () => {
      captured.setConfirmationInput('SİL');
    });
    await act(async () => {
      await captured.deleteAccountAndData();
    });
    expect(captured.phase).toBe('error');

    await act(async () => {
      captured.reset();
    });

    expect(captured.phase).toBe('idle');
    expect(captured.errorMessage).toBeNull();
    expect(captured.confirmationInput).toBe('');
    expect(captured.canDelete).toBe(false);
  });
});
