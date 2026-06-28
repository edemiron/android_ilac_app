// Polyfill for crypto.getRandomValues (required for uuid package)
import 'react-native-get-random-values';

import React, { useEffect, useRef, Suspense, lazy } from 'react';
import {
  StatusBar,
  View,
  Platform,
  ActivityIndicator,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Text,
  AppState,
  PanResponder,
  Dimensions,
  Animated,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import notifee from '@notifee/react-native';
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
  // BarcodeScannerScreen - lazy loaded to avoid vision-camera startup cost
  LoginScreen,
  RegisterScreen,
  MedicineProspectusScreen,
  PremiumScreen,
  PermissionsScreen,
  SecurityScreen,
  TtsSettingsScreen,
  CaregiverScreen,
  CaregiverInviteScreen,
} from './src/screens';

// Lazy load BarcodeScannerScreen - vision-camera is HEAVY and slows startup by ~5s
const BarcodeScannerScreen = lazy(() => import('./src/screens/BarcodeScannerScreen'));
import { RootStackParamList, MainTabParamList, AuthStackParamList } from './src/types';
import {
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
import ErrorBoundary from './src/components/common/ErrorBoundary';
import { usePermissionsGate } from './src/hooks/usePermissionsGate';
import { useSecurityGate } from './src/hooks/useSecurityGate';
import { useBootRecovery } from './src/hooks/useBootRecovery';
import { useAlarmQueue } from './src/hooks/useAlarmQueue';
import {
  getBootRecoveryResult,
  clearBootRecoveryResult,
  reRegisterAllAlarms,
} from './src/utils/bootHandler';
import { isAlarmHandled } from './index';
import { createScopedLogger } from './src/utils/logger';
import { STORAGE_KEYS } from './src/constants';

const appLog = createScopedLogger('App');

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

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
  const { t, language } = useLanguage();

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

// Custom Tab Bar with Center FAB and swipe navigation
interface CustomTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

function CustomTabBar({ state, descriptors, navigation }: CustomTabBarProps) {
  const { colors, isDark } = useTheme();
  const { t, language } = useLanguage();

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
  const { colors } = useTheme();
  const { t } = useLanguage();

  const TAB_ROUTES = ['Home', 'Medicines', 'Statistics', 'Settings'];
  const tabNavRef = React.useRef<any>(null);
  const tabIndexRef = React.useRef<number>(0);
  const EDGE_ZONE = 36;
  const SCREEN_WIDTH = Dimensions.get('window').width;
  const SLIDE_DURATION = 220;

  // Animasyon degeri
  const translateX = React.useRef(new Animated.Value(0)).current;
  const isSwiping = React.useRef(false);

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: evt => {
          const x = evt.nativeEvent.pageX;
          return x < EDGE_ZONE || x > SCREEN_WIDTH - EDGE_ZONE;
        },
        onMoveShouldSetPanResponder: (_e, gs) =>
          Math.abs(gs.dx) > 8 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.2,
        onPanResponderGrant: () => {
          isSwiping.current = true;
          translateX.stopAnimation();
        },
        onPanResponderMove: (_e, gs) => {
          // Parmakla birlikte kaydir (damped - %35)
          translateX.setValue(gs.dx * 0.35);
        },
        onPanResponderRelease: (_e, gs) => {
          isSwiping.current = false;
          const nav = tabNavRef.current;
          const idx = tabIndexRef.current;

          const isSignificant = Math.abs(gs.dx) > 50 || Math.abs(gs.vx) > 0.3;
          const nextIdx =
            gs.dx < 0 ? Math.min(idx + 1, TAB_ROUTES.length - 1) : Math.max(idx - 1, 0);

          if (!isSignificant || nextIdx === idx || !nav) {
            // Snap back
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              tension: 120,
              friction: 9,
            }).start();
            return;
          }

          // 1) Ekrani dis tarafa kaydir
          const outDir = gs.dx < 0 ? -SCREEN_WIDTH : SCREEN_WIDTH;
          Animated.timing(translateX, {
            toValue: outDir * 0.4,
            duration: SLIDE_DURATION,
            useNativeDriver: true,
          }).start(() => {
            // 2) Tab'i degistir
            nav.navigate(TAB_ROUTES[nextIdx]);
            // 3) Karsı taraftan giris pozisyonuna al (ani)
            translateX.setValue(-outDir * 0.3);
            // 4) Merkeze slide-in
            Animated.timing(translateX, {
              toValue: 0,
              duration: SLIDE_DURATION,
              useNativeDriver: true,
            }).start();
          });
        },
        onPanResponderTerminate: () => {
          isSwiping.current = false;
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      <Animated.View style={{ flex: 1, transform: [{ translateX }] }}>
        <Tab.Navigator
          tabBar={props => {
            tabNavRef.current = props.navigation;
            tabIndexRef.current = props.state.index;
            return <CustomTabBar {...props} />;
          }}
          screenOptions={{
            headerStyle: { backgroundColor: colors.header },
            headerShadowVisible: false,
            headerTitleStyle: { fontWeight: '600', color: colors.headerText },
          }}
        >
          <Tab.Screen
            name="Home"
            component={HomeScreen}
            options={{ headerShown: false, title: t('tab_home') }}
          />
          <Tab.Screen
            name="Medicines"
            component={MedicinesScreen}
            options={{ title: t('tab_medicines'), headerTitle: t('tab_medicines') }}
          />
          <Tab.Screen
            name="Statistics"
            component={StatisticsScreen}
            options={{ title: t('tab_statistics'), headerTitle: t('tab_statistics') }}
          />
          <Tab.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: t('tab_settings'), headerTitle: t('tab_settings') }}
          />
        </Tab.Navigator>
      </Animated.View>
    </View>
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

