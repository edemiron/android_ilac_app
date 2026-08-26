/**
 * useCaregiverController — CaregiverScreen Presenter Hook
 *
 * Design Pattern: Presenter / Controller
 * Bakıcı daveti oluşturma, QR modal açma/kapatma, WhatsApp/SMS paylaşımı,
 * granüler izin düzenleme, bekleyen davetleri iptal etme ve bakıcı ilişkisini kaldırma.
 */

import { useState, useCallback, useMemo } from 'react';
import { Linking, Share } from 'react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { useCaregiver } from '../../../hooks/useCaregiver';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAlert } from '../../../contexts/AlertContext';
import { useHaptics } from '../../../hooks/useHaptics';
import { auth } from '../../../config/firebase';
import { acceptCaregiverInvite } from '../../../services/caregiverService';
import type { CaregiverRelationship } from '../../../types';
import type { CaregiverTabRole } from '../components/CaregiverRoleSegmentedControl';

interface UseCaregiverControllerProps {
  navigation?: any;
}

export function useCaregiverController({ navigation }: UseCaregiverControllerProps = {}) {
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();
  const { user, loginWithGoogleProvider, isGoogleAvailable } = useAuth();
  const { showInfo, showError, showAlert } = useAlert();
  const { trigger: triggerHaptic } = useHaptics();

  const isGuest = !user?.uid || user?.uid === 'guest_local_user';

  const {
    caregivers,
    pendingInvites,
    patients,
    isLoading,
    qrCodeData,
    showQRModal,
    createInvite,
    acceptInvite,
    removeCaregiverRel,
    removePatientRel,
    cancelInviteRel,
    updatePermissions,
    showQRCode,
    hideQRCode,
    refresh,
  } = useCaregiver();

  // Aktif Rol Sekmesi (Hasta vs Bakıcı)
  const [activeTab, setActiveTab] = useState<CaregiverTabRole>('my_caregivers');

  // Hasta davet oluşturma input state
  const [email, setEmail] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [currentInviteCode, setCurrentInviteCode] = useState<string | null>(null);
  const [selectedCaregiverForEdit, setSelectedCaregiverForEdit] =
    useState<CaregiverRelationship | null>(null);

  // Bakıcı kod girme input state
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [isAcceptingCode, setIsAcceptingCode] = useState(false);

  const isTr = language === 'tr';

  const t = useMemo(
    () => ({
      title: isTr ? 'Aile & Bakıcı Takibi' : 'Family & Caregiver Tracking',
      subtitle: isTr
        ? 'Sevdikleriniz ilaç takibinizi ve acil durumlarınızı güvenle izleyebilir'
        : 'Your loved ones can securely track your medication and emergencies',
      addCaregiver: isTr ? 'E-posta ile Davet Gönder' : 'Invite via Email',
      emailPlaceholder: isTr ? 'Yakınınızın e-posta adresi...' : "Family member's email...",
      inviteButton: isTr ? 'Davet Et' : 'Invite',
      caregiversTitle: isTr ? 'Aktif Aile & Bakıcı Çemberim' : 'My Active Caregivers',
      pendingInvitesTitle: isTr ? 'Bekleyen Davetler' : 'Pending Invites',
      noCaregivers: isTr ? 'Henüz aile üyesi veya bakıcı eklenmedi' : 'No caregivers added yet',
      noCaregiversSubtitle: isTr
        ? 'Yukarıdaki butonlarla yakınlarınıza WhatsApp veya QR kod ile davet göndererek koruma çemberinizi oluşturun.'
        : 'Invite your loved ones via WhatsApp or QR code to establish your safety circle.',
      noInvites: isTr ? 'Bekleyen davetiniz yok' : 'No pending invites',
      viewSchedule: isTr ? 'Takvim' : 'Schedule',
      viewHistory: isTr ? 'Geçmiş' : 'History',
      receiveAlerts: isTr ? 'Acil Bildirim' : 'Alerts',
      remove: isTr ? 'Kaldır' : 'Remove',
      cancel: isTr ? 'İptal' : 'Cancel',
      removeCaregiverTitle: isTr ? 'Bakıcıyı Kaldır' : 'Remove Caregiver',
      removeCaregiverMessage: (name: string) =>
        isTr
          ? `${name} adlı yakınınızı aile koruma çemberinden kaldırmak istediğinize emin misiniz?`
          : `Are you sure you want to remove ${name} from your care circle?`,
      removePatientTitle: isTr ? 'Takipten Ayrıl' : 'Stop Tracking',
      removePatientMessage: (name: string) =>
        isTr
          ? `${name} adlı yakınınızın ilaç takibinden ayrılmak istediğinize emin misiniz?`
          : `Are you sure you want to stop tracking medication for ${name}?`,
      unnamedCaregiver: isTr ? 'Aile Üyesi / Bakıcı' : 'Family Member / Caregiver',
      qrTitle: isTr ? 'Aile Davet Kodu & QR' : 'Family Invite Code & QR',
      qrSubtitle: isTr
        ? 'Yakınınız İlaç Hatırlatıcı uygulamasında bu QR kodu taratarak çemberinize katılabilir.'
        : 'Your loved one can scan this QR code in the app to join your care circle.',
      shareInvite: isTr ? 'Daveti Paylaş' : 'Share Invite',
      shareOk: isTr ? 'Tamam' : 'OK',
      close: isTr ? 'Kapat' : 'Close',
      inviteSent: isTr ? 'Davet Oluşturuldu' : 'Invite Created',
      inviteSentBody: (code: string) =>
        isTr ? `Davet kodunuz: ${code}` : `Your invite code: ${code}`,
      expired: isTr ? 'Süresi Doldu' : 'Expired',
      pending: isTr ? 'Bekliyor' : 'Pending',
      statusActive: isTr ? 'Aktif' : 'Active',
      statusPending: isTr ? 'Bekliyor' : 'Pending',
      editPermissions: isTr ? 'İzinleri Düzenle' : 'Edit Permissions',
      save: isTr ? 'Kaydet' : 'Save',
      permissionsSaved: isTr ? 'İzinler güncellendi' : 'Permissions updated',
      inviteCancelled: isTr ? 'Davet iptal edildi' : 'Invite cancelled',
      caregiverRemoved: isTr ? 'Bakıcı kaldırıldı' : 'Caregiver removed',
      emptyCaregiverName: isTr ? 'İsimsiz Bakıcı' : 'Caregiver',
      enterCode: isTr ? '6 Haneli Kodu Girin' : 'Enter 6-digit Code',
      acceptCode: isTr ? 'Kodu Onayla' : 'Accept Code',
      scanQR: isTr ? 'QR Kod Tara' : 'Scan QR',
      codePlaceholder: isTr ? 'Örn: 53DD4F' : 'Ex: 53DD4F',
      expires: (date: string) => {
        const d = new Date(date);
        return isTr
          ? `Bitiş: ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
          : `Expires: ${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
      },
    }),
    [isTr]
  );

  // E-posta ile davet gönder
  const handleInvite = async () => {
    if (!email.trim()) {
      triggerHaptic('error');
      showError(
        isTr ? 'Hata' : 'Error',
        isTr ? 'Lütfen bir e-posta adresi girin.' : 'Please enter an email address.'
      );
      return;
    }

    triggerHaptic('medium');
    setIsCreating(true);
    const result = await createInvite(email.trim());
    setIsCreating(false);

    if (result.success && result.inviteCode) {
      triggerHaptic('success');
      setCurrentInviteCode(result.inviteCode);
      showQRCode(result.inviteCode);
      setEmail('');
      showInfo(t.inviteSent, t.inviteSentBody(result.inviteCode));
    } else {
      triggerHaptic('error');
      showError(
        isTr ? 'Hata' : 'Error',
        result.error || (isTr ? 'Davet oluşturulamadı.' : 'Failed to send invite')
      );
    }
  };

  // Mevcut geçerli bir davet kodunu getir veya yenisini oluştur
  const getOrCreateInviteCode = async (): Promise<string | null> => {
    const firebaseUser = auth.currentUser;
    const isActuallyGuest = (!user?.uid || user.uid === 'guest_local_user') && !firebaseUser;

    if (isActuallyGuest) {
      triggerHaptic('error');
      promptSignInRequired();
      return null;
    }

    // 1. Önce aktif bekleyen bir davet var mı kontrol et
    if (pendingInvites && pendingInvites.length > 0) {
      const active = pendingInvites.find(i => i.status === 'pending' && i.id);
      if (active && active.id) {
        return active.id;
      }
    }
    // 2. Kullanıcı input'a bir e-posta yazmışsa onu kullan, yoksa benzersiz share daveti oluştur
    const targetEmail = email.trim() || `invite_${Date.now().toString(36)}@family.share`;
    const res = await createInvite(targetEmail);
    if (res.success && res.inviteCode) {
      return res.inviteCode;
    }
    if (res.error) {
      showError(isTr ? 'Hata' : 'Error', res.error);
    }
    return null;
  };

  // WhatsApp ile Hızlı Davet
  const handleWhatsAppShare = async () => {
    triggerHaptic('light');
    try {
      const code = await getOrCreateInviteCode();
      if (!code) {
        showError(
          isTr ? 'Hata' : 'Error',
          isTr ? 'Davet kodu üretilemedi.' : 'Failed to generate code.'
        );
        return;
      }
      const message = isTr
        ? `Merhaba! İlaç Hatırlatıcı uygulamasında benim ilaç takibimi ve acil durum bildirimlerimi takip edebilmen için davet kodum: *${code}*\n\nUygulamayı açıp bu kodu girerek aile koruma çemberime katılabilirsin.`
        : `Hello! Here is my invite code to follow my medication schedule and emergency alerts on Medicine Reminder: *${code}*`;

      const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        await Share.share({ message });
      }
    } catch {
      showError(isTr ? 'Hata' : 'Error', isTr ? 'WhatsApp açılamadı.' : 'Could not open WhatsApp.');
    }
  };

  // Sistem Paylaşımı (SMS, Telegram, Mail vb.)
  const handleNativeShare = async () => {
    triggerHaptic('light');
    try {
      const code = await getOrCreateInviteCode();
      if (!code) {
        showError(
          isTr ? 'Hata' : 'Error',
          isTr ? 'Davet kodu üretilemedi.' : 'Failed to generate code.'
        );
        return;
      }
      const message = isTr
        ? `İlaç Hatırlatıcı aile takip davet kodum: ${code}\nUygulamayı açıp bu kodu girerek ilaç takibime katılabilirsiniz.`
        : `My Medicine Reminder family invite code is: ${code}`;

      await Share.share({
        message,
        title: isTr ? 'İlaç Hatırlatıcı Aile Daveti' : 'Medicine Reminder Invite',
      });
    } catch {
      showError(isTr ? 'Hata' : 'Error', isTr ? 'Paylaşılamadı.' : 'Failed to share.');
    }
  };

  // QR Modal Aç
  const handleShowQR = async () => {
    triggerHaptic('light');
    const code = await getOrCreateInviteCode();
    if (code) {
      setCurrentInviteCode(code);
      showQRCode(code);
    }
  };

  // Bakıcıyı Listeden Kaldır
  const handleRemoveCaregiver = useCallback(
    (relationshipId: string, name: string) => {
      triggerHaptic('warning');
      showAlert({
        type: 'warning',
        title: t.removeCaregiverTitle,
        message: t.removeCaregiverMessage(name),
        buttons: [
          { text: t.cancel, style: 'cancel' },
          {
            text: t.remove,
            style: 'destructive',
            onPress: async () => {
              const res = await removeCaregiverRel(relationshipId);
              if (res.success) {
                triggerHaptic('success');
                showInfo(
                  isTr ? 'Kaldırıldı' : 'Removed',
                  isTr
                    ? `${name} aile çemberinizden kaldırıldı.`
                    : `${name} removed from your care circle.`
                );
              }
            },
          },
        ],
      });
    },
    [isTr, removeCaregiverRel, showAlert, showInfo, t, triggerHaptic]
  );

  // İzin Düzenleme Modalı Aç
  const handleEditPermissions = (caregiver: CaregiverRelationship) => {
    triggerHaptic('selection');
    setSelectedCaregiverForEdit(caregiver);
  };

  // İzin Düzenleme Modalı Kapat
  const handleClosePermissions = () => {
    setSelectedCaregiverForEdit(null);
  };

  // İzinleri Kaydet
  const handleSavePermissions = async (
    relationshipId: string,
    permissions: {
      canViewSchedule: boolean;
      canViewHistory: boolean;
      canReceiveAlerts: boolean;
    }
  ) => {
    triggerHaptic('medium');
    await updatePermissions(relationshipId, permissions);
    setSelectedCaregiverForEdit(null);
    triggerHaptic('success');
    showInfo(
      isTr ? 'Başarılı' : 'Success',
      isTr ? 'İzinler başarıyla güncellendi.' : 'Permissions updated.'
    );
  };

  // Bekleyen Daveti İptal Et
  const handleCancelInvite = (inviteCode: string) => {
    triggerHaptic('warning');
    showAlert({
      type: 'warning',
      title: isTr ? 'Daveti İptal Et' : 'Cancel Invite',
      message: isTr
        ? 'Bu davet kodunu iptal etmek istediğinize emin misiniz?'
        : 'Are you sure you want to cancel this invite code?',
      buttons: [
        { text: t.cancel, style: 'cancel' },
        {
          text: isTr ? 'Daveti İptal Et' : 'Cancel Invite',
          style: 'destructive',
          onPress: async () => {
            const res = await cancelInviteRel(inviteCode);
            if (res.success) {
              triggerHaptic('success');
              showInfo(
                isTr ? 'İptal Edildi' : 'Cancelled',
                isTr ? 'Davet kodu başarıyla iptal edildi.' : 'Invite code cancelled.'
              );
            }
          },
        },
      ],
    });
  };

  // Daveti Paylaş (Pending listesinden veya QR modalından)
  const handleShareInvite = (inviteCode?: string) => {
    triggerHaptic('light');
    const targetCode = inviteCode || currentInviteCode;
    if (!targetCode) return;
    const shareText = isTr
      ? `İlaç Hatırlatıcı uygulamasında benim ilaç takibimi yapmak için davet kodum: ${targetCode}\n\nUygulamayı açıp 'Aile & Bakıcı Takibi' ekranından bu kodu girerek takibe başlayabilirsiniz.`
      : `My invite code to follow my medications on Medicine Reminder: ${targetCode}`;

    showAlert({
      type: 'info',
      title: t.qrTitle,
      message: shareText,
      buttons: [{ text: t.shareOk }],
    });
  };

  const handleOpenQR = (code: string) => {
    triggerHaptic('light');
    setCurrentInviteCode(code);
    showQRCode(code);
  };

  // Sekme değiştirme (Haptic ile)
  const handleChangeTab = useCallback(
    (tab: CaregiverTabRole) => {
      triggerHaptic('selection');
      setActiveTab(tab);
    },
    [triggerHaptic]
  );

  // Oturum açma yönlendirme modalı (Google Sign-In veya Ayarlar/Login)
  const promptSignInRequired = useCallback(
    (codeToAutoAccept?: string) => {
      triggerHaptic('warning');
      const buttons: any[] = [{ text: isTr ? 'Vazgeç' : 'Cancel', style: 'cancel' }];

      if (isGoogleAvailable) {
        buttons.push({
          text: isTr ? 'Google ile Giriş Yap' : 'Sign in with Google',
          onPress: async () => {
            try {
              setIsAcceptingCode(true);
              await loginWithGoogleProvider();
              const fbUser = auth.currentUser;
              if (codeToAutoAccept && fbUser?.uid) {
                const retryRes = await acceptCaregiverInvite(
                  codeToAutoAccept,
                  fbUser.uid,
                  fbUser.displayName || 'Bakıcı',
                  ''
                );
                if (retryRes.success) {
                  triggerHaptic('success');
                  setInviteCodeInput('');
                  await refresh();
                  showAlert({
                    type: 'success',
                    title: isTr ? '🎉 Bağlantı Kuruldu!' : '🎉 Connected!',
                    message: isTr
                      ? 'Yakınınızın ilaç takip çemberine başarıyla katıldınız. Artık ilaç saatlerini ve acil durum uyarılarını canlı olarak takip edebilirsiniz.'
                      : 'You have successfully joined your loved one’s medication care circle.',
                    buttons: [{ text: isTr ? 'Harika' : 'Great' }],
                  });
                  return;
                }
              }
              await refresh();
            } catch (err: any) {
              const errMsg = err?.message || '';
              if (errMsg.includes('cancelled') || errMsg.includes('CANCELLED')) {
                return;
              }
              showAlert({
                type: 'warning',
                title: isTr ? 'Google Girişi Yapılamadı' : 'Google Sign-In Failed',
                message: isTr
                  ? 'Google ile oturum açılamadı. E-posta ve şifrenizle giriş yapmak veya yeni hesap oluşturmak ister misiniz?'
                  : 'Could not sign in with Google. Would you like to sign in with email?',
                buttons: [
                  { text: isTr ? 'Vazgeç' : 'Cancel', style: 'cancel' },
                  {
                    text: isTr ? 'E-posta ile Giriş' : 'Sign in with Email',
                    onPress: () => {
                      if (navigation?.navigate) {
                        navigation.navigate('Login');
                      }
                    },
                  },
                ],
              });
            } finally {
              setIsAcceptingCode(false);
            }
          },
        });
      }

      buttons.push({
        text: isTr ? 'E-posta ile Giriş / Kayıt' : 'Email Sign In / Register',
        onPress: () => {
          if (navigation?.navigate) {
            navigation.navigate('Login');
          }
        },
      });

      showAlert({
        type: 'warning',
        title: isTr ? 'Oturum Açmanız Gerekiyor' : 'Sign-in Required',
        message: isTr
          ? 'Aile takibine katılmak ve hastanın acil durum bildirimlerini alabilmek canlı bulut senkronizasyonu gerektirir. Lütfen Google veya E-posta ile giriş yapın.'
          : 'Joining a care circle requires cloud synchronization. Please sign in via Google or Email.',
        buttons,
      });
    },
    [
      isGoogleAvailable,
      isTr,
      loginWithGoogleProvider,
      navigation,
      refresh,
      showAlert,
      triggerHaptic,
    ]
  );

  // Bakıcı olarak 6 haneli davet kodunu onaylayıp hastaya bağlanma
  const handleAcceptCode = async () => {
    const cleanCode = inviteCodeInput.trim().toUpperCase();

    // Firebase auth.currentUser fallback: React state gecikmesi durumunda
    // doğrudan Firebase instance'ından kontrol et
    const firebaseUser = auth.currentUser;
    const isActuallyGuest = (!user?.uid || user.uid === 'guest_local_user') && !firebaseUser;

    if (isActuallyGuest) {
      promptSignInRequired(cleanCode || undefined);
      return;
    }

    if (!cleanCode) {
      triggerHaptic('error');
      showError(
        isTr ? 'Hata' : 'Error',
        isTr ? 'Lütfen 6 haneli davet kodunu girin.' : 'Please enter the 6-character code.'
      );
      return;
    }

    if (cleanCode.length !== 6) {
      triggerHaptic('error');
      showError(
        isTr ? 'Geçersiz Kod' : 'Invalid Code',
        isTr
          ? 'Davet kodu 6 karakterden oluşmalıdır (Örn: 53DD4F).'
          : 'Invite code must be 6 characters.'
      );
      return;
    }

    triggerHaptic('medium');
    setIsAcceptingCode(true);

    const fbUser = auth.currentUser;
    const effectiveUserId = user?.uid && user.uid !== 'guest_local_user' ? user.uid : fbUser?.uid;
    const effectiveDisplayName = user?.displayName || fbUser?.displayName || 'Bakıcı';

    let result: { success: boolean; error?: string };
    try {
      if (!effectiveUserId || effectiveUserId === 'guest_local_user') {
        result = { success: false, error: 'Oturum bulunamadı. Lütfen tekrar giriş yapın.' };
      } else {
        const timeoutPromise = new Promise<{ success: boolean; error?: string }>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  'Sunucuya ulaşılamadı. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.'
                )
              ),
            15000
          )
        );
        result = await Promise.race([
          acceptCaregiverInvite(cleanCode, effectiveUserId, effectiveDisplayName, ''),
          timeoutPromise,
        ]);
      }
    } catch (e: any) {
      result = { success: false, error: e?.message || 'Bir hata oluştu. Lütfen tekrar deneyin.' };
    }
    setIsAcceptingCode(false);

    if (result.success) {
      triggerHaptic('success');
      setInviteCodeInput('');
      await refresh();
      showAlert({
        type: 'success',
        title: isTr ? '🎉 Bağlantı Kuruldu!' : '🎉 Connected!',
        message: isTr
          ? 'Yakınınızın ilaç takip çemberine başarıyla katıldınız. Artık ilaç saatlerini ve acil durum uyarılarını canlı olarak takip edebilirsiniz.'
          : 'You have successfully joined your loved one’s medication care circle.',
        buttons: [{ text: isTr ? 'Harika' : 'Great' }],
      });
    } else {
      triggerHaptic('error');
      const errStr = result.error || '';
      if (isActuallyGuest) {
        promptSignInRequired(cleanCode);
      } else {
        showError(
          isTr ? 'Bağlantı Başarısız' : 'Connection Failed',
          errStr ||
            (isTr
              ? 'Davet kodu bulunamadı, kullanılmış veya süresi dolmuş.'
              : 'Invite code is invalid or expired.')
        );
      }
    }
  };

  // Bakıcı olarak takip edilen hastadan ayrılma
  const handleRemovePatient = useCallback(
    (relationshipId: string, name: string) => {
      triggerHaptic('warning');
      showAlert({
        type: 'warning',
        title: t.removePatientTitle,
        message: t.removePatientMessage(name),
        buttons: [
          { text: t.cancel, style: 'cancel' },
          {
            text: t.remove,
            style: 'destructive',
            onPress: async () => {
              const res = await removePatientRel(relationshipId);
              if (res?.success) {
                triggerHaptic('success');
                showInfo(
                  isTr ? 'Ayrıldınız' : 'Removed',
                  isTr
                    ? `${name} adlı yakınınızın takibinden başarıyla ayrıldınız.`
                    : `Stopped tracking ${name}.`
                );
              } else {
                triggerHaptic('error');
                showError(
                  isTr ? 'Hata' : 'Error',
                  isTr ? 'İşlem gerçekleştirilemedi.' : 'Operation failed.'
                );
              }
            },
          },
        ],
      });
    },
    [showAlert, showInfo, showError, isTr, t, removePatientRel, triggerHaptic]
  );

  // QR Kod Tarayıcıyı Açma
  const handleScanQR = () => {
    triggerHaptic('light');
    if (navigation && typeof navigation.navigate === 'function') {
      navigation.navigate('CaregiverInvite');
    } else {
      showInfo(
        isTr ? 'QR Tarama' : 'Scan QR',
        isTr
          ? 'Hastanızın ekranındaki QR kodun altındaki 6 haneli kodu doğrudan bu alana girebilirsiniz.'
          : 'You can enter the 6-character code shown below the patient’s QR code directly.'
      );
    }
  };

  return {
    colors,
    isDark,
    language,
    t,
    // Sekmeler ve roller
    activeTab,
    handleChangeTab,
    // Hasta Modu (Beni İzleyenler)
    caregivers,
    pendingInvites,
    email,
    setEmail,
    isCreating,
    currentInviteCode,
    selectedCaregiverForEdit,
    handleInvite,
    handleWhatsAppShare,
    handleNativeShare,
    handleShowQR,
    handleRemoveCaregiver,
    handleEditPermissions,
    handleClosePermissions,
    handleSavePermissions,
    handleCancelInvite,
    handleShareInvite,
    handleOpenQR,
    // Bakıcı Modu (Takip Ettiğim Kişiler)
    patients,
    inviteCodeInput,
    setInviteCodeInput,
    isAcceptingCode,
    handleAcceptCode,
    handleRemovePatient,
    handleScanQR,
    // Ortak
    isGuest,
    isLoading,
    qrCodeData,
    showQRModal,
    hideQRCode,
    loginWithGoogleProvider,
    isGoogleAvailable,
    promptSignInRequired,
  };
}
