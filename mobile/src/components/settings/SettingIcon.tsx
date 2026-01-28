import React from 'react';
import { View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SettingIconProps } from './types';

export const SettingIcon: React.FC<SettingIconProps> = ({ name, color, size = 22 }) => (
  <View
    style={{
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: color + '20',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    }}
  >
    <Ionicons name={name} size={size} color={color} />
  </View>
);
