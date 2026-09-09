/**
 * AccountDeletionModal — v1.8.7.
 *
 * NEDEN BU TEST SONRADAN YAZILDI: v1.8.4 hesap silme akisini getirdi ve
 * `useAccountDeletion` hook'unu iyi test etti (7 test). Ama BILESEN hic test
 * edilmemisti; ozellikle "sunucu basarisiz oldu" durumunda kullaniciya
 * gerceklen bir sey GOSTERILIYOR mu sorusu hicbir yerde iddia edilmiyordu.
 *
 * Bu bosluk cihazda fark edildi: v1.8.7'de silme modali gercek cihazda
 * acildi, onay kapisi ve Turkce noktasiz-I tuzagi dogrulandi, ama hata
 * ekranini gormek icin gercek bir hesapta "Kalici Olarak Sil"e basmak
 * gerekiyordu. Tek seferlik bir ekran goruntusu yerine kalici bir iddia
 * yazmak dogru olan.
 *
 * Cihazda olculen davranis burada birebir kilitlenir:
 *   alan bos  -> dugme disabled
 *   'SIL'     -> disabled (noktasiz I, Turkce'de YANLIS kelime)
 *   'sil'     -> enabled  (kucuk harf, toLocaleUpperCase('tr-TR') ile 'SİL')
 */

import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  __esModule: true,
  View: 'View',
  Text: 'Text',
  Modal: 'Modal',
  ScrollView: 'ScrollView',
  TouchableOpacity: 'TouchableOpacity',
  ActivityIndicator: 'ActivityIndicator',
  TextInput: 'TextInput',
  StyleSheet: {
    create: <T,>(s: T): T => s,
    flatten: <T,>(s: T): T => s,
    hairlineWidth: 1,
  },
  Platform: { OS: 'android', select: (o: Record<string, unknown>) => o.android ?? o.default },
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

import { mockUseTheme } from '../../helpers/themeMock';

jest.mock('../../../contexts/ThemeContext', () => ({
  ...(jest.requireActual('../../../contexts/ThemeContext') as object),
  useTheme: () => mockUseTheme(),
}));

jest.mock('../../../contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'tr' }),
}));

import { AccountDeletionModal } from '../../../components/settings/AccountDeletionModal';
import { isDeletionConfirmed, DELETED_DATA_ITEMS } from '../../../domain/accountDeletion';

const baseProps = {
  visible: true,
  phase: 'idle' as const,
  errorMessage: null as string | null,
  confirmationInput: '',
  canDelete: false,
  onChangeConfirmation: jest.fn(),
  onConfirm: jest.fn(),
  onCancel: jest.fn(),
};

/** Ekrandaki "Kalıcı Olarak Sil" dugmesinin devre disi olup olmadigi. */
function deleteButtonDisabled(tree: ReturnType<typeof render>): boolean {
  const label = tree.getByText('Kalıcı Olarak Sil');
  // Metin -> onu saran TouchableOpacity
  let node: typeof label.parent = label.parent;
  while (node && node.props?.accessibilityState === undefined) {
    node = node.parent;
  }
  return Boolean(node?.props?.accessibilityState?.disabled);
}

