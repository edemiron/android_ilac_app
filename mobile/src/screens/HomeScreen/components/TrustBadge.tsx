/**
 * TrustBadge.tsx — Sprint 98 Karol-inspired redesign.
 *
 * Karol'ün sağ alt köşedeki "KOLAY HIZLI GÜVENLİ" floating badge'inin
 * İlaç Hatırlatıcı uyarlaması: "ANLIK · SESSİZ · GÜVENLİ".
 *
 * Position: absolute, bottom: 100, right: 16 — CustomTabBar FAB ile çakışmaz.
 * MotiPressable ile sarılı: basıldığında "Hakkında" alert gösterir.
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Alert, type StyleProp, type ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { MotiView } from 'moti';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { MotiPressable } from '../../../components/common/MotiPressable';
import { motiTransitions } from '../../../theme/moti-config';

export interface TrustBadgeProps {
  /** Custom pozisyon override (test/özel kullanım). */
  bottom?: number;
  right?: number;
  /** Container stili override. */
  style?: StyleProp<ViewStyle>;
}

export function TrustBadge({ bottom = 100, right = 16, style }: TrustBadgeProps) {
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();

  const gradientColors = isDark
    ? [colors.primaryDark ?? '#6B7CDF', colors.gradientEnd]
    : [colors.gradientStart, colors.gradientEnd];

  const onPress = useCallback(() => {
    Alert.alert(
      language === 'tr' ? 'Hatırlatıcı' : 'Reminder',
      language === 'tr'
        ? 'İlaç Hatırlatıcı; anlık bildirim, sessiz çalışma ve güvenli veri saklama özellikleri sunar.'
        : 'Medicine Reminder offers instant notifications, silent operation, and secure data storage.'
    );
  }, [language]);

  return (
    <View style={[styles.wrapper, { bottom, right }, style]} pointerEvents="box-none">
      {/* Sprint 100: mount slide-in from right (FAB ile çakışmadan yumuşak giriş) */}
      <MotiView
        from={{ opacity: 0, translateX: 24 }}
        animate={{ opacity: 1, translateX: 0 }}
        transition={motiTransitions.standard}
      >
        <MotiPressable
          onPress={onPress}
          onPressHaptic="light"
          scaleTo={0.95}
          accessibilityRole="button"
          accessibilityLabel={
            language === 'tr'
              ? 'Anlık, Sessiz, Güvenli. Bilgi için dokunun.'
              : 'Instant, Silent, Safe. Tap for info.'
          }
        >
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.badge}
          >
            <View style={styles.iconBox}>
              <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
            </View>
            <View style={styles.textGroup}>
              <Text style={styles.line} numberOfLines={1}>
                {language === 'tr' ? 'ANLIK' : 'INSTANT'}
              </Text>
              <Text style={styles.line} numberOfLines={1}>
                {language === 'tr' ? 'SESSİZ' : 'SILENT'}
              </Text>
              <Text style={styles.line} numberOfLines={1}>
                {language === 'tr' ? 'GÜVENLİ' : 'SAFE'}
              </Text>
            </View>
          </LinearGradient>
        </MotiPressable>
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    zIndex: 5,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 8,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  textGroup: {
    alignItems: 'flex-start',
  },
  line: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    lineHeight: 13,
  },
});
