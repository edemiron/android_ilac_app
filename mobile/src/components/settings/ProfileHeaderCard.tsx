import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
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
    displayName ||
    (email ? email.split('@')[0] : language === 'tr' ? 'Sarah Johnson' : 'Sarah Johnson');

  const initials = getInitials(userName);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
          borderColor: isDark ? '#334155' : '#E2E8F0',
        },
      ]}
    >
      {/* Avatar Container with Edit Pen Badge */}
      <View style={styles.avatarWrapper}>
        {photoURL ? (
          <Image source={{ uri: photoURL }} style={styles.avatarImage} />
        ) : (
          <View
            style={[
              styles.avatarPlaceholder,
              {
                backgroundColor: isDark ? '#0F766E' : '#E0F2FE',
              },
            ]}
          >
            <Text style={[styles.avatarInitials, { color: isDark ? '#F0FDFA' : '#0284C7' }]}>
              {initials}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.editBadge, { backgroundColor: isDark ? '#14B8A6' : '#0F766E' }]}
          onPress={onEditPress}
          activeOpacity={0.8}
          accessibilityLabel={language === 'tr' ? 'Profili Düzenle' : 'Edit Profile'}
        >
          <Ionicons name="pencil" size={13} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* User Name */}
      <Text style={[styles.userName, { color: colors.text }]}>{userName}</Text>

      {/* Premium Plan Badge Pill */}
      <TouchableOpacity
        style={[
          styles.planBadge,
          {
            backgroundColor: isDark ? '#0F766E' : '#0F766E',
          },
        ]}
        onPress={onPremiumPress}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons
          name={isPremium ? 'crown' : 'shield-star-outline'}
          size={16}
          color="#FFFFFF"
        />
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
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarInitials: {
    fontSize: 26,
    fontWeight: '700',
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
    borderColor: '#FFFFFF',
    elevation: 3,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    elevation: 1,
  },
  planBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

export default ProfileHeaderCard;
