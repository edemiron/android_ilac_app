import { registerRootComponent } from 'expo';
import notifee, { EventType, Event } from '@notifee/react-native';

import App from './App';

// Notifee Background Event Handler - MUST be registered before app starts
// Bu handler uygulama kapalıyken (killed/background) çalışır
notifee.onBackgroundEvent(async ({ type, detail }: Event) => {
  const { notification, pressAction } = detail;
  
  console.log('[Background] Event type:', type, 'Notification:', notification?.id);

  switch (type) {
    case EventType.DELIVERED:
      // Bildirim teslim edildi
      // Full screen intent zaten notification config'de tanımlı
      // Android sistem seviyesinde full screen açacak
      console.log('[Background] Notification delivered:', notification?.id);
      console.log('[Background] Full screen alarm:', notification?.data?.fullScreenAlarm);
      break;

    case EventType.PRESS:
      // Bildirime tıklandı - uygulama açılacak
      console.log('[Background] Notification pressed:', notification?.data);
      break;

    case EventType.ACTION_PRESS:
      // Aksiyon butonuna tıklandı
      console.log('[Background] Action pressed:', pressAction?.id);
      
      if (pressAction?.id === 'take' || pressAction?.id === 'skip') {
        // Bildirimi kapat
        if (notification?.id) {
          await notifee.cancelNotification(notification.id);
        }
      }
      // 'snooze' action için App.tsx'te işlenecek
      break;

    case EventType.DISMISSED:
      console.log('[Background] Notification dismissed:', notification?.id);
      break;
  }
});



// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
