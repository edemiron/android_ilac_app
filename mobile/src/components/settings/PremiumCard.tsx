import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { withAlpha, ALPHA } from '../../utils/colors'; // Sprint 103.4
import { createSettingsStyles } from './styles';

interface PremiumCardProps {
  isPremium: boolean;
  remainingDays: number | null;
  onPress: () => void;
}

export const PremiumCard: React.FC<PremiumCardProps> = ({ isPremium, remainingDays, onPress }) => {
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();
  const styles = createSettingsStyles(colors, isDark);

  const getSubtitle = () => {
    if (isPremium) {
      return remainingDays !== null
        ? `${remainingDays} ${language === 'tr' ? 'gün kaldı' : 'days remaining'}`
        : language === 'tr'
          ? 'Tüm özelliklerin keyfini çıkarın'
          : 'Enjoy all features';
    }
    return language === 'tr' ? 'Sınırsız ilaç, reklamsız kullanım' : 'Unlimited meds, ad-free';
  };

  return (
    <TouchableOpacity
      style={[
        styles.premiumCard,
        {
          backgroundColor: isPremium ? '#FFD700' : colors.primary,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.premiumCardContent}>
        <View
          style={[
            styles.premiumIconContainer,
            {
              backgroundColor: isPremium
                ? withAlpha('#000000', ALPHA.veil)
                : withAlpha('#FFFFFF', ALPHA.over),
            },
          ]}
        >
          <MaterialCommunityIcons
            name={isPremium ? 'crown' : 'star-four-points'}
            size={24}
            color={isPremium ? '#1A1A2E' : '#FFFFFF'}
          />
        </View>
        <View style={styles.premiumTextContainer}>
          <Text style={[styles.premiumTitle, { color: isPremium ? '#1A1A2E' : '#FFFFFF' }]}>
            {isPremium
              ? language === 'tr'
                ? 'Premium Üyesiniz!'
                : "You're Premium!"
              : language === 'tr'
                ? "Premium'a Geçin"
                : 'Go Premium'}
          </Text>
          <Text
            style={[
              styles.premiumSubtitle,
              {
                color: isPremium
                  ? withAlpha('#000000', ALPHA.scrimStrong)
                  : withAlpha('#FFFFFF', ALPHA.onLight),
              },
            ]}
          >
            {getSubtitle()}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={isPremium ? '#1A1A2E' : '#FFFFFF'} />
      </View>
    </TouchableOpacity>
  );
};
