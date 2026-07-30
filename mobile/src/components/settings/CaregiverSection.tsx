/**
 * CaregiverSection — Sprint 90.
 *
 * SettingsScreen icinde Bakicilar section. Hasta tarafindan
 * caregiverList + pendingInvites gosterir, add/remove islemleri
 * useCaregiver hook'u uzerinden yapilir.
 *
 * UI'da su bilgiler yer alir:
 * - Aktif bakicilar (status='active') - isim + email + kaldir butonu
 * - Bekleyen davetler (status='pending') - email + iptal butonu
 * - "Bakici Davet Et" butonu (inline email + QR)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SettingsSection } from './SettingsSection';
import { useTheme, type ThemeColors } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useCaregiver } from '../../hooks/useCaregiver';
import { useAlert } from '../../contexts/AlertContext';
import { createScopedLogger } from '../../utils/logger';
import { getInitials } from './getInitials';

const log = createScopedLogger('CaregiverSection');

interface CaregiverSectionProps {
  /** Kullanici davet ekranina gitmek isterse (opsiyonel) */
  onOpenInviteScreen?: () => void;
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    list: {
      paddingHorizontal: 16,
      paddingBottom: 8,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primaryContainer,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    avatarText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.onPrimaryContainer,
    },
    info: {
      flex: 1,
    },
    name: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    email: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 1,
    },
    removeBtn: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: colors.error + '15',
    },
    removeBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.error,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
      marginRight: 8,
    },
    statusBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    inviteForm: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
      gap: 8,
    },
    input: {
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 14,
    },
    submitBtn: {
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
    },
    submitBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.textOnPrimary,
    },
    empty: {
      paddingHorizontal: 16,
      paddingVertical: 16,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
    },
  });

// getInitials pure helper izole module'de (Sprint 93 — testable)

