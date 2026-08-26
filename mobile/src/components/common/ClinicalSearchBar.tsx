import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import { radius, spacing } from '../../theme/tokens';

export interface ClinicalSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function ClinicalSearchBar({
  value,
  onChangeText,
  placeholder = 'İlaç veya etken madde ara...',
  onClear,
  style,
  testID,
}: ClinicalSearchBarProps) {
  const { colors, isDark } = useTheme();

  const handleClear = () => {
    onChangeText('');
    if (onClear) onClear();
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? colors.surfaceContainer : '#F1F5F9',
          borderColor: isDark ? colors.border : '#E2E8F0',
        },
        style,
      ]}
      testID={testID}
    >
      <Ionicons
        name="search-outline"
        size={20}
        color={colors.textSecondary}
        style={styles.searchIcon}
      />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        style={[
          styles.input,
          {
            color: colors.text,
          },
        ]}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {value.length > 0 && (
        <TouchableOpacity
          onPress={handleClear}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.clearButton}
          activeOpacity={0.7}
        >
          <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill, // 999 pill shape as in design
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    minHeight: 46,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: spacing.xs,
  },
});
