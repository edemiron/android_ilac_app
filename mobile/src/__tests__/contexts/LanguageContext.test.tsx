/**
 * LanguageContext tests — Sprint 104.1: tab_statistics rename.
 *
 * Karol-style "Gelisim" tab label i18n dogrulamasi.
 * tr: 'Gelisim', en: 'Progress' (eski: 'Istatistikler' / 'Statistics').
 *
 * Bu test dosyasi LanguageContext modulu icindeki tr/en objelerini import edemiyor
 * (named export degil). Bunun yerine useLanguage hook'unun mock'lanmis halini kullanarak
 * provider render eden bir smoke testi yazdik; ana coverage zaten LayoutA/B testleri uzerinden
 * tr/en rendering dogrulamalariyla geliyor.
 */

import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  StyleSheet: {
    create: <T,>(s: T): T => s,
    flatten: <T,>(s: T): T => s,
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('react-native-localize', () => ({
  getLocales: () => [{ languageTag: 'tr-TR', languageCode: 'tr', isRTL: false }],
  findBestLanguageTag: () => ({ languageTag: 'tr-TR', isRTL: false }),
}));

import { LanguageProvider, useLanguage } from '../../contexts/LanguageContext';

function Probe({ testKey }: { testKey: string }) {
  const { t } = useLanguage();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <Text>{t(testKey as any)}</Text>;
}

describe('LanguageContext', () => {
  it('renders LanguageProvider without crashing', () => {
    const { UNSAFE_root } = render(
      <LanguageProvider>
        <Text>child</Text>
      </LanguageProvider>
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('tr dilinde tab_statistics "Gelisim" doner (Sprint 104.1 Karol rename)', async () => {
    const { findByText } = render(
      <LanguageProvider>
        <Probe testKey="tab_statistics" />
      </LanguageProvider>
    );
    // AsyncStorage + RNLocalize resolve olduktan sonra language='tr' set olur
    const txt = await findByText('Gelişim');
    expect(txt).toBeTruthy();
  });
});
