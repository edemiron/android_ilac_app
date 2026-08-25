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
  DeviceEventEmitter,
  Linking,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler'; // Sprint 97.1
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
  LinkingOptions,
} from '@react-navigation/native';
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
  DutyPharmacyScreen,
  NotificationCenterScreen,
} from './src/screens';

import { useAppFonts } from './src/hooks/useAppFonts'; // Sprint 103.2: Clinical Clarity font gate
import { useHaptics } from './src/hooks/useHaptics';

// Lazy load BarcodeScannerScreen - vision-camera is HEAVY and slows startup by ~5s
const BarcodeScannerScreen = lazy(() => import('./src/screens/BarcodeScannerScreen'));

// Sprint 60: Lazy load OnboardingScreen
const OnboardingScreen = lazy(() => import('./src/screens/OnboardingScreen'));
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
import { UserProfileProvider } from './src/hooks/useUserProfile';
import { AccentProvider } from './src/contexts/AccentContext';
import { OnboardingProvider, useOnboarding } from './src/hooks/useOnboarding';
import { LowStockDismissProvider } from './src/hooks/useLowStockDismiss';
import { LanguageProvider, useLanguage } from './src/contexts/LanguageContext';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { SubscriptionProvider } from './src/contexts/SubscriptionContext';
import { AlertProvider } from './src/contexts/AlertContext';
import ErrorBoundary from './src/components/common/ErrorBoundary';
import { CaregiverEventBridge } from './src/components/CaregiverEventBridge'; // Sprint 72
import { usePermissionsGate } from './src/hooks/usePermissionsGate';
import { useSecurityGate } from './src/hooks/useSecurityGate';
import { useBootRecovery } from './src/hooks/useBootRecovery';
import { useAlarmNavigation, type PendingAlarmData } from './src/hooks/useAlarmNavigation';
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

// Custom Tab Bar with Center Raised Squircle FAB (+ Ekle)
interface CustomTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

