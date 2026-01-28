// Polyfill for crypto.getRandomValues (required for uuid package)
import 'react-native-get-random-values';

import React, { useEffect, useRef, useState } from 'react';
import {
  StatusBar,
  View,
  Platform,
  ActivityIndicator,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Text,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import notifee, { EventType } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';

import {
  HomeScreen,
  AddMedicineScreen,
  MedicinesScreen,
  SettingsScreen,
  AlarmScreen,
  StatisticsScreen,
  InteractionsScreen,
  BarcodeScannerScreen,
  LoginScreen,
  RegisterScreen,
  MedicineProspectusScreen,
  PremiumScreen,
  PermissionsScreen,
} from './src/screens';
import { RootStackParamList, MainTabParamList, AuthStackParamList } from './src/types';
import {
  requestNotificationPermissions,
  createNotificationChannels,
  setupNotificationListeners,
  dismissNotification,
  scheduleSnoozeNotification,
  cancelMedicineNotifications,
  cleanupOrphanNotifications,
  cancelAllNotifications,
} from './src/utils/notifications';
import { useMedicineStore } from './src/stores/medicineStore';
import { generateId } from './src/utils/idGenerator';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { LanguageProvider, useLanguage } from './src/contexts/LanguageContext';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { SubscriptionProvider } from './src/contexts/SubscriptionContext';
import { AlertProvider } from './src/contexts/AlertContext';
import {
  getBootRecoveryResult,
  clearBootRecoveryResult,
  BootRecoveryResult,
  reRegisterAllAlarms,
} from './src/utils/bootHandler';
import { logAlarmFailure } from './src/utils/alarmFailureLogger';
import { createScopedLogger } from './src/utils/logger';

const appLog = createScopedLogger('App');

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

const PERMISSIONS_SHOWN_KEY = '@permissions_shown';

function getTriggerDisplayName(trigger: string): string {
  const triggerNames: Record<string, string> = {
    'android.intent.action.BOOT_COMPLETED': 'Cihaz yeniden başlatma',
    'android.intent.action.LOCKED_BOOT_COMPLETED': 'Cihaz başlatma',
    'android.intent.action.TIME_SET': 'Saat değişikliği',
    'android.intent.action.TIMEZONE_CHANGED': 'Saat dilimi değişikliği',
    'android.intent.action.MY_PACKAGE_REPLACED': 'Uygulama güncelleme',
    manual: 'Manuel senkronizasyon',
  };
  return triggerNames[trigger] || 'Sistem olayı';
}

// Auth Navigator - Giriş yapmamış kullanıcılar için
function AuthNavigator() {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <AuthStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.header,
        },
        headerShadowVisible: false,
        headerTitleStyle: {
          fontWeight: '600',
          color: colors.headerText,
        },
        headerTintColor: colors.primary,
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <AuthStack.Screen
        name="Register"
        component={RegisterScreen}
        options={{
          headerShown: false,
        }}
      />
    </AuthStack.Navigator>
  );
}

// Tab ikonları için renkler (isDark parametresiyle kullanılacak)
const getTabColors = (isDark: boolean) => ({
  home: { active: isDark ? '#8B9CFF' : '#0D9488', inactive: isDark ? '#6B8AAA' : '#94A3B8' }, // Primary - Teal
  medicines: { active: isDark ? '#5EE6FF' : '#2563EB', inactive: isDark ? '#6B8AAA' : '#94A3B8' }, // Secondary - Royal Blue
  statistics: { active: isDark ? '#D0A6FF' : '#7C3AED', inactive: isDark ? '#6B8AAA' : '#94A3B8' }, // Accent - Purple
  settings: { active: isDark ? '#F59E0B' : '#D97706', inactive: isDark ? '#6B8AAA' : '#94A3B8' }, // Warning - Amber
});

// Custom Tab Bar with Center FAB
interface CustomTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

