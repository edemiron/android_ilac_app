/**
 * useCaregiverController — CaregiverScreen Presenter Hook
 *
 * Design Pattern: Presenter / Controller
 * Bakıcı daveti oluşturma, QR modal açma/kapatma, WhatsApp/SMS paylaşımı,
 * granüler izin düzenleme, bekleyen davetleri iptal etme ve bakıcı ilişkisini kaldırma.
 */

import { useState, useCallback, useMemo } from 'react';
import { Linking, Share } from 'react-native';
import { useCaregiver } from '../../../hooks/useCaregiver';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAlert } from '../../../contexts/AlertContext';
import { useHaptics } from '../../../hooks/useHaptics';
import type { CaregiverRelationship } from '../../../types';
import type { CaregiverTabRole } from '../components/CaregiverRoleSegmentedControl';

interface UseCaregiverControllerProps {
  navigation?: any;
}

export function useCaregiverController({ navigation }: UseCaregiverControllerProps = {}) {
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();
  const { showInfo, showError, showAlert } = useAlert();
  const { trigger: triggerHaptic } = useHaptics();

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
      expires: (date: string) => {
        const d = new Date(date);
        return isTr
          ? `Bitiş: ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
          : `Expires: ${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
      },
    }),
    [isTr]
  );

  // E-posta ile davet oluşturma
  const handleInvite = async () => {
    if (!email.trim()) {
      showError(
        isTr ? 'Hata' : 'Error',
        isTr ? 'Lütfen geçerli bir e-posta adresi girin.' : 'Please enter an email'
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
        // Fallback to Native Share
        await Share.share({ message, title: isTr ? 'İlaç Hatırlatıcı Daveti' : 'Invite' });
      }
    } catch (_e) {
      showError(isTr ? 'Hata' : 'Error', isTr ? 'Paylaşım başlatılamadı.' : 'Could not share.');
    }
  };

  // SMS / Sistem Paylaşımı
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
        ? `İlaç Hatırlatıcı uygulamasında aile koruma çemberime katılmak için davet kodum: ${code}`
        : `My invite code for the medicine reminder care circle: ${code}`;

      await Share.share({
        message,
        title: isTr ? 'İlaç Hatırlatıcı Aile Daveti' : 'Medicine Reminder Family Invite',
      });
    } catch (_e) {
      // ignore
    }
  };

  // QR Modal Açma
  const handleShowQR = async () => {
    triggerHaptic('light');
    const code = await getOrCreateInviteCode();
    if (code) {
      setCurrentInviteCode(code);
      showQRCode(code);
    }
  };

  // Bakıcı Kaldırma
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
              if (res?.success) {
                triggerHaptic('success');
                showInfo(
                  isTr ? 'Başarılı' : 'Success',
                  isTr ? `${name} adlı bakıcı kaldırıldı.` : `${name} removed.`
                );
              } else {
                triggerHaptic('error');
                showError(
                  isTr ? 'Hata' : 'Error',
                  isTr
                    ? 'Bakıcı kaldırılamadı. Lütfen bağlantınızı kontrol edin.'
                    : 'Failed to remove caregiver.'
                );
              }
            },
          },
        ],
      });
    },
    [showAlert, showInfo, showError, isTr, t, removeCaregiverRel, triggerHaptic]
  );

  // İzin Düzenleme Modalı
  const handleEditPermissions = (caregiver: CaregiverRelationship) => {
    triggerHaptic('light');
    setSelectedCaregiverForEdit(caregiver);
  };

  const handleClosePermissions = () => {
    setSelectedCaregiverForEdit(null);
  };

  const handleSavePermissions = async (
    relationshipId: string,
    permissions: {
      canViewSchedule: boolean;
      canViewHistory: boolean;
      canReceiveAlerts: boolean;
    }
  ) => {
    try {
      await updatePermissions(relationshipId, permissions);
      triggerHaptic('success');
      showInfo(
        isTr ? 'Yetkiler Güncellendi' : 'Permissions Updated',
        isTr ? 'Bakıcı yetkileri başarıyla kaydedildi.' : 'Caregiver permissions updated.'
      );
    } catch (_e) {
      triggerHaptic('error');
      showError(
        isTr ? 'Hata' : 'Error',
        isTr ? 'Yetkiler güncellenirken bir hata oluştu.' : 'Failed to update permissions.'
      );
    }
  };

  const handleCancelInvite = async (inviteCode: string) => {
    triggerHaptic('warning');
    const res = await cancelInviteRel(inviteCode);
    if (res?.success) {
      triggerHaptic('success');
      showInfo(isTr ? 'Başarılı' : 'Success', isTr ? 'Davet iptal edildi.' : 'Invite cancelled.');
    } else {
      triggerHaptic('error');
      showError(
        isTr ? 'Hata' : 'Error',
        isTr ? 'Davet iptal edilemedi.' : 'Failed to cancel invite.'
      );
    }
  };

  const handleShareInvite = () => {
    const shareText = isTr
      ? `İlaç Hatırlatıcı uygulamasında benim takibimi yapman için davet kodum: ${currentInviteCode}`
      : `My invite code for the medication reminder app: ${currentInviteCode}`;

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

  // Bakıcı olarak 6 haneli davet kodunu onaylayıp hastaya bağlanma
  const handleAcceptCode = async () => {
    const cleanCode = inviteCodeInput.trim().toUpperCase();
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
    const result = await acceptInvite(cleanCode);
    setIsAcceptingCode(false);

    if (result.success) {
      triggerHaptic('success');
      setInviteCodeInput('');
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
      showError(
        isTr ? 'Bağlantı Başarısız' : 'Connection Failed',
        result.error ||
          (isTr
            ? 'Davet kodu bulunamadı, kullanılmış veya süresi dolmuş.'
            : 'Invite code is invalid or expired.')
      );
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
    isLoading,
    qrCodeData,
    showQRModal,
    hideQRCode,
  };
}