export const CaregiverSection: React.FC<CaregiverSectionProps> = ({ onOpenInviteScreen }) => {
  const { colors } = useTheme();
  const { language } = useLanguage();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const styles = createStyles(colors);

  const {
    caregivers,
    pendingInvites,
    isLoading,
    createInvite,
    removeCaregiverRel,
    cancelInviteRel,
  } = useCaregiver();

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const tr = language === 'tr';

  const handleInvite = async () => {
    if (!email.trim()) {
      showAlert({
        type: 'error',
        title: tr ? 'Hata' : 'Error',
        message: tr ? 'E-posta gerekli' : 'Email required',
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await createInvite(email.trim());
      if (result.success) {
        setEmail('');
        showAlert({
          type: 'success',
          title: tr ? 'Davet Gönderildi' : 'Invite Sent',
          message: tr
            ? `${email} adresine davet kodu gönderildi.`
            : `Invite code sent to ${email}.`,
        });
      } else {
        showAlert({
          type: 'error',
          title: tr ? 'Hata' : 'Error',
          message: result.error || (tr ? 'Davet gönderilemedi' : 'Could not send invite'),
        });
      }
    } catch (error) {
      log.error('Invite error', error);
      showAlert({
        type: 'error',
        title: tr ? 'Hata' : 'Error',
        message: tr ? 'Beklenmeyen bir hata oluştu' : 'An unexpected error occurred',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = (caregiverId: string, caregiverName: string) => {
    showAlert({
      type: 'warning',
      title: tr ? 'Bakıcıyı Kaldır' : 'Remove Caregiver',
      message: tr
        ? `${caregiverName} artık ilaçlarınızı göremeyecek.`
        : `${caregiverName} will no longer see your medications.`,
      buttons: [
        {
          text: tr ? 'İptal' : 'Cancel',
          style: 'cancel',
        },
        {
          text: tr ? 'Kaldır' : 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removeCaregiverRel(caregiverId);
          },
        },
      ],
    });
  };

  const handleCancelInvite = (inviteCode: string, emailToCancel: string) => {
    showAlert({
      type: 'warning',
      title: tr ? 'Daveti İptal Et' : 'Cancel Invite',
      message: tr
        ? `${emailToCancel} adresine gönderilen davet iptal edilecek.`
        : `Invite to ${emailToCancel} will be cancelled.`,
      buttons: [
        { text: tr ? 'İptal' : 'Cancel', style: 'cancel' },
        {
          text: tr ? 'İptal Et' : 'Cancel Invite',
          style: 'destructive',
          onPress: async () => {
            await cancelInviteRel(inviteCode);
          },
        },
      ],
    });
  };

  if (!user) return null;

  const activeCaregivers = caregivers.filter(c => c.status === 'active');
  const pendingList = pendingInvites;

  return (
    <SettingsSection icon="👨‍👩‍👧" title={tr ? 'BAKICILAR' : 'CAREGIVERS'}>
      <View style={styles.list}>
        {isLoading && caregivers.length === 0 && pendingList.length === 0 ? (
          <ActivityIndicator style={{ paddingVertical: 16 }} color={colors.primary} />
        ) : null}

        {/* Aktif bakicilar */}
        {activeCaregivers.length === 0 && pendingList.length === 0 && !isLoading ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {tr
                ? 'Henüz bakıcınız yok. Aile bireylerini ekleyerek ilaç uyumunuzu paylaşabilirsiniz.'
                : 'No caregivers yet. Add family members to share your medication adherence.'}
            </Text>
          </View>
        ) : null}

        {activeCaregivers.map((cg, index) => {
          // Hem isim hem email yoksa bos avatar/isim gorunmesin (H1-H3).
          const displayName =
            cg.caregiverName ||
            cg.caregiverEmail ||
            (tr ? 'İsimsiz bakıcı' : 'Unnamed caregiver');
          return (
            <View key={cg.id} style={[styles.row, index === 0 && { borderTopWidth: 0 }]}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(displayName)}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{displayName}</Text>
                {cg.caregiverEmail ? (
                  <Text style={styles.email}>{cg.caregiverEmail}</Text>
                ) : null}
              </View>
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => handleRemove(cg.id, displayName)}
                accessibilityRole="button"
                accessibilityLabel={
                  tr ? `${displayName} bakıcısını kaldır` : `Remove ${displayName}`
                }
              >
                <Text style={styles.removeBtnText}>{tr ? 'Kaldır' : 'Remove'}</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Bekleyen davetler */}
        {pendingList.map((invite, index) => (
          <View
            key={invite.id}
            style={[
              styles.row,
              activeCaregivers.length === 0 && index === 0 && { borderTopWidth: 0 },
            ]}
          >
            <View style={[styles.avatar, { backgroundColor: colors.warning + '20' }]}>
              <Text style={[styles.avatarText, { color: colors.warning }]}>
                {getInitials(invite.caregiverEmail)}
              </Text>
            </View>
            <View style={styles.info}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.statusBadge, { backgroundColor: colors.warning + '20' }]}>
                  <Text style={[styles.statusBadgeText, { color: colors.warning }]}>
                    {tr ? 'Bekliyor' : 'Pending'}
                  </Text>
                </View>
                <Text style={[styles.name, { flex: 1 }]} numberOfLines={1}>
                  {invite.caregiverEmail}
                </Text>
              </View>
              <Text style={styles.email}>
                {tr ? 'Kod' : 'Code'}: {invite.id}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.removeBtn, { backgroundColor: colors.textMuted + '15' }]}
              onPress={() => handleCancelInvite(invite.id, invite.caregiverEmail)}
              accessibilityRole="button"
              accessibilityLabel={
                tr
                  ? `${invite.caregiverEmail} davetini iptal et`
                  : `Cancel invite to ${invite.caregiverEmail}`
              }
            >
              <Text style={[styles.removeBtnText, { color: colors.textMuted }]}>
                {tr ? 'İptal' : 'Cancel'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Yeni davet formu */}
      <View style={styles.inviteForm}>
        <TextInput
          style={[
            styles.input,
            { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface },
          ]}
          placeholder={tr ? 'Bakıcı e-postası' : 'Caregiver email'}
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!submitting}
          accessibilityLabel={tr ? 'Bakıcı e-postası' : 'Caregiver email'}
        />
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.primary }]}
          onPress={handleInvite}
          disabled={submitting}
          accessibilityRole="button"
          accessibilityLabel={tr ? 'Bakıcı davet et' : 'Invite caregiver'}
        >
          {submitting ? (
            <ActivityIndicator color={colors.textOnPrimary} size="small" />
          ) : (
            <Text style={styles.submitBtnText}>{tr ? 'Bakıcı Davet Et' : 'Invite Caregiver'}</Text>
          )}
        </TouchableOpacity>
        {onOpenInviteScreen && (
          <TouchableOpacity
            onPress={onOpenInviteScreen}
            accessibilityRole="button"
            accessibilityLabel={tr ? 'QR ile davet et' : 'Invite by QR'}
          >
            <Text
              style={{
                fontSize: 13,
                color: colors.primary,
                textAlign: 'center',
                paddingVertical: 4,
              }}
            >
              {tr ? 'veya QR kod ile davet et' : 'or invite by QR code'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SettingsSection>
  );
};

export default CaregiverSection;
