/**
 * PremiumCard — Sprint 107.1 HeroCard migration.
 *
 * SettingsScreen üstündeki premium CTA kartı. HeroCard primitive'i (Sprint 107.1)
 * kullanarak gradient + icon + title + subtitle + chevron'u tek API'de birleştirir.
 *
 * Görsel: Sprint 106.5 gradient (gold→orange premium, accent→teal free) korunur.
 * Border radius radius.lg (14) → radius.xl (20) — HeroCard primitive'inin parçası.
 */

import React from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { HeroCard } from '../common/HeroCard';
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

  const tr = language === 'tr';

  const subtitle = isPremium
    ? remainingDays !== null
      ? `${remainingDays} ${tr ? 'gün kaldı' : 'days remaining'}`
      : tr
        ? 'Tüm özelliklerin keyfini çıkarın'
        : 'Enjoy all features'
    : tr
      ? 'Sınıksız ilaç, reklamsız kullanım'
      : 'Unlimited meds, ad-free';

  const title = isPremium
    ? tr
      ? 'Premium Üyesiniz!'
      : "You're Premium!"
    : tr
      ? "Premium'a Geçin"
      : 'Go Premium';

  // Icon + chevron foreground color — variant-specific contrast
  const fg = isPremium ? '#1A1A2E' : '#FFFFFF';

  return (
    <HeroCard
      variant={isPremium ? 'premium' : 'free'}
      onPress={onPress}
      title={title}
      subtitle={subtitle}
      icon={
        <MaterialCommunityIcons
          name={isPremium ? 'crown' : 'star-four-points'}
          size={24}
          color={fg}
        />
      }
      trailing={<Ionicons name="chevron-forward" size={20} color={fg} />}
      accessibilityLabel={title}
      accessibilityHint={tr ? 'Premium detaylarını görmek için dokun' : 'Tap to view Premium details'}
      style={styles.premiumCard}
    />
  );
};

export default PremiumCard;