function CustomTabBar({ state, descriptors, navigation }: CustomTabBarProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();

  const TAB_COLORS = getTabColors(isDark);

  const tabIcons: Record<string, { name: string; colors: { active: string; inactive: string } }> = {
    Home: { name: 'home', colors: TAB_COLORS.home },
    Medicines: { name: 'medical', colors: TAB_COLORS.medicines },
    Statistics: { name: 'bar-chart', colors: TAB_COLORS.statistics },
    Settings: { name: 'settings-sharp', colors: TAB_COLORS.settings },
  };

  const handleAddMedicine = () => {
    navigation.navigate('AddMedicine', {});
  };

  return (
    <View style={[tabBarStyles.container, { backgroundColor: colors.tabBar }]}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const iconConfig = tabIcons[route.name];

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        // Ortaya FAB ekle (2. tab'dan sonra)
        if (index === 2) {
          return (
            <React.Fragment key={route.key}>
              {/* Center FAB */}
              <View style={tabBarStyles.fabWrapper}>
                <TouchableOpacity
                  style={[tabBarStyles.fab, { backgroundColor: colors.primary }]}
                  onPress={handleAddMedicine}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={28} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Normal Tab */}
              <TouchableOpacity style={tabBarStyles.tab} onPress={onPress} activeOpacity={0.7}>
                <Ionicons
                  name={iconConfig.name as any}
                  size={24}
                  color={isFocused ? iconConfig.colors.active : iconConfig.colors.inactive}
                />
                <Text
                  style={[
                    tabBarStyles.label,
                    { color: isFocused ? iconConfig.colors.active : iconConfig.colors.inactive },
                  ]}
                >
                  {options.title}
                </Text>
              </TouchableOpacity>
            </React.Fragment>
          );
        }

        return (
          <TouchableOpacity
            key={route.key}
            style={tabBarStyles.tab}
            onPress={onPress}
            activeOpacity={0.7}
          >
            <Ionicons
              name={iconConfig.name as any}
              size={24}
              color={isFocused ? iconConfig.colors.active : iconConfig.colors.inactive}
            />
            <Text
              style={[
                tabBarStyles.label,
                { color: isFocused ? iconConfig.colors.active : iconConfig.colors.inactive },
              ]}
            >
              {options.title}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const tabBarStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    paddingTop: 16,
    alignItems: 'flex-end',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
  fabWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginHorizontal: 8,
    marginTop: -36,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B9CFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 12,
  },
});

// Tab Navigator with Theme Support
function MainTabs() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();

  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.header,
        },
        headerShadowVisible: false,
        headerTitleStyle: {
          fontWeight: '600',
          color: colors.headerText,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: t('tab_home'),
          headerTitle: t('app_name'),
        }}
      />
      <Tab.Screen
        name="Medicines"
        component={MedicinesScreen}
        options={{
          title: t('tab_medicines'),
          headerTitle: t('tab_medicines'),
        }}
      />
      <Tab.Screen
        name="Statistics"
        component={StatisticsScreen}
        options={{
          title: t('tab_statistics'),
          headerTitle: t('tab_statistics'),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: t('tab_settings'),
          headerTitle: t('tab_settings'),
        }}
      />
    </Tab.Navigator>
  );
}

