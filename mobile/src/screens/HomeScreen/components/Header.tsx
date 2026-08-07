/**
 * Header.tsx — Sprint 98 Karol-inspired redesign.
 *
 * Karol tasarımındaki gradient hero header'ın İlaç Hatırlatıcı uyarlaması.
 * LinearGradient + greeting + dynamic date + inline progress bar + streak chip.
 *
 * CircularProgress (70px SVG) kaldırıldı; yerine 4pt inline progress bar.
 * Streak chip currentStreak > 0 ise sağ üstte gösterilir.
 */

import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { MotiView } from 'moti';
import { useTheme } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { motiTransitions } from '../../../theme/moti-config';

export interface HeaderProps {
  /** Selamlama metni ("Merhaba, Ahmet" veya sadece "Günaydın"). */
  greeting: string;
  /** Tarih metni ("Bugün", "12 Ağustos Pazartesi"). */
  dynamicDate: string;
  /** Bugünkü toplam doz sayısı. */
  totalDoses: number;
  /** Alınan doz sayısı (progress hesabı için). */
  completedCount: number;
  /** Üst üste tamamlanan gün sayısı. 0 ise streak chip gösterilmez. */
  currentStreak: number;
  /** Dış container stili (margin vb.). */
  style?: StyleProp<ViewStyle>;
}

export function Header({
  greeting,
  dynamicDate,
  totalDoses,
  completedCount,
  currentStreak,
  style,
}: HeaderProps) {
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();

  const progressPercent =
    totalDoses > 0 ? Math.min(100, Math.round((completedCount / totalDoses) * 100)) : 0;

  const showStreak = currentStreak > 0;
  const gradientColors = isDark
    ? [colors.primaryDark ?? '#6B7CDF', colors.gradientEnd]
    : [colors.gradientStart, colors.gradientEnd];

  return (
    // Sprint 100: mount fade + slide-down (gradient hero yumuşak giriş)
    <MotiView
      from={{ opacity: 0, translateY: -8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={motiTransitions.standard}
      style={style}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        {/* Streak chip — sağ üstte */}
        {showStreak && (
          <View style={styles.streakChip} accessibilityLabel={`Streak ${currentStreak}`}>
            <Ionicons name="flame" size={14} color="#FFFFFF" />
            <Text style={styles.streakChipText}>
              {currentStreak} {language === 'tr' ? 'gün' : 'days'}
            </Text>
          </View>
        )}

        {/* Greeting */}
        <Text style={styles.greeting} numberOfLines={1}>
          {greeting}
        </Text>

        {/* Dynamic date + doz sayısı */}
        <Text style={styles.subtitle} numberOfLines={1}>
          {dynamicDate} · {totalDoses} {language === 'tr' ? 'doz planı' : 'doses'}
        </Text>

        {/* Inline progress bar */}
        <View style={styles.progressTrack} accessibilityLabel={`Adherence ${progressPercent} percent`}>
          <View
            style={[
              styles.progressFill,
              { width: `${progressPercent}%` },
            ]}
          />
        </View>
        <Text style={styles.progressLabel}>
          {progressPercent}% {language === 'tr' ? 'uyum' : 'adherence'}
        </Text>
      </LinearGradient>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
  },
  streakChip: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  streakChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  greeting: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginRight: 80, // streak chip için alan
  },
  subtitle: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    marginTop: 4,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginTop: 14,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
  },
  progressLabel: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
});
