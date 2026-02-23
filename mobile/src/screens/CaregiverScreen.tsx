/**
 * CaregiverScreen - Bakıcı (Caregiver) Yönetimi
 *
 * Hasta kullanıcıların bakıcılarını davet ettiği ve yönettiği ekran.
 * QR kod ile davet paylaşımı ve mevcut bakıcıları listeler.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import QRCode from 'react-native-qrcode-svg';

import { useCaregiver } from '../hooks/useCaregiver';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAlert } from '../contexts/AlertContext';

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 16,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
    },
    headerSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 4,
    },
    section: {
      marginTop: 16,
      paddingHorizontal: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    inviteSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    input: {
      flex: 1,
      height: 50,
      backgroundColor: colors.inputBackground,
      borderRadius: 12,
      paddingHorizontal: 16,
      color: colors.text,
      fontSize: 16,
    },
    inviteButton: {
      backgroundColor: colors.primary,
      width: 50,
      height: 50,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    caregiverItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
    },
    caregiverInfo: {
      flex: 1,
      marginLeft: 12,
    },
    caregiverName: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
    },
    caregiverEmail: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    caregiverStatus: {
      fontSize: 12,
      color: colors.primary,
      marginTop: 2,
    },
    removeButton: {
      padding: 8,
    },
    permissionBadge: {
      flexDirection: 'row',
      gap: 4,
      marginTop: 6,
      flexWrap: 'wrap',
    },
    permissionTag: {
      backgroundColor: colors.primary + '20',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    permissionText: {
      fontSize: 11,
      color: colors.primary,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyIcon: {
      fontSize: 48,
      marginBottom: 12,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    // QR Modal
    modalContainer: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalContent: {
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: 24,
      alignItems: 'center',
      width: '85%',
      maxWidth: 350,
    },
    qrTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginTop: 16,
      marginBottom: 8,
    },
    qrSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 20,
    },
    qrCode: {
      marginBottom: 16,
    },
    inviteCodeText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      letterSpacing: 4,
      marginBottom: 8,
    },
    shareButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
      gap: 8,
    },
    shareButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    closeButton: {
      marginTop: 12,
      padding: 12,
    },
    closeButtonText: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    // Invite item
    inviteItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
    },
    inviteInfo: {
      flex: 1,
    },
    inviteEmail: {
      fontSize: 15,
      color: colors.text,
    },
    inviteCode: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
    inviteActions: {
      flexDirection: 'row',
      gap: 8,
    },
    actionButton: {
      padding: 8,
    },
  });

export default function CaregiverScreen() {
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();
  const { showInfo, showError } = useAlert();
  const styles = createStyles(colors, isDark);

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
    refresh,
  } = useCaregiver();

  const [email, setEmail] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [currentInviteCode, setCurrentInviteCode] = useState<string | null>(null);

  const t = {
    title: language === 'tr' ? 'Bakıcı Yönetimi' : 'Caregiver Management',
    subtitle: language === 'tr'
      ? 'Sevdikleriniz ilaç takipinizi görüntüleyebilir'
      : 'Your loved ones can view your medication schedule',
    addCaregiver: language === 'tr' ? 'Bakıcı Ekle' : 'Add Caregiver',
    emailPlaceholder: language === 'tr' ? 'E-posta adresi' : 'Email address',
    inviteButton: language === 'tr' ? 'Davet Et' : 'Invite',
    caregiversTitle: language === 'tr' ? 'Bakıcılarım' : 'My Caregivers',
    pendingInvitesTitle: language === 'tr' ? 'Bekleyen Davetler' : 'Pending Invites',
    noCaregivers: language === 'tr'
      ? 'Henüz bakıcı eklemediniz'
      : 'No caregivers added yet',
    noCaregiversSubtitle: language === 'tr'
      ? 'Sevdiklerinizi davet ederek ilaç takipinizi paylaşabilirsiniz'
      : 'Invite your loved ones to share your medication schedule',
    noInvites: language === 'tr'
      ? 'Bekleyen davetiniz yok'
      : 'No pending invites',
    viewSchedule: language === 'tr' ? 'Takvim' : 'Schedule',
    viewHistory: language === 'tr' ? 'Geçmiş' : 'History',
    receiveAlerts: language === 'tr' ? 'Bildirimler' : 'Alerts',
    remove: language === 'tr' ? 'Kaldır' : 'Remove',
    cancel: language === 'tr' ? 'İptal' : 'Cancel',
    qrTitle: language === 'tr' ? 'Davet Kodu' : 'Invite Code',
    qrSubtitle: language === 'tr'
      ? 'Bakıcı bu QR kodu tarayarak daveti kabul edebilir'
      : 'Caregiver can scan this QR code to accept the invite',
    shareInvite: language === 'tr' ? 'Daveti Paylaş' : 'Share Invite',
    close: language === 'tr' ? 'Kapat' : 'Close',
    inviteSent: language === 'tr' ? 'Davet Gönderildi' : 'Invite Sent',
    inviteSentBody: (code: string) =>
      language === 'tr'
        ? `Davet kodu: ${code}`
        : `Invite code: ${code}`,
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
      showError(language === 'tr' ? 'Hata' : 'Error', language === 'tr' ? 'Lütfen e-posta girin' : 'Please enter an email');
      return;
    }

    setIsCreating(true);
    const result = await createInvite(email.trim());
    setIsCreating(false);

    if (result.success && result.inviteCode) {
      setCurrentInviteCode(result.inviteCode);
      showQRCode(result.inviteCode);
      setEmail('');
      showInfo(t.inviteSent, t.inviteSentBody(result.inviteCode!));
    } else {
      showError(language === 'tr' ? 'Hata' : 'Error', result.error || language === 'tr' ? 'Davet gönderilemedi' : 'Failed to send invite');
    }
  };

  const handleRemoveCaregiver = (relationshipId: string, name: string) => {
    Alert.alert(
      language === 'tr' ? 'Bakıcı Kaldır' : 'Remove Caregiver',
      language === 'tr'
        ? `${name} adlı bakıcıyı kaldırmak istediğinize emin misiniz?`
        : `Are you sure you want to remove ${name} as your caregiver?`,
      [
        { text: language === 'tr' ? 'İptal' : 'Cancel', style: 'cancel' },
        {
          text: language === 'tr' ? 'Kaldır' : 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removeCaregiverRel(relationshipId);
          },
        },
      ]
    );
  };

  const handleCancelInvite = async (inviteCode: string) => {
    await cancelInviteRel(inviteCode);
  };

  const handleShareInvite = () => {
    // Invite kodunu ve linki paylaş
    const shareText = language === 'tr'
      ? `İlaç Hatırlatıcı uygulamasında benim takipimi yapman için davet kodum: ${currentInviteCode}`
      : `My invite code for the medication reminder app: ${currentInviteCode}`;

    // Share dialog (native veya react-native-share)
    Alert.alert(
      language === 'tr' ? 'Davet Kodu' : 'Invite Code',
      shareText,
      [{ text: language === 'tr' ? 'Tamam' : 'OK' }]
    );
  };

  const renderPermissions = (relationship: {
    canViewSchedule: boolean;
    canViewHistory: boolean;
    canReceiveAlerts: boolean;
  }) => {
    const permissions = [];
    if (relationship.canViewSchedule) permissions.push(t.viewSchedule);
    if (relationship.canViewHistory) permissions.push(t.viewHistory);
    if (relationship.canReceiveAlerts) permissions.push(t.receiveAlerts);

    return (
      <View style={styles.permissionBadge}>
        {permissions.map(p => (
          <View key={p} style={styles.permissionTag}>
            <Text style={styles.permissionText}>{p}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t.title}</Text>
        <Text style={styles.headerSubtitle}>{t.subtitle}</Text>
      </View>

      <ScrollView>
        {/* Invite Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.addCaregiver}</Text>
          <View style={styles.card}>
            <View style={styles.inviteSection}>
              <TextInput
                style={styles.input}
                placeholder={t.emailPlaceholder}
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.inviteButton}
                onPress={handleInvite}
                disabled={isCreating || !email.trim()}
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="person-add" size={24} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Pending Invites */}
        {pendingInvites.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.pendingInvitesTitle}</Text>
            {pendingInvites.map(invite => (
              <View key={invite.id} style={styles.card}>
                <View style={styles.inviteItem}>
                  <View style={styles.inviteInfo}>
                    <Text style={styles.inviteEmail}>{invite.caregiverEmail}</Text>
                    <Text style={styles.inviteCode}>
                      {language === 'tr' ? 'Kod' : 'Code'}: {invite.id} • {t.expires(invite.expiresAt)}
                    </Text>
                  </View>
                  <View style={styles.inviteActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => {
                        setCurrentInviteCode(invite.id);
                        showQRCode(invite.id);
                      }}
                    >
                      <Ionicons name="qr-code" size={20} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleCancelInvite(invite.id)}
                    >
                      <Ionicons name="close-circle" size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Caregivers List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.caregiversTitle}</Text>

          {isLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : caregivers.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyText}>{t.noCaregivers}</Text>
              <Text style={[styles.emptyText, { fontSize: 14, marginTop: 4 }]}>
                {t.noCaregiversSubtitle}
              </Text>
            </View>
          ) : (
            caregivers.map(caregiver => (
              <View key={caregiver.id} style={styles.card}>
                <View style={styles.caregiverItem}>
                  <View style={[styles.inviteButton, { backgroundColor: colors.primary + '20', width: 44, height: 44 }]}>
                    <Ionicons name="person" size={22} color={colors.primary} />
                  </View>
                  <View style={styles.caregiverInfo}>
                    <Text style={styles.caregiverName}>
                      {caregiver.caregiverName || caregiver.caregiverEmail}
                    </Text>
                    {renderPermissions(caregiver)}
                  </View>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveCaregiver(caregiver.id, caregiver.caregiverName || caregiver.caregiverEmail || 'Bakıcı')}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* QR Code Modal */}
      <Modal visible={showQRModal} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {currentInviteCode && (
              <>
                <QRCode
                  value={qrCodeData || currentInviteCode}
                  size={200}
                  color={isDark ? '#fff' : '#000'}
                  backgroundColor="transparent"
                />
                <Text style={styles.inviteCodeText}>{currentInviteCode}</Text>
                <Text style={styles.qrSubtitle}>{t.qrSubtitle}</Text>
                <TouchableOpacity style={styles.shareButton} onPress={handleShareInvite}>
                  <Ionicons name="share-outline" size={20} color="#fff" />
                  <Text style={styles.shareButtonText}>{t.shareInvite}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.closeButton} onPress={hideQRCode}>
                  <Text style={styles.closeButtonText}>{t.close}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
