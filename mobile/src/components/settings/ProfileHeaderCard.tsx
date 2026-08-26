import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { getInitials } from './getInitials';

interface ProfileHeaderCardProps {
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
  isPremium: boolean;
  remainingDays?: number | null;
  onPremiumPress: () => void;
  onEditPress?: () => void;
}

export const ProfileHeaderCard: React.FC<ProfileHeaderCardProps> = ({
  displayName,
  email,
  photoURL,
  isPremium,
  remainingDays: _remainingDays,
  onPremiumPress,
  onEditPress,
}) => {
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();

  const userName =
    displayName || (email ? email.split('@')[0] : language === 'tr' ? 'Kullanıcı' : 'User');

  const initials = getInitials(userName);

  const gradientColors = isDark
    ? ([`${colors.primary}22`, `${colors.surfaceContainerHighest || '#1E293B'}90`] as const)
    : ([`${colors.primary}18`, `${colors.primary}05`] as const);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.card,
          {
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.95)',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : `${colors.primary}25`,
          },
        ]}
      >
        {/* Avatar Container with Edit Pen Badge */}
        <View style={styles.avatarWrapper}>
          {photoURL ? (
            <Image source={{ uri: photoURL }} style={styles.avatarImage} />
          ) : (
            <LinearGradient
              colors={[`${colors.primary}40`, `${colors.primary}80`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarPlaceholder}
            >
              <Text style={styles.avatarInitials}>{initials}</Text>
            </LinearGradient>
          )}

          <TouchableOpacity
            style={[
              styles.editBadge,
              {
                backgroundColor: colors.primary,
                borderColor: isDark ? '#1E293B' : '#FFFFFF',
              },
            ]}
            onPress={onEditPress}
            activeOpacity={0.8}
            accessibilityLabel={language === 'tr' ? 'Profili Düzenle' : 'Edit Profile'}
          >
            <Ionicons name="camera-outline" size={13} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* User Name & Email */}
        <Text style={[styles.userName, { color: colors.text }]}>{userName}</Text>
        {email && <Text style={[styles.userEmail, { color: colors.textMuted }]}>{email}</Text>}

        {/* Cloud Sync & Premium Row */}
        <View style={styles.badgeRow}>
          {/* Cloud Sync Status */}
          <View
            style={[
              styles.syncBadge,
              {
                backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.10)',
                borderColor: 'rgba(16, 185, 129, 0.25)',
              },
            ]}
          >
            <View style={styles.syncDot} />
            <Text style={[styles.syncText, { color: colors.success || '#10B981' }]}>
              {language === 'tr' ? 'Bulut Eşitlemesi Aktif' : 'Cloud Synced'}
            </Text>
          </View>

          {/* Premium Plan Badge */}
          <TouchableOpacity
            style={[
              styles.planBadge,
              {
                backgroundColor: isPremium ? '#0F766E' : colors.primary,
              },
            ]}
            onPress={onPremiumPress}
            activeOpacity={0.85}
          >
            <Ionicons name={isPremium ? 'star' : 'sparkles'} size={13} color="#FFFFFF" />
            <Text style={styles.planBadgeText}>
              {isPremium
                ? language === 'tr'
                  ? 'Premium Plan'
                  : 'Premium Plan'
                : language === 'tr'
                  ? 'Premium Plan'
                  : 'Go Premium'}
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 10,
  },
  avatarImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarPlaceholder: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarInitials: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    elevation: 3,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12.5,
    fontWeight: '500',
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 5,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  syncText: {
    fontSize: 11,
    fontWeight: '700',
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 12,
    elevation: 1,
  },
  planBadgeText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
});

export default ProfileHeaderCard;