// Loading Screen
function LoadingScreen() {
  const { colors } = useTheme();

  return (
    <View style={[loadingStyles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// Main App Content with Navigation
function AppContent() {
  const navigationRef = useRef<any>(null);
  const processedSnoozesRef = useRef<Set<string>>(new Set()); // Snooze işlemi yapılmış notification'lar
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const {
    setAlarmActive,
    getMedicineById,
    getReminderTimesForMedicine,
    settings,
    setUserId,
    syncFromCloud,
    logMedicineTaken,
    logMedicineSkipped,
  } = useMedicineStore();

  const [showPermissions, setShowPermissions] = useState<boolean | null>(null);
  const [pendingAlarm, setPendingAlarm] = useState<any>(null);
  const [bootRecovery, setBootRecovery] = useState<BootRecoveryResult | null>(null);

  // İzin ekranı gösterildi mi kontrol et
  useEffect(() => {
    const checkPermissionsShown = async () => {
      try {
        const shown = await AsyncStorage.getItem(PERMISSIONS_SHOWN_KEY);
        setShowPermissions(shown !== 'true');
      } catch (error) {
        setShowPermissions(true);
      }
    };
    checkPermissionsShown();
  }, []);

  // İzin ekranı tamamlandığında
  const handlePermissionsComplete = async () => {
    await AsyncStorage.setItem(PERMISSIONS_SHOWN_KEY, 'true');
    setShowPermissions(false);
  };

  // Auth durumu değiştiğinde store'u güncelle ve sync yap
  useEffect(() => {
    if (isAuthenticated && user) {
      setUserId(user.uid);
      syncFromCloud().catch(console.error);
    } else {
      setUserId(null);
    }
  }, [isAuthenticated, user]);

  const navigateToAlarm = (data: {
    medicineId: string;
    reminderTimeId: string;
    scheduledTime: string;
    isSnooze?: string;
    snoozeId?: string;
  }) => {
    console.log('Alarm ekranına yönlendiriliyor:', data);

    const isTestMode = data.medicineId === 'test-medicine';
    const isSnooze = data.isSnooze === 'true';

    if (!isTestMode) {
      const storeState = useMedicineStore.getState();
      const medicine = storeState.getMedicineById(data.medicineId);

      if (!medicine) {
        logAlarmFailure(
          isSnooze ? 'snooze' : 'reminder',
          'MEDICATION_DELETED',
          {
            medicineId: data.medicineId,
            reminderTimeId: data.reminderTimeId,
            snoozeId: data.snoozeId,
          },
          { source: 'navigateToAlarm' }
        );
        if (isSnooze && data.snoozeId) {
          dismissNotification(`snooze-${data.snoozeId}`);
        } else {
          dismissNotification(`alarm-${data.medicineId}-${data.reminderTimeId}`);
        }
        cancelMedicineNotifications(data.medicineId);
        return;
      }

      const medicineLogs = storeState.medicineLogs;
      const today = new Date().toISOString().split('T')[0];
      const alreadyLogged = medicineLogs.some(
        log =>
          log.reminderTimeId === data.reminderTimeId &&
          log.scheduledTime.startsWith(today) &&
          (log.status === 'taken' || log.status === 'skipped')
      );

      if (alreadyLogged) {
        logAlarmFailure(
          isSnooze ? 'snooze' : 'reminder',
          'ALREADY_LOGGED',
          {
            medicineId: data.medicineId,
            reminderTimeId: data.reminderTimeId,
            snoozeId: data.snoozeId,
          },
          { source: 'navigateToAlarm' }
        );
        if (isSnooze && data.snoozeId) {
          dismissNotification(`snooze-${data.snoozeId}`);
          storeState.deactivateSnooze(data.snoozeId);
        } else {
          dismissNotification(`alarm-${data.medicineId}-${data.reminderTimeId}`);
        }
        return;
      }

      if (isSnooze && data.snoozeId) {
        const snooze = storeState.snoozes.find(s => s.id === data.snoozeId);
        if (snooze && !snooze.isActive) {
          logAlarmFailure(
            'snooze',
            'SNOOZE_INACTIVE',
            {
              medicineId: data.medicineId,
              reminderTimeId: data.reminderTimeId,
              snoozeId: data.snoozeId,
            },
            { source: 'navigateToAlarm' }
          );
          dismissNotification(`snooze-${data.snoozeId}`);
          return;
        }
      }
    }

    if (!navigationRef.current?.isReady()) {
      setPendingAlarm(data);
      return;
    }

    navigationRef.current?.navigate('Alarm', {
      medicineId: data.medicineId,
      reminderTimeId: data.reminderTimeId,
      scheduledTime: data.scheduledTime,
    });

    if (isSnooze && data.snoozeId) {
      dismissNotification(`snooze-${data.snoozeId}`);
    } else {
      dismissNotification(`alarm-${data.medicineId}-${data.reminderTimeId}`);
    }
  };

  // Aksiyon işle (bildirim butonlarından)
  const handleAction = async (actionId: string, data: any) => {
    console.log('Aksiyon:', actionId, data);

    if (!data?.medicineId || !data?.reminderTimeId) return;

    const notificationId = `alarm-${data.medicineId}-${data.reminderTimeId}`;

    if (actionId === 'take') {
      // İlaç alındı olarak işaretle (medicineId fallback ile)
      logMedicineTaken(
        data.reminderTimeId,
        data.scheduledTime || new Date().toISOString(),
        data.medicineId
      );
      await dismissNotification(notificationId);
      console.log('İlaç alındı işaretlendi:', data.medicineId);
    } else if (actionId === 'skip') {
      // İlaç atlandı olarak işaretle (medicineId fallback ile)
      logMedicineSkipped(
        data.reminderTimeId,
        data.scheduledTime || new Date().toISOString(),
        data.medicineId
      );
      await dismissNotification(notificationId);
      console.log('İlaç atlandı işaretlendi:', data.medicineId);
    } else if (actionId === 'snooze') {
      if (processedSnoozesRef.current.has(notificationId)) {
        console.log('Bu bildirim için snooze zaten yapıldı, atlanıyor:', notificationId);
        return;
      }
      processedSnoozesRef.current.add(notificationId);

      setTimeout(() => {
        processedSnoozesRef.current.delete(notificationId);
      }, 30000);

      await dismissNotification(notificationId);

      const storeState = useMedicineStore.getState();
      const medicine = storeState.getMedicineById(data.medicineId);
      if (medicine) {
        const reminderTimes = storeState.getReminderTimesForMedicine(data.medicineId);
        const reminderTime = reminderTimes.find(
          (rt: { id: string }) => rt.id === data.reminderTimeId
        );
        if (reminderTime) {
          const snoozeDuration = settings.snoozeDuration || 5;
          const snoozeId = generateId();
          const originalScheduledTime = data.scheduledTime || new Date().toISOString();

          const existingSnoozeCount = storeState.snoozes.filter(
            s =>
              s.medicineId === data.medicineId &&
              s.reminderTimeId === data.reminderTimeId &&
              s.originalScheduledTime === originalScheduledTime
          ).length;

          const result = await scheduleSnoozeNotification({
            medicine,
            reminderTime,
            snoozeDuration,
            snoozeId,
            originalScheduledTime,
            snoozeCount: existingSnoozeCount + 1,
          });

          if (result) {
            storeState.createSnooze(
              data.medicineId,
              data.reminderTimeId,
              originalScheduledTime,
              result.triggerTime,
              result.notificationId
            );
            console.log("Snooze oluşturuldu ve DB'ye kaydedildi:", result.notificationId);
          }
        }
      }
    } else if (actionId === 'stop') {
      // Sadece bildirimi kapat (ilaç durumunu değiştirme)
      await dismissNotification(notificationId);
      console.log('Alarm kapatıldı:', data.medicineId);
    }
  };

  useEffect(() => {
    const performStartupCleanup = async () => {
      try {
        const storeState = useMedicineStore.getState();
        const medicines = storeState.medicines;
        const validMedicineIds = medicines.map(m => m.id);

        if (validMedicineIds.length === 0) {
          appLog.debug('No medicines, cancelling all notifications');
          await cancelAllNotifications();
        } else {
          const cancelledCount = await cleanupOrphanNotifications(validMedicineIds);
          if (cancelledCount > 0) {
            appLog.debug('Orphan notification cleanup done', { cancelledCount });
          }
        }

        const staleCount = await storeState.cleanupStaleSnoozes();
        if (staleCount > 0) {
          appLog.debug('Stale snooze cleanup done', { staleCount });
        }

        if (validMedicineIds.length > 0) {
          const result = await reRegisterAllAlarms('app_startup');
          appLog.debug('Startup alarm re-register done', { ...result });
        }

        const recovery = await getBootRecoveryResult();
        if (recovery && (recovery.reminders > 0 || recovery.snoozes > 0)) {
          setBootRecovery(recovery);
          await clearBootRecoveryResult();
        }
      } catch (error) {
        appLog.error('Startup cleanup failed', error);
      }
    };

    performStartupCleanup();
  }, []);

  // Notifee event listener'larını kur
  useEffect(() => {
    // Bildirim kanallarını oluştur
    createNotificationChannels();

    // Foreground event listener
    const unsubscribe = setupNotificationListeners(navigateToAlarm, handleAction);

    // Background event handler artık index.ts'te register ediliyor

    const checkInitialNotification = async () => {
      const initialNotification = await notifee.getInitialNotification();
      if (initialNotification) {
        console.log('Initial notification bulundu:', initialNotification);
        const data = initialNotification.notification.data;
        if (data?.medicineId && data?.reminderTimeId) {
          setPendingAlarm({
            medicineId: data.medicineId as string,
            reminderTimeId: data.reminderTimeId as string,
            scheduledTime: (data.scheduledTime as string) || new Date().toISOString(),
            isSnooze: data.isSnooze as string | undefined,
            snoozeId: data.snoozeId as string | undefined,
          });
          return;
        }
      }

      await checkDisplayedNotifications();
    };
    checkInitialNotification();

    // Periyodik olarak displayed notifications kontrol et (DELIVERED event fallback)
    // Bu, event tetiklenmese bile alarm ekranını açmayı sağlar
    let isNavigatingToAlarm = false; // Çoklu navigate'i engelle

    const checkDisplayedNotifications = async () => {
      if (isNavigatingToAlarm) return;

      const displayedNotifications = await notifee.getDisplayedNotifications();

      for (const notification of displayedNotifications) {
        const data = notification.notification.data;
        if (data?.fullScreenAlarm === 'true' && data?.medicineId && data?.reminderTimeId) {
          const notificationId = notification.notification.id;
          const medicineId = data.medicineId as string;
          const reminderTimeId = data.reminderTimeId as string;
          const isSnooze = data.isSnooze === 'true';
          const snoozeId = data.snoozeId as string | undefined;

          console.log(
            'Full screen alarm bildirimi bulundu (polling):',
            notificationId,
            isSnooze ? '(snooze)' : ''
          );

          const isTestMode = medicineId === 'test-medicine';
          if (!isTestMode) {
            const storeState = useMedicineStore.getState();
            const medicine = storeState.getMedicineById(medicineId);

            if (!medicine) {
              logAlarmFailure(
                isSnooze ? 'snooze' : 'reminder',
                'MEDICATION_DELETED',
                { medicineId, reminderTimeId, snoozeId },
                { source: 'polling' }
              );
              if (notificationId) {
                await notifee.cancelDisplayedNotification(notificationId);
              }
              cancelMedicineNotifications(medicineId);
              continue;
            }

            const medicineLogs = storeState.medicineLogs;
            const today = new Date().toISOString().split('T')[0];
            const alreadyLogged = medicineLogs.some(
              log =>
                log.reminderTimeId === reminderTimeId &&
                log.scheduledTime.startsWith(today) &&
                (log.status === 'taken' || log.status === 'skipped')
            );

            if (alreadyLogged) {
              logAlarmFailure(
                isSnooze ? 'snooze' : 'reminder',
                'ALREADY_LOGGED',
                { medicineId, reminderTimeId, snoozeId },
                { source: 'polling' }
              );
              if (notificationId) {
                await notifee.cancelDisplayedNotification(notificationId);
              }
              if (isSnooze && snoozeId) {
                storeState.deactivateSnooze(snoozeId);
              }
              continue;
            }

            if (isSnooze && snoozeId && !snoozeId.startsWith('bg-')) {
              const snooze = storeState.snoozes.find(s => s.id === snoozeId);
              if (snooze && !snooze.isActive) {
                logAlarmFailure(
                  'snooze',
                  'SNOOZE_INACTIVE',
                  { medicineId, reminderTimeId, snoozeId },
                  { source: 'polling' }
                );
                if (notificationId) {
                  await notifee.cancelDisplayedNotification(notificationId);
                }
                continue;
              }
            }
          }

          isNavigatingToAlarm = true;

          if (notificationId) {
            await notifee.cancelDisplayedNotification(notificationId);
            console.log('Bildirim iptal edildi (polling):', notificationId);
          }

          const alarmData = {
            medicineId: medicineId,
            reminderTimeId: reminderTimeId,
            scheduledTime: (data.scheduledTime as string) || new Date().toISOString(),
            isSnooze: data.isSnooze as string | undefined,
            snoozeId: snoozeId,
          };

          if (navigationRef.current?.isReady()) {
            navigateToAlarm(alarmData);
          } else {
            setPendingAlarm(alarmData);
          }

          setTimeout(() => {
            isNavigatingToAlarm = false;
          }, 3000);

          return;
        }
      }
    };

    // Her 2 saniyede bir kontrol et
    const pollingInterval = setInterval(checkDisplayedNotifications, 2000);

    return () => {
      unsubscribe();
      clearInterval(pollingInterval);
    };
  }, []);

  useEffect(() => {
    if (pendingAlarm && navigationRef.current?.isReady()) {
      navigateToAlarm(pendingAlarm);
      setPendingAlarm(null);
    }
  }, [pendingAlarm]);

  useEffect(() => {
    if (bootRecovery) {
      const total = bootRecovery.reminders + bootRecovery.snoozes;
      const triggerName = getTriggerDisplayName(bootRecovery.trigger);

      Alert.alert(
        '✅ Alarmlar Senkronize Edildi',
        `${triggerName} sonrası ${bootRecovery.reminders} hatırlatma${bootRecovery.snoozes > 0 ? ` ve ${bootRecovery.snoozes} erteleme` : ''} yeniden planlandı.`,
        [{ text: 'Tamam', style: 'default' }]
      );
      setBootRecovery(null);
    }
  }, [bootRecovery]);

  // Auth yüklenirken loading göster
  if (authLoading || showPermissions === null) {
    return <LoadingScreen />;
  }

  // İzin ekranını göster (giriş yapıldıktan sonra)
  if (isAuthenticated && showPermissions) {
    return (
      <NavigationContainer>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <PermissionsScreen onComplete={handlePermissionsComplete} />
      </NavigationContainer>
    );
  }

  // Giriş yapılmamışsa Auth ekranlarını göster
  if (!isAuthenticated) {
    return (
      <NavigationContainer>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <AuthNavigator />
      </NavigationContainer>
    );
  }

  // Giriş yapılmışsa ana uygulamayı göster
  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        // Navigation hazır olduğunda pending alarm varsa yönlendir
        if (pendingAlarm) {
          navigateToAlarm(pendingAlarm);
          setPendingAlarm(null);
        }
      }}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.header,
          },
          headerShadowVisible: false,
          headerTitleStyle: {
            fontWeight: '600',
            color: colors.headerText,
          },
          headerBackTitle: t('back'),
          headerTintColor: colors.primary,
        }}
      >
        <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen
          name="AddMedicine"
          component={AddMedicineScreen}
          options={({ route }) => ({
            title: route.params?.medicineId ? t('edit_medicine_title') : t('add_medicine_title'),
            presentation: 'modal',
          })}
        />
        <Stack.Screen
          name="Alarm"
          component={AlarmScreen}
          options={{
            headerShown: false,
            presentation: 'fullScreenModal',
            animation: 'fade',
          }}
        />
        <Stack.Screen
          name="Interactions"
          component={InteractionsScreen}
          options={{
            title: t('interaction_title'),
          }}
        />
        <Stack.Screen
          name="BarcodeScanner"
          component={BarcodeScannerScreen}
          options={{
            headerShown: false,
            presentation: 'fullScreenModal',
          }}
        />
        <Stack.Screen
          name="MedicineProspectus"
          component={MedicineProspectusScreen}
          options={{
            title: t('prospectus_title') || 'Prospektüs',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="Premium"
          component={PremiumScreen}
          options={{
            title: 'Premium',
            presentation: 'modal',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <SubscriptionProvider>
              <AlertProvider>
                <AppContent />
              </AlertProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
