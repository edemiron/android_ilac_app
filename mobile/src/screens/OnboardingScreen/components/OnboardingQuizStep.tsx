import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import type { ThemeColors } from '../../../contexts/ThemeContext';

export interface QuizOption {
  id: string;
  icon: string;
  titleTr: string;
  titleEn: string;
  descTr: string;
  descEn: string;
}

export interface QuizStepData {
  step: number;
  totalSteps: number;
  badgeTr: string;
  badgeEn: string;
  titleTr: string;
  titleEn: string;
  subtitleTr: string;
  subtitleEn: string;
  options: QuizOption[];
}

interface OnboardingQuizStepProps {
  data: QuizStepData;
  selectedOptionId: string | null;
  onSelectOption: (optionId: string) => void;
  colors: ThemeColors;
  isDark: boolean;
  language: string;
}

export function OnboardingQuizStep({
  data,
  selectedOptionId,
  onSelectOption,
  colors,
  isDark,
  language,
}: OnboardingQuizStepProps) {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const tr = language === 'tr';

  return (
    <View style={[styles.container, { width: SCREEN_WIDTH }]}>
      {/* Üst Rozet & İlerleme */}
      <View
        style={[
          styles.badge,
          {
            backgroundColor: isDark ? colors.primaryContainer : '#E6FFFA',
            borderColor: colors.primary,
          },
        ]}
      >
        <Text style={[styles.badgeText, { color: colors.primary }]}>
          {tr ? data.badgeTr : data.badgeEn}
        </Text>
      </View>

      {/* Soru Başlığı */}
      <Text style={[styles.title, { color: colors.text }]}>{tr ? data.titleTr : data.titleEn}</Text>

      {/* Alt Açıklama */}
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {tr ? data.subtitleTr : data.subtitleEn}
      </Text>

      {/* Seçenek Listesi */}
      <View style={styles.optionsList}>
        {data.options.map(opt => {
          const isSelected = selectedOptionId === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              style={[
                styles.optionCard,
                {
                  backgroundColor: isSelected ? (isDark ? '#134E4A' : '#F0FDFA') : colors.card,
                  borderColor: isSelected ? colors.primary : colors.inputBorder,
                  borderWidth: isSelected ? 2 : 1,
                  shadowColor: isSelected ? colors.primary : '#000',
                  shadowOpacity: isSelected ? 0.15 : 0.04,
                },
              ]}
              onPress={() => onSelectOption(opt.id)}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.iconWrap,
                  {
                    backgroundColor: isSelected
                      ? colors.primary
                      : isDark
                        ? // v1.7.1: `colors.surfaceVariant` diye bir token YOK —
                          // koyu temada bu arka plan `undefined` kaliyordu.
                          // Acik temadaki '#F1F5F9' MD3'te surfaceContainer'a
                          // denk; koyu temada surfaceContainer = surface oldugu
                          // icin kart uzerinde gorunmez kalirdi, bu yuzden bir
                          // ust basamak (surfaceContainerHigh) kullaniliyor.
                          colors.surfaceContainerHigh
                        : '#F1F5F9',
                  },
                ]}
              >
                <Text style={styles.icon}>{opt.icon}</Text>
              </View>

              <View style={styles.optionTextContainer}>
                <Text
                  style={[
                    styles.optionTitle,
                    {
                      color: isSelected ? colors.primary : colors.text,
                      fontWeight: isSelected ? '700' : '600',
                    },
                  ]}
                >
                  {tr ? opt.titleTr : opt.titleEn}
                </Text>
                <Text
                  style={[
                    styles.optionDesc,
                    { color: isSelected ? colors.text : colors.textSecondary },
                  ]}
                >
                  {tr ? opt.descTr : opt.descEn}
                </Text>
              </View>

              {/* Seçim İndikatörü */}
              <View
                style={[
                  styles.radioCircle,
                  {
                    borderColor: isSelected ? colors.primary : colors.textMuted,
                    backgroundColor: isSelected ? colors.primary : 'transparent',
                  },
                ]}
              >
                {isSelected && <Text style={styles.checkMark}>✓</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingBottom: 20,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 32,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  optionsList: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  icon: {
    fontSize: 22,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    marginBottom: 3,
  },
  optionDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
