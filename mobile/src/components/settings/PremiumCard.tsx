import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
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
        ? `${remainingDays} ${language === 'tr' ? 'gun kaldi' : 'days remaining'}`
        : language === 'tr'
          ? 'Tum ozelliklerin keyfini cikarin'
          : 'Enjoy all features';
    }
    return language === 'tr' ? 'Sinirsiz ilac, reklamsiz kullanim' : 'Unlimited meds, ad-free';
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
            { backgroundColor: isPremium ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.2)' },
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
                ? 'Premium Uyesiniz!'
                : "You're Premium!"
              : language === 'tr'
                ? "Premium'a Gecin"
                : 'Go Premium'}
          </Text>
          <Text
            style={[
              styles.premiumSubtitle,
              { color: isPremium ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.85)' },
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
