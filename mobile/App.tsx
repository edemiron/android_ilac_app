import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import notifee, { EventType } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, View, Platform, ActivityIndicator, StyleSheet } from 'react-native';

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
} from './src/utils/notifications';
import { useMedicineStore } from './src/stores/medicineStore';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { LanguageProvider, useLanguage } from './src/contexts/LanguageContext';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { SubscriptionProvider } from './src/contexts/SubscriptionContext';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

const PERMISSIONS_SHOWN_KEY = '@permissions_shown';

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
      <AuthStack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
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

// Tab Navigator with Theme Support
function MainTabs() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopWidth: 1,
          borderTopColor: colors.tabBarBorder,
          height: Platform.OS === 'ios' ? 85 : 65,
          paddingBottom: Platform.OS === 'ios' ? 25 : 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
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
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>🏠</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Medicines"
        component={MedicinesScreen}
        options={{
          title: t('tab_medicines'),
          headerTitle: t('tab_medicines'),
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>💊</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Statistics"
        component={StatisticsScreen}
        options={{
          title: t('tab_statistics'),
          headerTitle: t('tab_statistics'),
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>📊</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: t('tab_settings'),
          headerTitle: t('tab_settings'),
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>⚙️</Text>
          ),
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
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { setAlarmActive, getMedicineById, settings, setUserId, syncFromCloud } = useMedicineStore();
  
  const [showPermissions, setShowPermissions] = useState<boolean | null>(null);
  const [pendingAlarm, setPendingAlarm] = useState<any>(null);

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

  // Alarm ekranına yönlendir
  const navigateToAlarm = (data: { medicineId: string; reminderTimeId: string; scheduledTime: string }) => {
    console.log('Alarm ekranına yönlendiriliyor:', data);
    
    // Navigation hazır değilse bekle
    if (!navigationRef.current?.isReady()) {
      setPendingAlarm(data);
      return;
    }

    navigationRef.current?.navigate('Alarm', {
      medicineId: data.medicineId,
      reminderTimeId: data.reminderTimeId,
      scheduledTime: data.scheduledTime,
    });

    // Bildirimi kapat
    dismissNotification(`alarm-${data.medicineId}-${data.reminderTimeId}`);
  };

  // Aksiyon işle
  const handleAction = (actionId: string, data: any) => {
    console.log('Aksiyon:', actionId, data);
    // TODO: take, snooze, skip aksiyonlarını işle
  };

  // Notifee event listener'larını kur
  useEffect(() => {
    // Bildirim kanallarını oluştur
    createNotificationChannels();

    // Foreground event listener
    const unsubscribe = setupNotificationListeners(navigateToAlarm, handleAction);

    // Background event handler artık index.ts'te register ediliyor

    // Initial notification kontrolü (uygulama kapalıyken tıklanan bildirim)
    const checkInitialNotification = async () => {
      // 1. Önce tıklanan bildirimi kontrol et
      const initialNotification = await notifee.getInitialNotification();
      if (initialNotification) {
        console.log('Initial notification bulundu:', initialNotification);
        const data = initialNotification.notification.data;
        if (data?.medicineId && data?.reminderTimeId) {
          setPendingAlarm({
            medicineId: data.medicineId,
            reminderTimeId: data.reminderTimeId,
            scheduledTime: data.scheduledTime || new Date().toISOString(),
          });
          return; // Alarm bulundu, çık
        }
      }
      
      // 2. Full screen intent ile açıldıysa displayed notifications'ı kontrol et
      const displayedNotifications = await notifee.getDisplayedNotifications();
      console.log('Displayed notifications:', displayedNotifications.length);
      
      for (const notification of displayedNotifications) {
        const data = notification.notification.data;
        if (data?.fullScreenAlarm === 'true' && data?.medicineId && data?.reminderTimeId) {
          console.log('Full screen alarm bildirimi bulundu:', notification.notification.id);
          setPendingAlarm({
            medicineId: data.medicineId as string,
            reminderTimeId: data.reminderTimeId as string,
            scheduledTime: (data.scheduledTime as string) || new Date().toISOString(),
          });
          return; // Alarm bulundu, çık
        }
      }
    };
    checkInitialNotification();

    return () => {
      unsubscribe();
    };
  }, []);

  // Pending alarm varsa ve navigation hazırsa yönlendir
  useEffect(() => {
    if (pendingAlarm && navigationRef.current?.isReady()) {
      navigateToAlarm(pendingAlarm);
      setPendingAlarm(null);
    }
  }, [pendingAlarm]);

  // Auth yüklenirken loading göster
  if (authLoading || showPermissions === null) {
    return <LoadingScreen />;
  }

  // İzin ekranını göster (giriş yapıldıktan sonra)
  if (isAuthenticated && showPermissions) {
    return (
      <NavigationContainer>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <PermissionsScreen onComplete={handlePermissionsComplete} />
      </NavigationContainer>
    );
  }

  // Giriş yapılmamışsa Auth ekranlarını göster
  if (!isAuthenticated) {
    return (
      <NavigationContainer>
        <StatusBar style={isDark ? 'light' : 'dark'} />
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
      <StatusBar style={isDark ? 'light' : 'dark'} />
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
        <Stack.Screen
          name="Main"
          component={MainTabs}
          options={{ headerShown: false }}
        />
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
              <AppContent />
            </SubscriptionProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