function CustomTabBar({ state, descriptors, navigation }: CustomTabBarProps) {
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();
  const haptics = useHaptics();

  const leftTabs = [
    {
      key: 'Home',
      routeName: 'Home',
      label: language === 'tr' ? 'Bugün' : 'Today',
      iconActive: 'home',
      iconInactive: 'home-outline',
      onPress: () => navigation.navigate('Home'),
      tabIndex: 0,
    },
    {
      key: 'Medicines',
      routeName: 'Medicines',
      label: language === 'tr' ? 'İlaçlarım' : 'Medicines',
      iconActive: 'medical',
      iconInactive: 'medical-outline',
      onPress: () => navigation.navigate('Medicines'),
      tabIndex: 1,
    },
  ];

  const rightTabs = [
    {
      key: 'Statistics',
      routeName: 'Statistics',
      label: language === 'tr' ? 'Takvim' : 'Calendar',
      iconActive: 'calendar',
      iconInactive: 'calendar-outline',
      onPress: () => navigation.navigate('Statistics'),
      tabIndex: 2,
    },
    {
      key: 'Settings',
      routeName: 'Settings',
      label: language === 'tr' ? 'Ayarlar' : 'Settings',
      iconActive: 'settings',
      iconInactive: 'settings-outline',
      onPress: () => navigation.navigate('Settings'),
      tabIndex: 3,
    },
  ];

  const handleAddPress = () => {
    haptics.trigger('medium');
    navigation.navigate('AddMedicine');
  };

  return (
    <View style={{ backgroundColor: colors.background }}>
      <View
        style={[
          tabBarStyles.container,
          {
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            borderColor: isDark ? '#334155' : '#E2E8F0',
          },
        ]}
      >
        {/* Sol 2 Tab: Bugün & Takvim */}
        {leftTabs.map(tab => {
          const isFocused = state.index === tab.tabIndex;
          return (
            <TouchableOpacity
              key={tab.key}
              style={tabBarStyles.tab}
              onPress={tab.onPress}
              activeOpacity={0.7}
            >
              <Ionicons
                name={(isFocused ? tab.iconActive : tab.iconInactive) as any}
                size={22}
                color={isFocused ? colors.primary : isDark ? '#94A3B8' : '#64748B'}
              />
              <Text
                style={[
                  tabBarStyles.label,
                  {
                    color: isFocused ? colors.primary : isDark ? '#94A3B8' : '#64748B',
                    fontWeight: isFocused ? '700' : '500',
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Merkez: Yükseltilmiş Squircle FAB (+ Ekle) */}
        <TouchableOpacity
          style={tabBarStyles.centerFabContainer}
          onPress={handleAddPress}
          activeOpacity={0.85}
        >
          <View
            style={[
              tabBarStyles.centerSquircle,
              {
                backgroundColor: colors.primary,
                shadowColor: colors.primary,
              },
            ]}
          >
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </View>
          <Text
            style={[
              tabBarStyles.centerLabel,
              {
                color: isDark ? '#94A3B8' : '#64748B',
              },
            ]}
          >
            {language === 'tr' ? 'Ekle' : 'Add'}
          </Text>
        </TouchableOpacity>

        {/* Sağ 2 Tab: İlaçlarım & Ayarlar */}
        {rightTabs.map(tab => {
          const isFocused = state.index === tab.tabIndex;
          return (
            <TouchableOpacity
              key={tab.key}
              style={tabBarStyles.tab}
              onPress={tab.onPress}
              activeOpacity={0.7}
            >
              <Ionicons
                name={(isFocused ? tab.iconActive : tab.iconInactive) as any}
                size={22}
                color={isFocused ? colors.primary : isDark ? '#94A3B8' : '#64748B'}
              />
              <Text
                style={[
                  tabBarStyles.label,
                  {
                    color: isFocused ? colors.primary : isDark ? '#94A3B8' : '#64748B',
                    fontWeight: isFocused ? '700' : '500',
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const tabBarStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 4,
  },
  label: {
    fontSize: 11.5,
  },
  centerFabContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
  },
  centerSquircle: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  centerLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
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
    <View style={{ flex: 1, backgroundColor: colors.background }} {...panResponder.panHandlers}>
      <Animated.View
        style={{ flex: 1, backgroundColor: colors.background, transform: [{ translateX }] }}
      >
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
            options={{ headerShown: false, title: t('tab_medicines') }}
          />
          <Tab.Screen
            name="Statistics"
            component={StatisticsScreen}
            options={{ headerShown: false, title: t('tab_statistics') }}
          />
          <Tab.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ headerShown: false, title: t('tab_settings') }}
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

// Sprint 60: Lazy Onboarding wrapper
function LazyOnboardingScreen() {
  const { colors } = useTheme();
  return (
    <Suspense
      fallback={
        <View style={[loadingStyles.container, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      }
    >
      <OnboardingScreen />
    </Suspense>
  );
}

// Main App Content with Navigation
function AppContent() {
  const navigationRef = useRef<any>(null);
  const processedSnoozesRef = useRef<Set<string>>(new Set()); // Snooze işlemi yapılmış notification'lar
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

  const navTheme = React.useMemo(
    () => ({
      ...(isDark ? DarkTheme : DefaultTheme),
      colors: {
        ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
        background: colors.background,
        card: colors.card,
        text: colors.text,
        border: colors.border,
        primary: colors.primary,
      },
    }),
    [isDark, colors]
  );

  // Pending alarm queue + navigation — Sprint 6 DRY refactor:
  // Hook artık sadece React state'i tutar; tüm alarm validation/snooze/navigate
  // mantığı utils/alarmNavigation.ts içindeki `handleIncomingAlarmNavigation`
  // pure fonksiyonuna delege edilir. Hook kendisi useMedicineStore.getState()
  // ile store action'larına erişir, dolayısıyla App.tsx options yüzeyi
  // 8 callback'ten 4'e indi.
  const { pendingAlarm, setPendingAlarm, handleIncomingAlarm } = useAlarmNavigation({
    isNavigationReady: () => navigationRef.current?.isReady() ?? false,
    isAlarmAlreadyHandled: async (
      medicineId: string,
      reminderTimeId: string,
      scheduledTime: string
    ) => {
      if (medicineId === 'test-medicine') return false;
      const today = new Date().toISOString().split('T')[0];
      return await isAlarmHandled(`${medicineId}-${reminderTimeId}-${today}`);
    },
    navigateToAlarmScreen: (data: PendingAlarmData) => {
      navigationRef.current?.navigate('Alarm', {
        medicineId: data.medicineId,
        reminderTimeId: data.reminderTimeId,
        scheduledTime: data.scheduledTime,
        snoozeCount: data.snoozeCount ? parseInt(data.snoozeCount, 10) : undefined,
        originalScheduledTime: data.originalScheduledTime,
      });
      // Bildirimi HEMEN iptal et — foreground DELIVERED handler tekrar tetiklenmesin
      notifee
        .cancelDisplayedNotification(`alarm-${data.medicineId}-${data.reminderTimeId}`)
        .catch(() => undefined);
    },
    cancelMedicineNotifications,
  });
  // Boot recovery (App.tsx'ten çıkartıldı, useBootRecovery hook'una taşındı)
  const { bootRecovery, clearBootRecovery } = useBootRecovery();

  // İzin ekranı gate (App.tsx'ten çıkartıldı, usePermissionsGate hook'una taşındı)
  const { showPermissions, handlePermissionsComplete } = usePermissionsGate();

  // Sprint 60: Onboarding gate — yeni kullanıcılar için 4 slide akış
  const { isLoading: onboardingLoading, isCompleted: onboardingCompleted } = useOnboarding();

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

  // navigateToAlarm callback'i tamamen useAlarmNavigation hook'una tasindi (Sprint 5).
  // Inline 115 satirlik callback buradan cikarildi — bkz: src/hooks/useAlarmNavigation.ts.

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
    const unsubscribe = setupNotificationListeners(handleIncomingAlarm, handleAction);

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

  // pendingAlarm hazir oldugunda navigate etme islemi useAlarmNavigation hook'u
  // icinde yonetiliyor (src/hooks/useAlarmNavigation.ts:148-153). Bu effect kaldirildi.

  // KRİTİK: Uygulama arka plandan öne geldiğinde pending-alarm kontrol et
  // Native modülden gelen anlık alarm tetikleme event'i
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('OnAlarmTriggered', async (data: any) => {
      appLog.debug('DeviceEventEmitter OnAlarmTriggered received', data);
      if (data?.medicineId) {
        handleIncomingAlarm({
          medicineId: data.medicineId,
          reminderTimeId: data.reminderTimeId || 'test-reminder',
          scheduledTime: data.scheduledTime || new Date().toISOString(),
          isSnooze: data.isSnooze,
          snoozeId: data.snoozeId,
          snoozeCount: data.snoozeCount,
          originalScheduledTime: data.originalScheduledTime,
        });
      }
    });

    return () => sub.remove();
  }, [handleIncomingAlarm]);

  // Deep Link ile gelen alarm URL dinleyicisi
  useEffect(() => {
    const handleUrl = ({ url }: { url: string }) => {
      appLog.debug('Linking URL received', { url });
      if (url.includes('alarm')) {
        AsyncStorage.getItem(STORAGE_KEYS.PENDING_ALARM).then(raw => {
          if (raw) {
            AsyncStorage.removeItem(STORAGE_KEYS.PENDING_ALARM);
            const pending = JSON.parse(raw);
            handleIncomingAlarm({
              medicineId: pending.medicineId,
              reminderTimeId: pending.reminderTimeId,
              scheduledTime: pending.scheduledTime,
              isSnooze: pending.isSnooze,
              snoozeId: pending.snoozeId,
              snoozeCount: pending.snoozeCount,
              originalScheduledTime: pending.originalScheduledTime,
            });
          } else {
            handleIncomingAlarm({
              medicineId: 'test-medicine',
              reminderTimeId: 'test-reminder',
              scheduledTime: new Date().toISOString(),
            });
          }
        });
      }
    };

    const sub = Linking.addEventListener('url', handleUrl);
    return () => sub.remove();
  }, [handleIncomingAlarm]);

  // KRİTİK: Uygulama arka plandan öne geldiğinde (active veya inactive/kilit ekranı) pending-alarm kontrol et
  useEffect(() => {
    const appStateListener = AppState.addEventListener('change', async nextState => {
      if (nextState === 'active' || nextState === 'inactive') {
        try {
          const pendingRaw = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_ALARM);
          if (pendingRaw) {
            await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_ALARM);
            const pending = JSON.parse(pendingRaw);
            if (pending.ts && Date.now() - pending.ts < 60_000 && pending.medicineId) {
              appLog.debug('AppState changed: pending-alarm found', {
                nextState,
                medicineId: pending.medicineId,
                ageMs: Date.now() - pending.ts,
              });
              const isTest =
                pending.medicineId === 'test-medicine' || pending.isTestAlarm === 'true';
              const today = new Date().toISOString().split('T')[0];
              const key = `${pending.medicineId}-${pending.reminderTimeId}-${today}`;
              const handled = !isTest && (await isAlarmHandled(key));
              if (!handled) {
                handleIncomingAlarm({
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
  }, [handleIncomingAlarm]);

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
    if (pendingAlarm) return null;

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
  // Sprint 60: Onboarding gate — yeni kullanıcılar için
  if (!onboardingLoading && !onboardingCompleted) {
    return <LazyOnboardingScreen />;
  }

  const appLinking: LinkingOptions<RootStackParamList> = {
    prefixes: ['ilachatirlatici://'],
    config: {
      screens: {
        Alarm: 'alarm',
        CaregiverInvite: 'caregiver/invite/:inviteCode',
        Main: {
          screens: {
            Home: 'home',
            Medicines: 'medicines',
            Statistics: 'statistics',
            Settings: 'settings',
          },
        },
      },
    },
  };

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navTheme}
      linking={appLinking}
      onReady={() => {
        // Navigation hazır olduğunda pending alarm varsa yönlendir.
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
            headerShown: false,
            title: language === 'tr' ? 'Güvenlik' : 'Security',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="TtsSettings"
          component={TtsSettingsScreen}
          options={{
            headerShown: false,
            title: language === 'tr' ? 'Sesli Bildirimler' : 'Voice Notifications',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="Caregiver"
          component={CaregiverScreen}
          options={{
            headerShown: false,
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
        <Stack.Screen
          name="DutyPharmacy"
          component={DutyPharmacyScreen}
          options={{
            headerShown: false,
            title: language === 'tr' ? 'Nöbetçi Eczaneler' : 'Duty Pharmacies',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="NotificationCenter"
          component={NotificationCenterScreen}
          options={{
            headerShown: false,
            title: language === 'tr' ? 'Bildirim & Hatırlatma Merkezi' : 'Notification Center',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="Permissions"
          component={PermissionsScreen}
          options={{
            headerShown: false,
            title: language === 'tr' ? 'Sistem İzinleri & Teşhis' : 'System Permissions',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{
            headerShown: false,
            title: language === 'tr' ? 'Giriş Yap' : 'Login',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{
            headerShown: false,
            title: language === 'tr' ? 'Kayıt Ol' : 'Register',
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
    // Sprint 97.1: GestureHandlerRootView en dista — react-native-gesture-handler
    // ve Reanimated 4 tabanli gesture/moti animasyonlarinin calismasi icin zorunlu.
    <GestureHandlerRootView style={styles.gestureRoot}>
      <SafeAreaProvider>
        <ErrorBoundary componentName="App">
          {/* Sprint 103.2: AppWithFonts font gate — ErrorBoundary sarmalaması
              sayesinde useFonts error'ı yakalanır ve LoadingScreen fallback'i
              provider tree'ye girmeden önce çalışır. */}
          <AppWithFonts />
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppWithFonts() {
  // Sprint 103.5: ThemeProvider + UserProfileProvider + AccentProvider en üstte —
  // LoadingScreen useTheme() çağırıyor, font loading gate'i bunlardan ÖNCE
  // sarmalarsak "useTheme must be used within a ThemeProvider" exception'ı
  // fırlatılır ve ErrorBoundary catch eder (Sprint 103.4 sonrası test crash).
  return (
    <UserProfileProvider>
      <AccentProvider>
        <ThemeProvider>
          <AppRoot />
        </ThemeProvider>
      </AccentProvider>
    </UserProfileProvider>
  );
}

function AppRoot() {
  const fontsLoaded = useAppFonts();
  if (!fontsLoaded) return <LoadingScreen />;
  return (
    <LowStockDismissProvider>
      <OnboardingProvider>
        <LanguageProvider>
          <AuthProvider>
            <SubscriptionProvider>
              <AlertProvider>
                {/* Sprint 72: CaregiverEventBridge — caregiver "Hasta Aldı" / "Ara" action'larını Firestore'a bağlar */}
                <CaregiverEventBridge />
                <AppContent />
              </AlertProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </LanguageProvider>
      </OnboardingProvider>
    </LowStockDismissProvider>
  );
}

const styles = StyleSheet.create({
  // Sprint 97.1: GestureHandlerRootView icin flex:1 gerekli — tum provider'lar
  // bu view icinde render edilir.
  gestureRoot: {
    flex: 1,
  },
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
