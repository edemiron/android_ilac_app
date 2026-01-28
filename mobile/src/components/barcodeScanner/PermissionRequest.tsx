import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { scannerStyles, permissionStyles } from './styles';
import { PermissionRequestProps } from './types';

interface LoadingStateProps {
  isLoading: true;
}

type Props = PermissionRequestProps | LoadingStateProps;

function isLoading(props: Props): props is LoadingStateProps {
  return 'isLoading' in props && props.isLoading === true;
}

export function PermissionRequest(props: Props) {
  const { colors } = useTheme();

  if (isLoading(props)) {
    return (
      <View style={[scannerStyles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const { onRequestPermission, permissionText } = props;

  return (
    <View style={[scannerStyles.container, { backgroundColor: colors.background }]}>
      <Text style={[permissionStyles.text, { color: colors.text }]}>
        {permissionText}
      </Text>
      <TouchableOpacity
        style={[permissionStyles.button, { backgroundColor: colors.primary }]}
        onPress={onRequestPermission}
      >
        <Text style={permissionStyles.buttonText}>Izin Ver</Text>
      </TouchableOpacity>
    </View>
  );
}
