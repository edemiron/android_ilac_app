/**
 * react-native-vector-icons type declaration.
 *
 * Sprint 9.2: pre-existing TS hata duzeltmesi.
 * 'Ionicons' / 'MaterialCommunityIcons' gibi modulleri icin type
 * declaration. @types/react-native-vector-icons paketi proje
 * bagimliligi olarak eklenmedi — local declaration dosyasi yeterli.
 *
 * v1.8.7 — ERISILEBILIRLIK PROP'LARI EKLENDI.
 * Bu stub yalnizca `name/size/color/style` tanimliyordu. Ikon bilesenleri
 * calisma zamaninda `<Text>` uzerine kuruludur ve React Native'in butun
 * erisilebilirlik prop'larini KABUL EDER; tip eksikligi yuzunden
 * `accessibilityElementsHidden` yazmak tsc hatasi veriyordu.
 *
 * Bu sadece kolaylik degil, gerekli: dekoratif bir ikonu ekran
 * okuyucudan gizlemenin yolu bu prop'lar. Onlar olmadan TalkBack, ustundeki
 * metnin yaninda ikonu da bir dugum olarak duyuruyor (ya da ikon fontu
 * glifini okumaya calisiyor — bkz. v1.8.7 erisilebilir ad kusuru).
 *
 * `AccessibilityProps` dogrudan react-native'den aliniyor; elle liste
 * yazmak, ayni gercegi ikinci kez yazmak olurdu.
 */

declare module 'react-native-vector-icons/Ionicons' {
  import { ComponentType } from 'react';
  import { TextStyle, StyleProp, AccessibilityProps } from 'react-native';

  export interface IconProps extends AccessibilityProps {
    name: string;
    size?: number;
    color?: string;
    style?: StyleProp<TextStyle>;
  }

  const Icon: ComponentType<IconProps>;
  export default Icon;
}

declare module 'react-native-vector-icons/MaterialCommunityIcons' {
  import { ComponentType } from 'react';
  import { TextStyle, StyleProp, AccessibilityProps } from 'react-native';

  export interface IconProps extends AccessibilityProps {
    name: string;
    size?: number;
    color?: string;
    style?: StyleProp<TextStyle>;
  }

  const Icon: ComponentType<IconProps>;
  export default Icon;
}
