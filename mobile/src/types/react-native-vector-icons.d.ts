/**
 * react-native-vector-icons type declaration.
 *
 * Sprint 9.2: pre-existing TS hata duzeltmesi.
 * 'Ionicons' / 'MaterialCommunityIcons' gibi modulleri icin type
 * declaration. @types/react-native-vector-icons paketi proje
 * bagimliligi olarak eklenmedi — local declaration dosyasi yeterli.
 */

declare module 'react-native-vector-icons/Ionicons' {
  import { ComponentType } from 'react';
  import { TextStyle, StyleProp } from 'react-native';

  export interface IconProps {
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
  import { TextStyle, StyleProp } from 'react-native';

  export interface IconProps {
    name: string;
    size?: number;
    color?: string;
    style?: StyleProp<TextStyle>;
  }

  const Icon: ComponentType<IconProps>;
  export default Icon;
}