describe('AccountDeletionModal', () => {
  afterEach(() => jest.clearAllMocks());

  it('gizliyken HICBIR SEY kurmuyor (useTheme bile cagrilmaz)', () => {
    const { toJSON } = render(<AccountDeletionModal {...baseProps} visible={false} />);

    expect(toJSON()).toBeNull();
  });

  it('silinecek TUM kalemleri tek tek sayiyor (KVKK somutluk)', () => {
    const tree = render(<AccountDeletionModal {...baseProps} />);

    // "tum verileriniz" demek yeterli degil; her kalem ekranda olmali.
    for (const item of DELETED_DATA_ITEMS.tr) {
      expect(tree.getByText(item)).toBeTruthy();
    }
    expect(DELETED_DATA_ITEMS.tr.length).toBe(6);
  });

  it('geri alinamazligi acikca yaziyor', () => {
    const tree = render(<AccountDeletionModal {...baseProps} />);

    expect(tree.getByText(/GERİ ALINAMAZ/)).toBeTruthy();
  });

  it('onay kelimesi yazilmadan silme dugmesi DEVRE DISI', () => {
    const tree = render(<AccountDeletionModal {...baseProps} canDelete={false} />);

    expect(deleteButtonDisabled(tree)).toBe(true);
  });

  it('onay dogru oldugunda dugme ETKIN', () => {
    const tree = render(<AccountDeletionModal {...baseProps} confirmationInput="sil" canDelete />);

    expect(deleteButtonDisabled(tree)).toBe(false);
  });

  /**
   * Cihazda olculen tabloyu koda baglar. `canDelete` prop'u
   * `isDeletionConfirmed`'den geliyor (bkz. useAccountDeletion), o yuzden
   * ikisini birlikte iddia etmek zinciri butun olarak kilitler.
   */
  it.each([
    ['SIL', false, 'noktasiz I — Turkce SİL degil'],
    ['sil', true, 'kucuk harf — tr-TR buyutmesi SİL verir'],
    ['SİL', true, 'birebir'],
    [' sil ', true, 'bosluk kirpilir'],
    ['SILL', false, 'fazla harf'],
    ['', false, 'bos'],
  ])('Turkce onay kapisi: %s -> %s (%s)', (input, expected) => {
    expect(isDeletionConfirmed(input, 'tr')).toBe(expected);

    const tree = render(
      <AccountDeletionModal
        {...baseProps}
        confirmationInput={input}
        canDelete={isDeletionConfirmed(input, 'tr')}
      />
    );
    expect(deleteButtonDisabled(tree)).toBe(!expected);
  });

  /**
   * ASIL BOSLUK: sunucu basarisiz oldugunda kullanici NE goruyor?
   * `useAccountDeletion` bu durumda phase='error' + Turkce bir mesaj
   * donduruyor ve YEREL VERIYI SILMIYOR. Mesaj ekranda gorunmezse
   * kullanici hicbir sey olmamis sanar ve tekrar tekrar basar.
   */
  it('sunucu basarisiz olunca hata mesaji EKRANDA gorunur ve modal ACIK kalir', () => {
    const message =
      'Hesabınız silinemedi. Verilerinize hâlâ erişebiliyorsunuz. İnternet bağlantınızı kontrol edip tekrar deneyin.';

    const tree = render(
      <AccountDeletionModal
        {...baseProps}
        phase="error"
        errorMessage={message}
        confirmationInput="sil"
        canDelete
      />
    );

    expect(tree.getByText(message)).toBeTruthy();
    // Modal kapanmadi: onay alani ve dugmeler hala orada.
    expect(tree.getByText('Kalıcı Olarak Sil')).toBeTruthy();
    expect(tree.getByText('Vazgeç')).toBeTruthy();
    // Ve tekrar denenebilir — dugme etkin kaldi.
    expect(deleteButtonDisabled(tree)).toBe(false);
  });

  it('silme surerken HER IKI dugme de devre disi (iptal edilemez bir isi iptal edilebilir gostermeyiz)', () => {
    const tree = render(
      <AccountDeletionModal {...baseProps} phase="deleting" confirmationInput="sil" canDelete />
    );

    // "Kalıcı Olarak Sil" metni yerine ActivityIndicator var; Vazgec disabled.
    const cancel = tree.getByText('Vazgeç');
    let node: typeof cancel.parent = cancel.parent;
    while (node && node.props?.accessibilityState === undefined) {
      node = node.parent;
    }
    expect(node?.props?.accessibilityState?.disabled).toBe(true);
    expect(tree.queryByText('Kalıcı Olarak Sil')).toBeNull();
  });
});