// Lazy-loaded BarcodeScanner wrapper (vision-camera is heavy)
function LazyBarcodeScannerScreen(props: any) {
  const { colors } = useTheme();
  return (
    <Suspense
      fallback={
        <View style={[loadingStyles.container, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      }
    >
      <BarcodeScannerScreen {...props} />
    </Suspense>
  );
}

// Main App Content with Navigation
function AppContent() {
  const navigationRef = useRef<any>(null);
  const processedSnoozesRef = useRef<Set<string>>(new Set()); // Snooze işlemi yapılmış notification'lar
  const activeAlarmKeysRef = useRef<Set<string>>(new Set()); // Şu an açık olan alarm key'leri (duplicate guard)
  const { colors, isDark } = useTheme();
  const { t, language } = useLanguage();
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

  // Pending alarm queue (App.tsx'ten çıkartıldı, useAlarmQueue hook'una taşındı)
  const { pendingAlarm, setPendingAlarm } = useAlarmQueue();
  // Boot recovery (App.tsx'ten çıkartıldı, useBootRecovery hook'una taşındı)
  const { bootRecovery, clearBootRecovery } = useBootRecovery();

  // İzin ekranı gate (App.tsx'ten çıkartıldı, usePermissionsGate hook'una taşındı)
  const { showPermissions, handlePermissionsComplete } = usePermissionsGate();

  // Güvenlik kapısı (App.tsx'ten çıkartıldı, useSecurityGate hook'una taşındı)
  const {
    securityCheckComplete,
    showPinEntry,
    pinInput,
    setPinInput,
    securitySettings,
    handlePinVerify,
  } = useSecurityGate();

  // Auth durumu değiştiğinde store'u güncelle ve sync yap
  useEffect(() => {
    if (isAuthenticated && user) {
      setUserId(user.uid);
      syncFromCloud().catch(console.error);
    } else {
      setUserId(null);
    }
  }, [isAuthenticated, user]);

  const navigateToAlarm = async (data: {
    medicineId: string;
    reminderTimeId: string;
    scheduledTime: string;
    isSnooze?: string;
    snoozeId?: string;
    snoozeCount?: string;
    originalScheduledTime?: string;
  }) => {
    console.log('🔴 navigateToAlarm:', data.medicineId, data.reminderTimeId);

    // KRİTİK: Bu alarm zaten handle edildi mi? (ertele/aldım/dismiss)
    const today = new Date().toISOString().split('T')[0];
    const alarmKey = `${data.medicineId}-${data.reminderTimeId}-${today}`;
    const handled = await isAlarmHandled(alarmKey);
    if (handled) {
      appLog.debug('Alarm already handled, skipping', { alarmKey });
      return;
    }

    // DUPLICATE GUARD: Aynı alarm key için zaten ekran açıksa tekrar açma
    if (activeAlarmKeysRef.current.has(alarmKey)) {
      appLog.debug('Alarm already active on screen, skipping duplicate', { alarmKey });
      return;
    }
    activeAlarmKeysRef.current.add(alarmKey);
    // 60 saniye sonra guard'ı temizle (alarm ekranı kapanmış olmalı)
    setTimeout(() => activeAlarmKeysRef.current.delete(alarmKey), 60_000);

    const isTestMode = data.medicineId === 'test-medicine';
    const isSnooze = data.isSnooze === 'true';

    if (!isTestMode) {
      const storeState = useMedicineStore.getState();
      const medicine = storeState.getMedicineById(data.medicineId);

      if (!medicine) {
        appLog.warn('Alarm: ilaç silinmiş', {
          medicineId: data.medicineId,
          reminderTimeId: data.reminderTimeId,
        });
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
        appLog.warn('Alarm: zaten loglanmış', {
          medicineId: data.medicineId,
          reminderTimeId: data.reminderTimeId,
        });
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
          appLog.warn('Alarm: snooze inaktif', {
            snoozeId: data.snoozeId,
            medicineId: data.medicineId,
          });
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
      snoozeCount: data.snoozeCount ? parseInt(data.snoozeCount, 10) : undefined,
      originalScheduledTime: data.originalScheduledTime,
    });

    // KRİTİK: Navigate sonrası bildirimi HEMEN iptal et
    // Foreground DELIVERED handler'ın tekrar tetiklenmesini engeller
    const mainNotifId = `alarm-${data.medicineId}-${data.reminderTimeId}`;
    try {
      await notifee.cancelDisplayedNotification(mainNotifId);
    } catch (_e) {
      /* */
    }

    if (isSnooze && data.snoozeId) {
      dismissNotification(`snooze-${data.snoozeId}`);
    } else {
      dismissNotification(mainNotifId);
      cancelMedicineNotifications(data.medicineId);
    }
  };

  // Aksiyon işle (bildirim butonlarından)
  const handleAction = async (actionId: string, data: any) => {
    console.log('Aksiyon:', actionId, data);

    if (!data?.medicineId || !data?.reminderTimeId) return;

    const notificationId = `alarm-${data.medicineId}-${data.reminderTimeId}`;

    if (actionId === 'take' || actionId === 'taken') {
      // İlaç alındı olarak işaretle (medicineId fallback ile)
      logMedicineTaken(
        data.reminderTimeId,
        data.scheduledTime || new Date().toISOString(),
        data.medicineId
      );
      await dismissNotification(notificationId);
      // Kalıcı bildirim varsa onu da kaldır
      if (data.isPersistent === 'true') {
        await dismissNotification(`persistent-${data.medicineId}-${data.reminderTimeId}`);
      }
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
      // Bildirimi kapat
      await dismissNotification(notificationId);
      try {
        await notifee.cancelNotification(notificationId);
      } catch (_e) {
        /* ignore */
      }
      console.log('Alarm kapatıldı:', data.medicineId);
    }
  };

  // Notifee event listener'larını kur
  useEffect(() => {
    const performStartupCleanup = async () => {
      try {
        // Eski displayed bildirimleri temizle
        // Sadece non-alarm bildirimleri ve zaten handle edilmiş alarmları temizle
        const displayedNotifications = await notifee.getDisplayedNotifications();
        const today = new Date().toISOString().split('T')[0];

        for (const notification of displayedNotifications) {
          const id = notification.notification.id;
          const data = notification.notification.data;
          if (!id) continue;

          // Non-alarm bildirimleri temizle
          if (!id.startsWith('alarm-') && !id.startsWith('snooze-')) {
            await notifee.cancelDisplayedNotification(id);
            continue;
          }

          // Alarm bildirimi — handle edildi mi kontrol et
          if (data?.medicineId && data?.reminderTimeId) {
            const key = `${data.medicineId}-${data.reminderTimeId}-${today}`;
            const handled = await isAlarmHandled(key);
            if (handled) {
              await notifee.cancelDisplayedNotification(id);
              appLog.debug('Startup: Handled alarm temizlendi', { id });
            }
          }
        }

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

        // Alarmları yeniden planla
        if (validMedicineIds.length > 0) {
          const result = await reRegisterAllAlarms('app_startup');
          appLog.debug('Startup alarm re-register done', { ...result });
        }

        const recovery = await getBootRecoveryResult();
        if (recovery && (recovery.reminders > 0 || recovery.snoozes > 0)) {
          // setBootRecovery useBootRecovery hook'unda — burada bir sey yapmaya gerek yok.
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
    // Foreground event listener
    const unsubscribe = setupNotificationListeners(navigateToAlarm, handleAction);

    // Background event handler artık index.ts'te register ediliyor

    const checkInitialNotification = async () => {
      // 1. Önce AsyncStorage'daki pending-alarm'ı kontrol et (BG handler'dan gelir)
      try {
        const pendingRaw = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_ALARM);
        if (pendingRaw) {
          await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_ALARM);
          const pending = JSON.parse(pendingRaw);
          // 60 saniye içinde yazıldıysa geçerli
          if (pending.ts && Date.now() - pending.ts < 60_000 && pending.medicineId) {
            appLog.debug('pending-alarm found', {
              medicineId: pending.medicineId,
              snoozeCount: pending.snoozeCount,
              ageMs: Date.now() - pending.ts,
            });
            const today = new Date().toISOString().split('T')[0];
            const key = `${pending.medicineId}-${pending.reminderTimeId}-${today}`;
            const handled = await isAlarmHandled(key);
            if (!handled) {
              setPendingAlarm({
                medicineId: pending.medicineId,
                reminderTimeId: pending.reminderTimeId,
                scheduledTime: pending.scheduledTime,
                isSnooze: pending.isSnooze,
                snoozeId: pending.snoozeId,
                snoozeCount: pending.snoozeCount,
                originalScheduledTime: pending.originalScheduledTime,
              });
              return; // pending-alarm bulundu, initialNotification'a bakmaya gerek yok
            }
          }
        }
      } catch (_e) {
        /* ignore */
      }

      // 2. Notifee initialNotification (kullanıcı bildirime tıkladığında)
      const initialNotification = await notifee.getInitialNotification();
      if (initialNotification) {
        console.log('Initial notification bulundu:', initialNotification);
        const { notification, pressAction: initPressAction } = initialNotification;
        const data = notification.data;

        // Action butonuyla açıldıysa alarm ekranı atla
        if (initPressAction?.id && initPressAction.id !== 'default') {
          console.log('Action butonuyla açıldı, alarm ekranı atlanıyor:', initPressAction.id);
          return;
        }

        // Bu alarm zaten handle edildi mi kontrol et (ertele/aldım)
        if (data?.medicineId && data?.reminderTimeId) {
          const today = new Date().toISOString().split('T')[0];
          const key = `${data.medicineId}-${data.reminderTimeId}-${today}`;
          const handled = await isAlarmHandled(key);
          if (handled) {
            console.log('Alarm already handled, skipping alarm screen:', key);
            return;
          }

          setPendingAlarm({
            medicineId: data.medicineId as string,
            reminderTimeId: data.reminderTimeId as string,
            scheduledTime: (data.scheduledTime as string) || new Date().toISOString(),
            originalScheduledTime: data.originalScheduledTime as string | undefined,
            isSnooze: data.isSnooze as string | undefined,
            snoozeId: data.snoozeId as string | undefined,
            snoozeCount: data.snoozeCount as string | undefined,
          });
        }
      }
    };
    checkInitialNotification();

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (pendingAlarm && navigationRef.current?.isReady()) {
      navigateToAlarm(pendingAlarm);
      setPendingAlarm(null);
    }
  }, [pendingAlarm]);

  // KRİTİK: Uygulama arka plandan öne geldiğinde pending-alarm kontrol et
  // wakeAndOpenApp warm start'ta uygulamayı öne getirir ama checkInitialNotification
  // sadece mount'ta çalışır — bu listener o boşluğu kapatır
  useEffect(() => {
    const appStateListener = AppState.addEventListener('change', async nextState => {
      if (nextState === 'active') {
        try {
          const pendingRaw = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_ALARM);
          if (pendingRaw) {
            await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_ALARM);
            const pending = JSON.parse(pendingRaw);
            if (pending.ts && Date.now() - pending.ts < 60_000 && pending.medicineId) {
              appLog.debug('AppState active: pending-alarm found', {
                medicineId: pending.medicineId,
                ageMs: Date.now() - pending.ts,
              });
              const today = new Date().toISOString().split('T')[0];
              const key = `${pending.medicineId}-${pending.reminderTimeId}-${today}`;
              const handled = await isAlarmHandled(key);
              if (!handled) {
                setPendingAlarm({
                  medicineId: pending.medicineId,
                  reminderTimeId: pending.reminderTimeId,
                  scheduledTime: pending.scheduledTime,
                  isSnooze: pending.isSnooze,
                  snoozeId: pending.snoozeId,
                  snoozeCount: pending.snoozeCount,
                  originalScheduledTime: pending.originalScheduledTime,
                });
              }
            }
          }
        } catch (_e) {
          /* ignore */
        }
      }
    });

    return () => appStateListener.remove();
  }, []);

  useEffect(() => {
    if (bootRecovery) {
      const total = bootRecovery.reminders + bootRecovery.snoozes;
      const triggerName = getTriggerDisplayName(bootRecovery.trigger);

      Alert.alert(
        '✅ Alarmlar Senkronize Edildi',
        `${triggerName} sonrası ${bootRecovery.reminders} hatırlatma${bootRecovery.snoozes > 0 ? ` ve ${bootRecovery.snoozes} erteleme` : ''} yeniden planlandı.`,
        [{ text: 'Tamam', style: 'default' }]
      );
      clearBootRecovery();
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

  // PIN giriş ekranı - Overlay olarak göster
  const renderPinOverlay = () => {
    if (!showPinEntry) return null;

    return (
      <View style={[styles.pinOverlay, { backgroundColor: colors.background }]}>
        <View style={styles.pinContainer}>
          <Text style={[styles.pinTitle, { color: colors.text }]}>
            🔒 {language === 'tr' ? 'Uygulama Kilitli' : 'App Locked'}
          </Text>
          <Text style={[styles.pinSubtitle, { color: colors.textMuted }]}>
            {securitySettings?.securityType === 'biometric'
              ? language === 'tr'
                ? 'Biyometrik doğrulama başarısız. PIN girin.'
                : 'Biometric failed. Enter PIN.'
              : language === 'tr'
                ? 'Devam etmek için PIN girin'
                : 'Enter PIN to continue'}
          </Text>

          <View style={styles.pinInputContainer}>
            <Text style={styles.pinDots}>{Array(pinInput.length).fill('●').join('')}</Text>
          </View>

          <View style={styles.pinPad}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <TouchableOpacity
                key={num}
                style={[styles.pinButton, { backgroundColor: colors.card }]}
                onPress={() => pinInput.length < 6 && setPinInput(pinInput + num)}
              >
                <Text style={[styles.pinButtonText, { color: colors.text }]}>{num}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.pinButton, { backgroundColor: colors.card }]}
              onPress={() => setPinInput('')}
            >
              <Text style={[styles.pinButtonText, { color: colors.text }]}>C</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pinButton, { backgroundColor: colors.card }]}
              onPress={() => pinInput.length < 6 && setPinInput(pinInput + '0')}
            >
              <Text style={[styles.pinButtonText, { color: colors.text }]}>0</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.pinButton,
                styles.pinConfirmButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={handlePinVerify}
            >
              <Text style={styles.pinConfirmText}>✓</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // Güvenlik kontrolü loading - Overlay olarak
  const renderSecurityLoading = () => {
    if (securityCheckComplete || !isAuthenticated) return null;

    return (
      <View style={[styles.pinOverlay, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  };

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
          component={LazyBarcodeScannerScreen}
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
        <Stack.Screen
          name="Security"
          component={SecurityScreen}
          options={{
            title: language === 'tr' ? 'Güvenlik' : 'Security',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="TtsSettings"
          component={TtsSettingsScreen}
          options={{
            title: language === 'tr' ? 'Sesli Bildirimler' : 'Voice Notifications',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="Caregiver"
          component={CaregiverScreen}
          options={{
            title: language === 'tr' ? 'Bakıcı Yönetimi' : 'Caregiver Management',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="CaregiverInvite"
          component={CaregiverInviteScreen}
          options={{
            title: language === 'tr' ? 'Daveti Kabul Et' : 'Accept Invite',
            presentation: 'card',
          }}
        />
      </Stack.Navigator>

      {/* Güvenlik Overlay'leri - App arka planda çalışmaya devam etsin */}
      {renderSecurityLoading()}
      {renderPinOverlay()}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary componentName="App">
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
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  securityContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  pinContainer: {
    alignItems: 'center',
    padding: 32,
    width: '100%',
  },
  pinTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  pinSubtitle: {
    fontSize: 14,
    marginBottom: 32,
    textAlign: 'center',
  },
  pinInputContainer: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  pinDots: {
    fontSize: 32,
    letterSpacing: 16,
    color: '#4ECDC4',
  },
  pinPad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    width: 280,
  },
  pinButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pinButtonText: {
    fontSize: 24,
    fontWeight: '600',
  },
  pinConfirmButton: {
    backgroundColor: '#4ECDC4',
  },
  pinConfirmText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
  },
});
