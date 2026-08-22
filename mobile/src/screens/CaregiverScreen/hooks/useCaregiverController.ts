/**
 * useCaregiverController — CaregiverScreen Presenter Hook
 *
 * Design Pattern: Presenter / Controller
 * Bakıcı daveti oluşturma, QR modal açma/kapatma, davet kodu paylaşımı,
 * bekleyen davetleri iptal etme ve bakıcı ilişkisini kaldırma işlemlerini UI bileşeninden izole eder.
 */

import { useState, useCallback } from 'react';
import { useCaregiver } from '../../../hooks/useCaregiver';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAlert } from '../../../contexts/AlertContext';

export function useCaregiverController() {
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();
  const { showInfo, showError, showAlert } = useAlert();

  const {
    caregivers,
    pendingInvites,
    isLoading,
    qrCodeData,
    showQRModal,
    createInvite,
    removeCaregiverRel,
    cancelInviteRel,
    showQRCode,
    hideQRCode,
  } = useCaregiver();

  const [email, setEmail] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [currentInviteCode, setCurrentInviteCode] = useState<string | null>(null);

  const t = {
    title: language === 'tr' ? 'Bakıcı Yönetimi' : 'Caregiver Management',
    subtitle:
      language === 'tr'
        ? 'Sevdikleriniz ilaç takipinizi görüntüleyebilir'
        : 'Your loved ones can view your medication schedule',
    addCaregiver: language === 'tr' ? 'Bakıcı Ekle' : 'Add Caregiver',
    emailPlaceholder: language === 'tr' ? 'E-posta adresi' : 'Email address',
    inviteButton: language === 'tr' ? 'Davet Et' : 'Invite',
    caregiversTitle: language === 'tr' ? 'Bakıcılarım' : 'My Caregivers',
    pendingInvitesTitle: language === 'tr' ? 'Bekleyen Davetler' : 'Pending Invites',
    noCaregivers: language === 'tr' ? 'Henüz bakıcı eklemediniz' : 'No caregivers added yet',
    noCaregiversSubtitle:
      language === 'tr'
        ? 'Sevdiklerinizi davet ederek ilaç takipinizi paylaşabilirsiniz'
        : 'Invite your loved ones to share your medication schedule',
    noInvites: language === 'tr' ? 'Bekleyen davetiniz yok' : 'No pending invites',
    viewSchedule: language === 'tr' ? 'Takvim' : 'Schedule',
    viewHistory: language === 'tr' ? 'Geçmiş' : 'History',
    receiveAlerts: language === 'tr' ? 'Bildirimler' : 'Alerts',
    remove: language === 'tr' ? 'Kaldır' : 'Remove',
    cancel: language === 'tr' ? 'İptal' : 'Cancel',
    removeCaregiverTitle: language === 'tr' ? 'Bakıcı Kaldır' : 'Remove Caregiver',
    removeCaregiverMessage: (name: string) =>
      language === 'tr'
        ? `${name} adlı bakıcıyı kaldırmak istediğinize emin misiniz?`
        : `Are you sure you want to remove ${name} as your caregiver?`,
    unnamedCaregiver: language === 'tr' ? 'İsimsiz bakıcı' : 'Unnamed caregiver',
    qrTitle: language === 'tr' ? 'Davet Kodu' : 'Invite Code',
    qrSubtitle:
      language === 'tr'
        ? 'Bakıcı bu QR kodu tarayarak daveti kabul edebilir'
        : 'Caregiver can scan this QR code to accept the invite',
    shareInvite: language === 'tr' ? 'Daveti Paylaş' : 'Share Invite',
    shareOk: language === 'tr' ? 'Tamam' : 'OK',
    close: language === 'tr' ? 'Kapat' : 'Close',
    inviteSent: language === 'tr' ? 'Davet Gönderildi' : 'Invite Sent',
    inviteSentBody: (code: string) =>
      language === 'tr' ? `Davet kodu: ${code}` : `Invite code: ${code}`,
    expired: language === 'tr' ? 'Süresi Doldu' : 'Expired',
    expires: (date: string) => {
      const d = new Date(date);
      return language === 'tr'
        ? `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
        : `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
    },
  };

  const handleInvite = async () => {
    if (!email.trim()) {
      showError(
        language === 'tr' ? 'Hata' : 'Error',
        language === 'tr' ? 'Lütfen e-posta girin' : 'Please enter an email'
      );
      return;
    }

    setIsCreating(true);
    const result = await createInvite(email.trim());
    setIsCreating(false);

    if (result.success && result.inviteCode) {
      setCurrentInviteCode(result.inviteCode);
      showQRCode(result.inviteCode);
      setEmail('');
      showInfo(t.inviteSent, t.inviteSentBody(result.inviteCode));
    } else {
      showError(
        language === 'tr' ? 'Hata' : 'Error',
        result.error || (language === 'tr' ? 'Davet gönderilemedi' : 'Failed to send invite')
      );
    }
  };

  const handleRemoveCaregiver = useCallback(
    (relationshipId: string, name: string) => {
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
              await removeCaregiverRel(relationshipId);
            },
          },
        ],
      });
    },
    [showAlert, t, removeCaregiverRel]
  );

  const handleCancelInvite = async (inviteCode: string) => {
    await cancelInviteRel(inviteCode);
  };

  const handleShareInvite = () => {
    const shareText =
      language === 'tr'
        ? `İlaç Hatırlatıcı uygulamasında benim takipimi yapman için davet kodum: ${currentInviteCode}`
        : `My invite code for the medication reminder app: ${currentInviteCode}`;

    showAlert({
      type: 'info',
      title: t.qrTitle,
      message: shareText,
      buttons: [{ text: t.shareOk }],
    });
  };

  const handleOpenQR = (code: string) => {
    setCurrentInviteCode(code);
    showQRCode(code);
  };

  return {
    colors,
    isDark,
    language,
    t,
    caregivers,
    pendingInvites,
    isLoading,
    qrCodeData,
    showQRModal,
    hideQRCode,
    email,
    setEmail,
    isCreating,
    currentInviteCode,
    handleInvite,
    handleRemoveCaregiver,
    handleCancelInvite,
    handleShareInvite,
    handleOpenQR,
  };
}
