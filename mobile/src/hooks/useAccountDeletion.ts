/**
 * Hesap ve veri silme akışı.
 *
 * Sıra BİLİNÇLİ:
 *   1. Sunucu (`deleteMyAccount`) — Firestore alt ağacı, bakıcı kayıtları,
 *      EN SON Auth kaydı.
 *   2. Yerel veri (`clearAllData({ deleteFromCloud: false })`).
 *   3. Oturumu kapat.
 *
 * Sunucu başarısız olursa YEREL VERİ KORUNUR ve akış hata durumunda durur.
 * Tersi (önce yereli silmek) kullanıcıyı en kötü bileşimde bırakırdı:
 * elindeki kopya gitmiş, buluttaki her şey duruyor.
 *
 * Adım 2'de `deleteFromCloud: false` geçiliyor çünkü bulut zaten adım 1'de
 * silindi; `true` geçmek, artık var olmayan bir kimlikle Firestore'a yazma
 * denemesi demek olurdu.
 */

import { useCallback, useState } from 'react';

import { requestServerAccountDeletion } from '../services/accountDeletionService';
import { useMedicineStore } from '../stores/medicineStore';
import { createScopedLogger } from '../utils/logger';
import { isDeletionConfirmed } from '../domain/accountDeletion';

const log = createScopedLogger('AccountDeletionFlow');

export type AccountDeletionPhase = 'idle' | 'deleting' | 'done' | 'error';

export interface UseAccountDeletionResult {
  phase: AccountDeletionPhase;
  errorMessage: string | null;
  confirmationInput: string;
  setConfirmationInput: (value: string) => void;
  /** Onay kelimesi doğru yazıldı mı? Düğmenin etkinliği buna bağlı. */
  canDelete: boolean;
  /** Silmeyi başlat. Onay doğrulanmamışsa hiçbir şey yapmaz. */
  deleteAccountAndData: () => Promise<void>;
  reset: () => void;
}

export function useAccountDeletion(options: {
  language: 'tr' | 'en';
  onDeleted: () => Promise<void> | void;
}): UseAccountDeletionResult {
  const { language, onDeleted } = options;

  const [phase, setPhase] = useState<AccountDeletionPhase>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmationInput, setConfirmationInput] = useState('');

  const clearAllData = useMedicineStore(state => state.clearAllData);

  const canDelete = isDeletionConfirmed(confirmationInput, language);

  const reset = useCallback(() => {
    setPhase('idle');
    setErrorMessage(null);
    setConfirmationInput('');
  }, []);

  const deleteAccountAndData = useCallback(async () => {
    // Ikinci kapi: dugme disabled olsa bile bu fonksiyon dogrudan
    // cagrilabilir (test, gelecekteki bir kisayol). Onay burada da
    // dogrulaniyor.
    if (!isDeletionConfirmed(confirmationInput, language)) {
      log.warn('Onay kelimesi dogrulanmadi, silme baslatilmadi');
      return;
    }

    setPhase('deleting');
    setErrorMessage(null);

    try {
      // 1. SUNUCU. Basarisiz olursa asagidaki adimlar HIC calismaz.
      await requestServerAccountDeletion();
    } catch (error) {
      log.error('Sunucu tarafi silme basarisiz', error);
      setPhase('error');
      setErrorMessage(
        language === 'tr'
          ? 'Hesabınız silinemedi. Verilerinize hâlâ erişebiliyorsunuz. İnternet bağlantınızı kontrol edip tekrar deneyin.'
          : 'Your account could not be deleted. You still have access to your data. Check your connection and try again.'
      );
      return;
    }

    // 2. YEREL. Buradan sonraki hatalar silmeyi geri almaz; sunucudaki veri
    // gitti. Bu yuzden hata olsa bile akis "done" ile bitiyor ve yalnizca
    // gunluge yaziliyor — kullaniciya "silinemedi" demek YANLIS olurdu.
    try {
      await clearAllData({ deleteFromCloud: false });
    } catch (error) {
      log.error('Yerel veri temizlenemedi (sunucu tarafi zaten silindi)', error);
    }

    // 3. Oturumu kapat / yonlendir.
    try {
      await onDeleted();
    } catch (error) {
      log.error('Silme sonrasi cikis basarisiz', error);
    }

    setPhase('done');
  }, [confirmationInput, language, clearAllData, onDeleted]);

  return {
    phase,
    errorMessage,
    confirmationInput,
    setConfirmationInput,
    canDelete,
    deleteAccountAndData,
    reset,
  };
}
