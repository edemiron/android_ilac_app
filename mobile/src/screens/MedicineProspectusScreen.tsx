import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { RootStackParamList, MedicineProspectus } from '../types';
import { getMedicineInfoAI } from '../services/aiMedicineService';
import { getMedicineById } from '../services/globalMedicineService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, 'MedicineProspectus'>;

export default function MedicineProspectusScreen() {
  // eslint-disable-next-line unused-imports/no-unused-vars
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { medicineId, medicineName, dosage } = route.params;

  const { colors, isDark } = useTheme();
  // eslint-disable-next-line unused-imports/no-unused-vars
  const { t, language } = useLanguage();

  const [isLoading, setIsLoading] = useState(true);
  const [prospectus, setProspectus] = useState<MedicineProspectus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchProspectus = async () => {
    setError(null);

    try {
      // Önce veritabanından prospektüs kontrol et
      if (medicineId) {
        const dbMedicine = await getMedicineById(medicineId);
        if (dbMedicine?.prospectus) {
          setProspectus(dbMedicine.prospectus);
          setIsLoading(false);
          setIsRefreshing(false);
          return;
        }
      }

      // Veritabanında yoksa AI'dan getir
      const result = await getMedicineInfoAI(medicineName, dosage);

      if (result.success && result.medicine?.prospectus) {
        setProspectus(result.medicine.prospectus);
      } else {
        setError(result.error || 'Prospektüs bilgisi alınamadı');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Bir hata oluştu';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProspectus();
  }, [medicineId, medicineName, fetchProspectus]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchProspectus();
  };

  const renderSection = (title: string, content: string | string[] | undefined, icon: string) => {
    if (!content || (Array.isArray(content) && content.length === 0)) {
      return null;
    }

    return (
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>{icon}</Text>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        </View>
        {Array.isArray(content) ? (
          <View style={styles.listContainer}>
            {content.map((item, index) => (
              <View key={index} style={styles.listItem}>
                <Text style={[styles.bullet, { color: colors.primary }]}>•</Text>
                <Text style={[styles.listItemText, { color: colors.textSecondary }]}>{item}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>{content}</Text>
        )}
      </View>
    );
  };

  const styles = createStyles(colors, isDark);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {language === 'tr' ? 'Prospektüs bilgileri yükleniyor...' : 'Loading prospectus...'}
          </Text>
          <Text style={[styles.loadingSubtext, { color: colors.textMuted }]}>
            {language === 'tr' ? 'AI ile bilgiler getiriliyor' : 'Fetching info with AI'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={[styles.errorText, { color: colors.text }]}>
            {language === 'tr' ? 'Prospektüs Yüklenemedi' : 'Could Not Load Prospectus'}
          </Text>
          <Text style={[styles.errorDescription, { color: colors.textSecondary }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={handleRefresh}
          >
            <Text style={styles.retryButtonText}>
              {language === 'tr' ? 'Tekrar Dene' : 'Retry'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <Text style={styles.medicineName}>{medicineName}</Text>
          {dosage && <Text style={styles.medicineDosage}>{dosage}</Text>}
        </View>

        {/* AI Uyarısı */}
        <View style={[styles.aiWarning, { backgroundColor: colors.card }]}>
          <Text style={styles.aiWarningIcon}>🤖</Text>
          <Text style={[styles.aiWarningText, { color: colors.textSecondary }]}>
            {language === 'tr'
              ? 'Bu bilgiler AI tarafından sağlanmıştır. Kesin bilgi için doktorunuza veya eczacınıza danışın.'
              : 'This information is AI-generated. Consult your doctor or pharmacist for accurate information.'}
          </Text>
        </View>

        {/* Prospektüs Bölümleri */}
        {renderSection(
          language === 'tr' ? 'Kullanım Alanı' : 'Indication',
          prospectus?.indication,
          '💊'
        )}

        {renderSection(
          language === 'tr' ? 'Kullanım Şekli ve Dozu' : 'Dosage Instructions',
          prospectus?.dosageInstructions,
          '📋'
        )}

        {renderSection(
          language === 'tr' ? 'Yan Etkiler' : 'Side Effects',
          prospectus?.sideEffects,
          '⚠️'
        )}

        {renderSection(
          language === 'tr' ? 'Kontrendikasyonlar' : 'Contraindications',
          prospectus?.contraindication,
          '🚫'
        )}

        {renderSection(language === 'tr' ? 'Uyarılar' : 'Warnings', prospectus?.warnings, '❗')}

        {renderSection(
          language === 'tr' ? 'İlaç Etkileşimleri' : 'Drug Interactions',
          prospectus?.interactions,
          '🔄'
        )}

        {renderSection(
          language === 'tr' ? 'Gebelikte Kullanım' : 'Pregnancy',
          prospectus?.pregnancy,
          '🤰'
        )}

        {renderSection(
          language === 'tr' ? 'Saklama Koşulları' : 'Storage',
          prospectus?.storage,
          '🏠'
        )}

        {/* Etken Maddeler */}
        {prospectus?.activeIngredients && prospectus.activeIngredients.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>🧪</Text>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {language === 'tr' ? 'Etken Maddeler' : 'Active Ingredients'}
              </Text>
            </View>
            <View style={styles.ingredientsContainer}>
              {prospectus.activeIngredients.map((ingredient, index) => (
                <View
                  key={index}
                  style={[styles.ingredientChip, { backgroundColor: colors.primary + '20' }]}
                >
                  <Text style={[styles.ingredientName, { color: colors.primary }]}>
                    {ingredient.name}
                  </Text>
                  <Text style={[styles.ingredientAmount, { color: colors.textSecondary }]}>
                    {ingredient.amount}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors, _isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
    },
    // Loading
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    loadingText: {
      fontSize: 18,
      fontWeight: '600',
      marginTop: 20,
    },
    loadingSubtext: {
      fontSize: 14,
      marginTop: 8,
    },
    // Error
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    errorIcon: {
      fontSize: 60,
      marginBottom: 20,
    },
    errorText: {
      fontSize: 20,
      fontWeight: '600',
      textAlign: 'center',
    },
    errorDescription: {
      fontSize: 14,
      textAlign: 'center',
      marginTop: 10,
      marginBottom: 30,
    },
    retryButton: {
      paddingHorizontal: 30,
      paddingVertical: 14,
      borderRadius: 12,
    },
    retryButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    // Header
    header: {
      padding: 24,
      paddingTop: 16,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
    },
    medicineName: {
      fontSize: 28,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    medicineDosage: {
      fontSize: 18,
      color: 'rgba(255, 255, 255, 0.8)',
      marginTop: 4,
    },
    // AI Warning
    aiWarning: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      margin: 16,
      padding: 12,
      borderRadius: 12,
      borderLeftWidth: 4,
      borderLeftColor: '#FF9800',
    },
    aiWarningIcon: {
      fontSize: 18,
      marginRight: 10,
    },
    aiWarningText: {
      flex: 1,
      fontSize: 12,
      lineHeight: 18,
    },
    // Section
    section: {
      marginHorizontal: 16,
      marginTop: 12,
      borderRadius: 16,
      padding: 16,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionIcon: {
      fontSize: 20,
      marginRight: 10,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
    },
    sectionContent: {
      fontSize: 15,
      lineHeight: 24,
    },
    // List
    listContainer: {
      gap: 8,
    },
    listItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    bullet: {
      fontSize: 16,
      marginRight: 8,
      marginTop: 2,
    },
    listItemText: {
      flex: 1,
      fontSize: 15,
      lineHeight: 22,
    },
    // Ingredients
    ingredientsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    ingredientChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    ingredientName: {
      fontSize: 14,
      fontWeight: '600',
    },
    ingredientAmount: {
      fontSize: 12,
    },
  });
