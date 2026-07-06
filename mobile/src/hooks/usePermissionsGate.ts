import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PERMISSIONS_SHOWN_KEY = '@permissions_shown';

export interface UsePermissionsGateResult {
  /**
   * null: henüz AsyncStorage kontrol edilmedi (loading)
   * true: izin ekranı gösterilmeli
   * false: izin ekranı zaten gösterildi
   */
  showPermissions: boolean | null;
  /** İzin ekranı "bitti" akışı: AsyncStorage'ı günceller ve state'i kapatır */
  handlePermissionsComplete: () => Promise<void>;
}

/**
 * İzin ekranı (notification permission prompt) bir kez gösterilip
 * kapatıldıktan sonra bir daha gösterilmesin. Bu hook AsyncStorage'da
 * `@permissions_shown` flag'ini okur/yazar.
 *
 * App.tsx'ten birebir kopyalanan davranış:
 * - Mount'ta AsyncStorage kontrol edilir
 * - `handlePermissionsComplete` AsyncStorage'a 'true' yazar ve state'i false yapar
 * - AsyncStorage hata verirse güvenli tarafta kalır (ekranı gösterir)
 */
export function usePermissionsGate(): UsePermissionsGateResult {
  const [showPermissions, setShowPermissions] = useState<boolean | null>(null);

  // İzin ekranı gösterildi mi kontrol et
  useEffect(() => {
    const checkPermissionsShown = async () => {
      try {
        const shown = await AsyncStorage.getItem(PERMISSIONS_SHOWN_KEY);
        setShowPermissions(shown !== 'true');
      } catch (_error) {
        setShowPermissions(true);
      }
    };
    checkPermissionsShown();
  }, []);

  // İzin ekranı tamamlandığında
  const handlePermissionsComplete = useCallback(async () => {
    await AsyncStorage.setItem(PERMISSIONS_SHOWN_KEY, 'true');
    setShowPermissions(false);
  }, []);

  return { showPermissions, handlePermissionsComplete };
}
