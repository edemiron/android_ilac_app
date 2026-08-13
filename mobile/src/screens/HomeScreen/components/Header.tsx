/**
 * Header.tsx — Sprint 107.1 HeroCard migration.
 *
 * HomeScreen üstündeki gradient hero header. HeroCard primitive'i (Sprint 107.1)
 * kullanarak LinearGradient + avatar + streak chip + progress bar'ı tek API'de
 * birleştirir.
 *
 * Sprint 100: mount fade + slide-down animasyonu MotiView ile korunur.
 * Sprint 102.3: gradient içi text/icon token adoption korunur.
 * Sprint 104.4: UserAvatar sol üst korunur.
 *
 * Davranış: önceki Header.tsx ile birebir (görsel: padding 16→gradient default,
 * radius 20→HeroCard radius.xl aynı, shadow HeroCard elevation.level2).
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { MotiView } from 'moti';
import { useTheme, type ThemeColors } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { motiTransitions } from '../../../theme/moti-config';
import { HeroCard } from '../../../components/common/HeroCard';
import { UserAvatar } from './UserAvatar';

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
  /** Sprint 104.4: Kullanici displayName (AuthContext) — UserAvatar icin. */
  displayName?: string;
  /** Dış container stili (margin vb.). */
  style?: StyleProp<ViewStyle>;
}

export function Header({
  greeting,
  dynamicDate,
  totalDoses,
  completedCount,
  currentStreak,
  displayName,
  style,
}: HeaderProps) {
  const { colors } = useTheme();
  const { language } = useLanguage();

  const progressPercent =
    totalDoses > 0 ? Math.min(100, Math.round((completedCount / totalDoses) * 100)) : 0;

  const showStreak = currentStreak > 0;
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Subtitle: dynamicDate + doz sayısı — HeroCard subtitle slot
  const subtitle = `${dynamicDate} · ${totalDoses} ${language === 'tr' ? 'doz planı' : 'doses'}`;

  // UserAvatar — HeroCard icon slot (leading)
  const avatar = displayName ? <UserAvatar displayName={displayName} size={36} /> : undefined;

  // Streak chip — HeroCard trailing slot
  const streakChip = showStreak ? (
    <View style={styles.streakChip} accessibilityLabel={`Streak ${currentStreak}`}>
      <Ionicons name="flame" size={14} color="#FFFFFF" />
      <Text style={styles.streakChipText}>
        {currentStreak} {language === 'tr' ? 'gün' : 'days'}
      </Text>
    </View>
  ) : undefined;

  return (
    // Sprint 100: mount fade + slide-down (gradient hero yumuşak giriş)
    <MotiView
      from={{ opacity: 0, translateY: -8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={motiTransitions.standard}
      style={style}
    >
      <HeroCard
        variant="header"
        title={greeting}
        subtitle={subtitle}
        icon={avatar}
        trailing={streakChip}
        accessibilityLabel={`${greeting}, ${progressPercent}% ${language === 'tr' ? 'uyum' : 'adherence'}`}
        style={styles.headerOuter}
      >
        {/* Progress bar + label — HeroCard children slot */}
        <View
          style={styles.progressTrack}
          accessibilityLabel={`Adherence ${progressPercent} percent`}
        >
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>
        <Text style={styles.progressLabel}>
          {progressPercent}% {language === 'tr' ? 'uyum' : 'adherence'}
        </Text>
      </HeroCard>
    </MotiView>
  );
}

/**
 * makeStyles — Sprint 102.3 + 107.1
 * HeroCard primitive sarmaladığı için sadece dış margin + progress bar
 * gradient-içi token adoption stilleri korunur.
 */
const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    headerOuter: {
      marginHorizontal: 16,
      marginTop: 6,
    },
    streakChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: colors.gradientTrackTint,
    },
    streakChipText: {
      color: colors.textOnGradient,
      fontSize: 12,
      fontWeight: '700',
    },
    progressTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.gradientTrackTint,
      marginTop: 14,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.textOnGradient,
      borderRadius: 3,
    },
    progressLabel: {
      color: colors.textOnGradientMuted,
      fontSize: 12,
      fontWeight: '600',
      marginTop: 6,
    },
  });