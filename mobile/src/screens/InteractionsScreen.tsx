import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useMedicineStore } from '../stores/medicineStore';
import {
  checkMultipleInteractions,
  InteractionCheckResult,
  DrugInteraction,
  getSeverityColor,
  getSeverityIcon,
} from '../services/drugInteraction';

export default function InteractionsScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { medicines } = useMedicineStore();

  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<InteractionCheckResult | null>(null);

  const activeMedicines = useMemo(() => medicines.filter(m => m.isActive), [medicines]);

  useEffect(() => {
    checkInteractions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMedicines]);

  const checkInteractions = async () => {
    setIsLoading(true);

    // Küçük bir gecikme ile UX iyileştirmesi
    await new Promise(resolve => setTimeout(resolve, 500));

    const drugNames = activeMedicines.map(m => m.name);
    const checkResult = await checkMultipleInteractions(drugNames);

    setResult(checkResult);
    setIsLoading(false);
  };

  const styles = createStyles(colors, isDark);

  const getSeverityText = (severity: DrugInteraction['severity']) => {
    switch (severity) {
      case 'high':
        return t('interaction_severity_high');
      case 'moderate':
        return t('interaction_severity_moderate');
      case 'low':
        return t('interaction_severity_low');
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Başlık */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('interaction_title')}</Text>
        <Text style={styles.headerSubtitle}>
          {activeMedicines.length} aktif ilaç kontrol ediliyor
        </Text>
      </View>

      {/* İlaç Listesi */}
      <View style={styles.medicineList}>
        <Text style={styles.sectionTitle}>Aktif İlaçlar</Text>
        <View style={styles.medicineChips}>
          {activeMedicines.map(medicine => (
            <View
              key={medicine.id}
              style={[styles.medicineChip, { backgroundColor: medicine.color + '30' }]}
            >
              <View style={[styles.chipDot, { backgroundColor: medicine.color }]} />
              <Text style={[styles.chipText, { color: colors.text }]}>{medicine.name}</Text>
            </View>
          ))}
          {activeMedicines.length === 0 && <Text style={styles.emptyText}>Aktif ilaç yok</Text>}
        </View>
      </View>

      {/* Sonuçlar */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('interaction_checking')}</Text>
        </View>
      ) : result ? (
        <View style={styles.resultsContainer}>
          {/* Özet */}
          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: result.hasInteractions
                  ? colors.error + '15'
                  : colors.success + '15',
                borderColor: result.hasInteractions ? colors.error + '30' : colors.success + '30',
              },
            ]}
          >
            <Text style={styles.summaryIcon}>{result.hasInteractions ? '⚠️' : '✅'}</Text>
            <Text
              style={[
                styles.summaryText,
                { color: result.hasInteractions ? colors.error : colors.success },
              ]}
            >
              {result.hasInteractions
                ? t('interaction_found', { count: result.interactions?.length || 0 })
                : t('interaction_none')}
            </Text>
          </View>

          {/* Etkileşim Listesi */}
          {result.interactions && result.interactions.length > 0 && (
            <View style={styles.interactionsList}>
              <Text style={styles.sectionTitle}>Bulunan Etkileşimler</Text>

              {result.interactions.map(interaction => (
                <View
                  key={interaction.id}
                  style={[
                    styles.interactionCard,
                    { borderLeftColor: getSeverityColor(interaction.severity) },
                  ]}
                >
                  {/* Başlık */}
                  <View style={styles.interactionHeader}>
                    <Text style={styles.interactionIcon}>
                      {getSeverityIcon(interaction.severity)}
                    </Text>
                    <View style={styles.interactionDrugs}>
                      <Text style={styles.interactionDrugText}>{interaction.drug1}</Text>
                      <Text style={styles.interactionPlus}>+</Text>
                      <Text style={styles.interactionDrugText}>{interaction.drug2}</Text>
                    </View>
                    <View
                      style={[
                        styles.severityBadge,
                        { backgroundColor: getSeverityColor(interaction.severity) + '20' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.severityText,
                          { color: getSeverityColor(interaction.severity) },
                        ]}
                      >
                        {getSeverityText(interaction.severity)}
                      </Text>
                    </View>
                  </View>

                  {/* Açıklama */}
                  <Text style={styles.interactionDescription}>{interaction.description}</Text>

                  {/* Öneri */}
                  <View style={styles.recommendationContainer}>
                    <Text style={styles.recommendationLabel}>Öneri:</Text>
                    <Text style={styles.recommendationText}>{interaction.recommendation}</Text>
                  </View>
                </View>
              ))}

              {/* Uyarı */}
              <View style={styles.warningBox}>
                <Text style={styles.warningIcon}>👨‍⚕️</Text>
                <Text style={styles.warningText}>{t('interaction_consult_doctor')}</Text>
              </View>
            </View>
          )}
        </View>
      ) : null}

      {/* Yeniden Kontrol Et */}
      <TouchableOpacity
        style={[styles.refreshButton, { backgroundColor: colors.primary }]}
        onPress={checkInteractions}
        disabled={isLoading}
      >
        <Text style={styles.refreshButtonText}>🔄 Yeniden Kontrol Et</Text>
      </TouchableOpacity>

      {/* Bilgi Notu */}
      <View style={styles.infoBox}>
        <Text style={styles.infoIcon}>ℹ️</Text>
        <Text style={styles.infoText}>
          Bu bilgiler genel amaçlıdır ve tıbbi tavsiye yerine geçmez. İlaç etkileşimleri hakkında
          her zaman doktorunuza veya eczacınıza danışın.
        </Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors, _isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 20,
      paddingBottom: 10,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
    },
    headerSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 4,
    },
    medicineList: {
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    medicineChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    medicineChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
    },
    chipDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 8,
    },
    chipText: {
      fontSize: 14,
      fontWeight: '500',
    },
    emptyText: {
      fontSize: 14,
      color: colors.textMuted,
      fontStyle: 'italic',
    },
    loadingContainer: {
      alignItems: 'center',
      padding: 40,
    },
    loadingText: {
      fontSize: 16,
      color: colors.textSecondary,
      marginTop: 12,
    },
    resultsContainer: {
      paddingHorizontal: 20,
    },
    summaryCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      borderRadius: 16,
      borderWidth: 1,
      marginBottom: 20,
    },
    summaryIcon: {
      fontSize: 24,
      marginRight: 12,
    },
    summaryText: {
      fontSize: 18,
      fontWeight: '600',
    },
    interactionsList: {
      marginTop: 8,
    },
    interactionCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderLeftWidth: 4,
    },
    interactionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    interactionIcon: {
      fontSize: 20,
      marginRight: 10,
    },
    interactionDrugs: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
    },
    interactionDrugText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    interactionPlus: {
      fontSize: 14,
      color: colors.textSecondary,
      marginHorizontal: 6,
    },
    severityBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    severityText: {
      fontSize: 12,
      fontWeight: '600',
    },
    interactionDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: 12,
    },
    recommendationContainer: {
      backgroundColor: colors.background,
      padding: 12,
      borderRadius: 8,
    },
    recommendationLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
      marginBottom: 4,
    },
    recommendationText: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
    },
    warningBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.warning + '15',
      padding: 16,
      borderRadius: 12,
      marginTop: 8,
    },
    warningIcon: {
      fontSize: 24,
      marginRight: 12,
    },
    warningText: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
      fontWeight: '500',
    },
    refreshButton: {
      margin: 20,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    refreshButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    infoBox: {
      flexDirection: 'row',
      marginHorizontal: 20,
      padding: 16,
      backgroundColor: colors.card,
      borderRadius: 12,
    },
    infoIcon: {
      fontSize: 20,
      marginRight: 12,
    },
    infoText: {
      flex: 1,
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 20,
    },
  });
