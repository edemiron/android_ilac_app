import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { MotiView } from 'moti';
import { useTheme, type ThemeColors } from '../../../contexts/ThemeContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { motiTransitions } from '../../../theme/moti-config';
import { CircularProgress } from '../../../components/common/CircularProgress';
import { UserAvatar } from './UserAvatar';

export interface HeaderProps {
  /** Selamlama metni ("Merhaba, Ahmet" veya sadece "Günaydın"). */
  greeting: string;
  /** Tarih metni ("Bugün", "12 Ağustos Pazartesi"). */
  dynamicDate?: string;
  /** Bugünkü toplam doz sayısı. */
  totalDoses: number;
  /** Alınan doz sayısı (progress hesabı için). */
  completedCount: number;
  /** Üst üste tamamlanan gün sayısı. 0 ise streak chip gösterilmez. */
  currentStreak?: number;
  /** Kullanıcı adı (Sarah, Ahmet vs.). */
  displayName?: string;
  /** Avatar / Profil tıklandığında çalışacak callback (Ayarlar). */
  onAvatarPress?: () => void;
  /** Bildirim ikonuna tıklandığında çalışacak callback. */
  onNotificationPress?: () => void;
  /** Ayarlar ikonuna tıklandığında çalışacak callback. */
  onSettingsPress?: () => void;
  /** Bakıcı / Caregiver ikonuna tıklandığında çalışacak callback. */
  onCaregiverPress?: () => void;
  /** Dış container stili (margin vb.). */
  style?: StyleProp<ViewStyle>;
}

export function Header({
  greeting,
  dynamicDate,
  totalDoses,
  completedCount,
  currentStreak = 0,
  displayName,
  onAvatarPress,
  onNotificationPress,
  onSettingsPress,
  onCaregiverPress,
  style,
}: HeaderProps) {
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();

  const progressPercent =
    totalDoses > 0 ? Math.min(100, Math.round((completedCount / totalDoses) * 100)) : 0;

  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark]);

  // Clean greeting line: e.g. "Günaydın, Sarah 👋" or "İyi akşamlar, Misafir 👋"
  const greetingText = useMemo(() => {
    const rawGreeting = greeting.trim();
    if (rawGreeting.endsWith('👋')) {
      return rawGreeting;
    }
    if (rawGreeting.includes(',')) {
      return `${rawGreeting} 👋`;
    }
    const name = displayName?.trim();
    if (!name || name.toLowerCase().includes('guest') || name.toLowerCase().includes('misafir')) {
      return `${rawGreeting} 👋`;
    }
    return `${rawGreeting}, ${name.split(' ')[0]} 👋`;
  }, [greeting, displayName]);

  return (
    <MotiView
      from={{ opacity: 0, translateY: -8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={motiTransitions.standard}
      style={[styles.container, style]}
    >
      {/* 1. Top Bar: Avatar + Greeting + Action Buttons (Caregiver + Bell + Settings) */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.topLeft}
          onPress={onAvatarPress || onSettingsPress}
          activeOpacity={0.75}
          accessibilityLabel="Profile"
        >
          <UserAvatar displayName={displayName || 'Sarah'} size={42} />
          <Text style={styles.greetingTitle} numberOfLines={1}>
            {greetingText}
          </Text>
        </TouchableOpacity>

        <View style={styles.topRightActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onCaregiverPress}
            activeOpacity={0.7}
            accessibilityLabel={language === 'tr' ? 'Bakıcı Takibi' : 'Caregiver'}
          >
            <Ionicons name="people-outline" size={21} color={isDark ? '#2DD4BF' : '#0F766E'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={onNotificationPress}
            activeOpacity={0.7}
            accessibilityLabel="Notifications"
          >
            <Ionicons
              name="notifications-outline"
              size={22}
              color={isDark ? '#F8FAFC' : '#1E293B'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={onSettingsPress || onAvatarPress}
            activeOpacity={0.7}
            accessibilityLabel="Settings"
          >
            <Ionicons name="settings-outline" size={22} color={isDark ? '#F8FAFC' : '#1E293B'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Compact Daily Progress Bar / Card */}
      <View style={styles.progressCard}>
        <View style={styles.progressCardLeft}>
          <View style={styles.progressTitleRow}>
            <Text style={styles.progressTitle}>
              {language === 'tr' ? 'Günlük İlerleme' : 'Daily Progress'}
            </Text>
            {currentStreak > 0 && (
              <View style={styles.streakBadge}>
                <Ionicons name="flame" size={12} color="#F59E0B" />
                <Text style={styles.streakText}>
                  {currentStreak} {language === 'tr' ? 'gün seri' : 'streak'}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.progressSubtitle}>
            {completedCount} / {totalDoses} {language === 'tr' ? 'Doz Alındı' : 'Doses Taken'}
          </Text>
        </View>

        <View style={styles.progressCardRight}>
          <CircularProgress
            size={52}
            strokeWidth={5.5}
            progress={progressPercent}
            color={isDark ? '#14B8A6' : '#0F766E'}
            trackColor={isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0'}
            textColor={isDark ? '#5EEAD4' : '#0F766E'}
          />
        </View>
      </View>
    </MotiView>
  );
}

const makeStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 16,
      paddingTop: 6,
      paddingBottom: 2,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    topLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
      marginRight: 8,
    },
    greetingTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: isDark ? '#2DD4BF' : '#0F766E',
      letterSpacing: -0.3,
      flexShrink: 1,
    },
    topRightActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      zIndex: 10,
      elevation: 5,
    },
    actionButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
    },
    progressCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      borderRadius: 16,
      overflow: 'hidden',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#E2E8F0',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.25 : 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    progressCardLeft: {
      flex: 1,
      justifyContent: 'center',
    },
    progressTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 2,
    },
    progressTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: isDark ? '#F8FAFC' : '#0F172A',
      letterSpacing: -0.2,
    },
    streakBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: 'rgba(245, 158, 11, 0.15)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    streakText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#D97706',
    },
    progressSubtitle: {
      fontSize: 12.5,
      fontWeight: '500',
      color: isDark ? '#94A3B8' : '#64748B',
    },
    progressCardRight: {
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 10,
    },
  });
