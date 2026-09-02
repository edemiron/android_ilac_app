/**
 * AccountDetailsModal — Kullanıcı Hesap Bilgileri, Telefon Yönetimi ve Bulut Durumu Modalı
 *
 * Kullanıcının ad, e-posta, telefon numarası, UID, hesap türü ve bulut eşitleme durumunu
 * modern kartlar, telefon düzenleme, kopyalama aksiyonları ve manuel eşitleme ile gösterir.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ToastAndroid,
  Platform,
  ActivityIndicator,
  Share,
  TextInput,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { ThemeColors } from '../../../contexts/ThemeContext';
import { getUserPhoneNumber, updateUserPhoneNumber } from '../../../services/caregiverService';
import {
  formatPhoneNumber,
  cleanPhoneNumber,
  isValidPhoneNumber,
} from '../../../utils/phoneHelpers';

interface AccountDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  user: {
    uid?: string;
    email?: string | null;
    displayName?: string | null;
    photoURL?: string | null;
  } | null;
  isSyncing: boolean;
  lastSyncAt: string | null;
  onSync: () => void;
  onLogout: () => void;
  onUpdateDisplayName?: (name: string) => Promise<void>;
  colors: ThemeColors;
  isDark: boolean;
  language: string;
}

export function AccountDetailsModal({
  visible,
  onClose,
  user,
  isSyncing,
  lastSyncAt,
  onSync,
  onLogout,
  onUpdateDisplayName,
  colors,
  isDark,
  language,
}: AccountDetailsModalProps) {
  const isTr = language === 'tr';
  const [copiedUid, setCopiedUid] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  // İsim Düzenleme Durumu
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameError, setNameError] = useState('');

  // Telefon durumu
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  // Telefon numarasını yükle
  const loadPhone = useCallback(async () => {
    if (user?.uid) {
      const phone = await getUserPhoneNumber(user.uid);
      setPhoneNumber(phone || '');
    }
  }, [user?.uid]);

  useEffect(() => {
    if (visible) {
      if (user?.uid) {
        loadPhone();
      }
      setIsEditingPhone(false);
      setPhoneError('');
      setIsEditingName(false);
      setNameError('');
    }
  }, [visible, user?.uid, loadPhone]);

  const handleStartEditName = () => {
    setNameInput(user?.displayName || '');
    setNameError('');
    setIsEditingName(true);
  };

  const handleCancelEditName = () => {
    setIsEditingName(false);
    setNameInput('');
    setNameError('');
  };

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setNameError(isTr ? 'Lütfen adınızı giriniz' : 'Please enter your name');
      return;
    }
    if (trimmed.length < 2) {
      setNameError(
        isTr ? 'Adınız en az 2 karakter olmalıdır' : 'Name must be at least 2 characters'
      );
      return;
    }

    setIsSavingName(true);
    setNameError('');

    try {
      if (onUpdateDisplayName) {
        await onUpdateDisplayName(trimmed);
      }
      setIsEditingName(false);
      const successMsg = isTr ? 'Adınız başarıyla güncellendi' : 'Name updated successfully';

      if (Platform.OS === 'android') {
        ToastAndroid.show(successMsg, ToastAndroid.SHORT);
      } else {
        Alert.alert(isTr ? 'Başarılı' : 'Success', successMsg);
      }
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error
          ? err.message
          : isTr
            ? 'Güncelleme başarısız oldu'
            : 'Failed to update';
      setNameError(errMsg);
    } finally {
      setIsSavingName(false);
    }
  };

  const handleCopyUid = async () => {
    if (user?.uid) {
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2500);

      const msg = isTr ? `Kullanıcı UID kopyalandı: ${user.uid}` : `User UID copied: ${user.uid}`;

      if (Platform.OS === 'android') {
        ToastAndroid.show(msg, ToastAndroid.SHORT);
      } else {
        try {
          await Share.share({ message: user.uid, title: 'UID' });
        } catch {
          // ignore
        }
      }
    }
  };

  const handleCopyPhone = async () => {
    if (phoneNumber) {
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2500);

      const formatted = formatPhoneNumber(phoneNumber);
      const msg = isTr ? `Telefon kopyalandı: ${formatted}` : `Phone copied: ${formatted}`;

      if (Platform.OS === 'android') {
        ToastAndroid.show(msg, ToastAndroid.SHORT);
      } else {
        try {
          await Share.share({ message: formatted, title: 'Telefon' });
        } catch {
          // ignore
        }
      }
    }
  };

  const handleStartEditPhone = () => {
    setPhoneInput(phoneNumber);
    setPhoneError('');
    setIsEditingPhone(true);
  };

  const handleCancelEditPhone = () => {
    setIsEditingPhone(false);
    setPhoneInput('');
    setPhoneError('');
  };

  const handleSavePhone = async () => {
    if (!user?.uid) return;

    const trimmed = phoneInput.trim();
    if (trimmed !== '' && !isValidPhoneNumber(trimmed)) {
      setPhoneError(
        isTr
          ? 'Geçerli bir telefon numarası giriniz (örn: 05XX XXX XX XX)'
          : 'Please enter a valid phone number (e.g. +90 5XX...)'
      );
      return;
    }

    setIsSavingPhone(true);
    setPhoneError('');

    try {
      const res = await updateUserPhoneNumber(user.uid, trimmed);
      if (res.success) {
        setPhoneNumber(cleanPhoneNumber(trimmed));
        setIsEditingPhone(false);
        const successMsg = isTr
          ? 'Telefon numarası kaydedildi'
          : 'Phone number updated successfully';

        if (Platform.OS === 'android') {
          ToastAndroid.show(successMsg, ToastAndroid.SHORT);
        } else {
          Alert.alert(isTr ? 'Başarılı' : 'Success', successMsg);
        }
      } else {
        setPhoneError(res.error || (isTr ? 'Kayıt başarısız oldu' : 'Failed to save'));
      }
    } catch {
      setPhoneError(isTr ? 'Bir hata oluştu' : 'An error occurred');
    } finally {
      setIsSavingPhone(false);
    }
  };

  const formatSyncTime = (isoString: string | null) => {
    if (!isoString) return isTr ? 'Henüz eşitlenmedi' : 'Not synced yet';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString(isTr ? 'tr-TR' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const formattedDisplayPhone = phoneNumber ? formatPhoneNumber(phoneNumber) : '';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="person-circle" size={24} color="#0D9488" />
              <Text style={[styles.title, { color: colors.text }]}>
                {isTr ? 'Hesap Bilgileri' : 'Account Details'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}
          >
            {/* Profil Kartı */}
            <View style={[styles.profileCard, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
              {user?.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: '#0D9488' }]}>
                  <Text style={styles.avatarLetter}>
                    {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}

              {!isEditingName ? (
                <TouchableOpacity
                  onPress={handleStartEditName}
                  style={styles.nameRow}
                  activeOpacity={0.7}
                  accessibilityLabel={isTr ? 'Adı Düzenle' : 'Edit Name'}
                >
                  <Text style={[styles.displayName, { color: colors.text }]}>
                    {user?.displayName || (isTr ? 'Kullanıcı' : 'User')}
                  </Text>
                  <View style={styles.editNameButton}>
                    <Ionicons name="pencil" size={15} color="#0D9488" />
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.nameEditForm}>
                  <Text style={[styles.nameEditLabel, { color: colors.textSecondary }]}>
                    {isTr ? 'Adınızı Değiştirin' : 'Change Your Name'}
                  </Text>
                  <View
                    style={[
                      styles.nameInputWrapper,
                      {
                        borderColor: nameError ? '#EF4444' : isDark ? '#334155' : '#CBD5E1',
                        backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                      },
                    ]}
                  >
                    <Ionicons name="person" size={16} color="#0D9488" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.nameInput, { color: colors.text }]}
                      value={nameInput}
                      onChangeText={text => {
                        setNameInput(text);
                        if (nameError) setNameError('');
                      }}
                      placeholder={isTr ? 'Örn: Enes Demir' : 'e.g. Enes Demir'}
                      placeholderTextColor={colors.textSecondary}
                      autoFocus
                      maxLength={40}
                      returnKeyType="done"
                      onSubmitEditing={handleSaveName}
                    />
                    {nameInput.length > 0 && (
                      <TouchableOpacity
                        onPress={() => setNameInput('')}
                        style={styles.clearInputButton}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {nameError ? (
                    <View style={styles.nameErrorRow}>
                      <Ionicons name="alert-circle" size={13} color="#EF4444" />
                      <Text style={styles.errorText}>{nameError}</Text>
                    </View>
                  ) : null}

                  <View style={styles.nameEditActions}>
                    <TouchableOpacity
                      onPress={handleCancelEditName}
                      style={[styles.cancelButton, { borderColor: isDark ? '#334155' : '#CBD5E1' }]}
                      disabled={isSavingName}
                    >
                      <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                        {isTr ? 'Vazgeç' : 'Cancel'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleSaveName}
                      style={[styles.saveNameButton, isSavingName && styles.disabledButton]}
                      disabled={isSavingName}
                    >
                      {isSavingName ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                          <Text style={styles.saveNameButtonText}>{isTr ? 'Kaydet' : 'Save'}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <Text style={[styles.emailText, { color: colors.textSecondary }]}>
                {user?.email || (isTr ? 'E-posta belirtilmemiş' : 'No email')}
              </Text>

              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.verifiedText}>
                  {isTr ? 'Doğrulanmış Hesap' : 'Verified Account'}
                </Text>
              </View>
            </View>

            {/* Bilgi Listesi */}
            <View style={styles.infoSection}>
              {/* Telefon Numarası Row & Edit Form */}
              <View
                style={[
                  styles.phoneContainerCard,
                  { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' },
                ]}
              >
                {!isEditingPhone ? (
                  <View style={styles.phoneDisplayRow}>
                    <View style={styles.infoLeft}>
                      <View
                        style={[styles.iconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}
                      >
                        <Ionicons name="call" size={18} color="#10B981" />
                      </View>
                      <View style={styles.infoTexts}>
                        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                          {isTr
                            ? 'Telefon Numarası (Bakıcı Araması)'
                            : 'Phone Number (Caregiver Call)'}
                        </Text>
                        <Text
                          style={[
                            styles.infoValue,
                            { color: formattedDisplayPhone ? colors.text : colors.textSecondary },
                            !formattedDisplayPhone && styles.italicText,
                          ]}
                          numberOfLines={1}
                        >
                          {formattedDisplayPhone ||
                            (isTr
                              ? 'Numara eklenmedi (Bakıcı araması için ekleyin)'
                              : 'No phone added')}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.phoneActionButtons}>
                      {formattedDisplayPhone ? (
                        <>
                          <TouchableOpacity
                            onPress={handleCopyPhone}
                            style={styles.iconActionButton}
                            accessibilityLabel="Numarayı Kopyala"
                          >
                            <Ionicons
                              name={copiedPhone ? 'checkmark' : 'copy-outline'}
                              size={17}
                              color={copiedPhone ? '#10B981' : '#6366F1'}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={handleStartEditPhone}
                            style={styles.editButton}
                            accessibilityLabel="Numarayı Düzenle"
                          >
                            <Ionicons name="pencil" size={15} color="#0D9488" />
                            <Text style={styles.editButtonText}>{isTr ? 'Düzenle' : 'Edit'}</Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <TouchableOpacity
                          onPress={handleStartEditPhone}
                          style={styles.addPhoneButton}
                          accessibilityLabel="Numara Ekle"
                        >
                          <Ionicons name="add" size={16} color="#FFFFFF" />
                          <Text style={styles.addPhoneButtonText}>{isTr ? 'Ekle' : 'Add'}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ) : (
                  /* Telefon Düzenleme Formu */
                  <View style={styles.phoneEditForm}>
                    <View style={styles.phoneEditHeader}>
                      <Ionicons name="call-outline" size={18} color="#10B981" />
                      <Text style={[styles.phoneEditTitle, { color: colors.text }]}>
                        {isTr ? 'Telefon Numarasını Güncelle' : 'Update Phone Number'}
                      </Text>
                    </View>

                    <Text style={[styles.phoneEditHint, { color: colors.textSecondary }]}>
                      {isTr
                        ? 'Acil SOS ve doz kaçırma durumlarında bakıcılarınızın sizi doğrudan arayabilmesi için numaranızı girin.'
                        : 'Enter your phone so caregivers can call you directly during emergencies or missed doses.'}
                    </Text>

                    <View
                      style={[
                        styles.inputWrapper,
                        { borderColor: phoneError ? '#EF4444' : isDark ? '#334155' : '#CBD5E1' },
                      ]}
                    >
                      <Ionicons name="call" size={18} color="#0D9488" style={styles.inputIcon} />
                      <TextInput
                        style={[styles.phoneInput, { color: colors.text }]}
                        value={phoneInput}
                        onChangeText={text => {
                          setPhoneInput(text);
                          if (phoneError) setPhoneError('');
                        }}
                        placeholder={
                          isTr ? 'Örn: 0555 123 45 67 veya +90...' : 'e.g. +90 555 123 45 67'
                        }
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="phone-pad"
                        autoFocus
                      />
                    </View>

                    {phoneInput.trim() !== '' && (
                      <Text style={styles.previewFormattedText}>
                        {isTr ? 'Formatlı Görünüm: ' : 'Preview: '}
                        <Text style={{ fontWeight: '700', color: '#0D9488' }}>
                          {formatPhoneNumber(phoneInput)}
                        </Text>
                      </Text>
                    )}

                    {phoneError ? (
                      <View style={styles.errorRow}>
                        <Ionicons name="alert-circle" size={14} color="#EF4444" />
                        <Text style={styles.errorText}>{phoneError}</Text>
                      </View>
                    ) : null}

                    <View style={styles.phoneEditActions}>
                      <TouchableOpacity
                        style={[
                          styles.cancelButton,
                          { borderColor: isDark ? '#475569' : '#CBD5E1' },
                        ]}
                        onPress={handleCancelEditPhone}
                        disabled={isSavingPhone}
                      >
                        <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                          {isTr ? 'Vazgeç' : 'Cancel'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.savePhoneButton, isSavingPhone && styles.disabledButton]}
                        onPress={handleSavePhone}
                        disabled={isSavingPhone}
                      >
                        {isSavingPhone ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                            <Text style={styles.savePhoneButtonText}>
                              {isTr ? 'Kaydet' : 'Save'}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              {/* UID Row */}
              <View style={[styles.infoRow, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}>
                <View style={styles.infoLeft}>
                  <View
                    style={[styles.iconCircle, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}
                  >
                    <Ionicons name="finger-print" size={18} color="#6366F1" />
                  </View>
                  <View style={styles.infoTexts}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                      {isTr ? 'Kullanıcı Kimliği (UID)' : 'User ID (UID)'}
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>
                      {user?.uid || '-'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={handleCopyUid} style={styles.copyButton}>
                  <Ionicons
                    name={copiedUid ? 'checkmark' : 'copy-outline'}
                    size={17}
                    color={copiedUid ? '#10B981' : '#6366F1'}
                  />
                </TouchableOpacity>
              </View>

              {/* Bulut Durumu Row */}
              <View style={[styles.infoRow, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}>
                <View style={styles.infoLeft}>
                  <View
                    style={[styles.iconCircle, { backgroundColor: 'rgba(13, 148, 136, 0.15)' }]}
                  >
                    <Ionicons name="cloud-done-outline" size={18} color="#0D9488" />
                  </View>
                  <View style={styles.infoTexts}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                      {isTr ? 'Bulut Eşitleme Durumu' : 'Cloud Sync Status'}
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>
                      {isSyncing
                        ? isTr
                          ? 'Eşitleniyor...'
                          : 'Syncing...'
                        : isTr
                          ? `Son Eşitleme: ${formatSyncTime(lastSyncAt)}`
                          : `Last Synced: ${formatSyncTime(lastSyncAt)}`}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Güvenlik & Oturum Türü */}
              <View style={[styles.infoRow, { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' }]}>
                <View style={styles.infoLeft}>
                  <View
                    style={[styles.iconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}
                  >
                    <Ionicons name="shield-checkmark-outline" size={18} color="#10B981" />
                  </View>
                  <View style={styles.infoTexts}>
                    <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                      {isTr ? 'Giriş Sağlayıcısı' : 'Auth Provider'}
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>
                      {user?.photoURL?.includes('google') || user?.email?.includes('gmail')
                        ? 'Google Sign-In (OAuth 2.0)'
                        : 'Firebase Secure Auth'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Aksiyon Butonları */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[styles.syncButton, isSyncing && styles.disabledButton]}
                onPress={onSync}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.syncButtonText}>
                      {isTr ? 'Bulutla Şimdi Eşitle' : 'Sync to Cloud Now'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.logoutRowButton} onPress={onLogout}>
                <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                <Text style={styles.logoutText}>{isTr ? 'Oturumu Kapat' : 'Sign Out'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.1)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  profileCard: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    marginBottom: 18,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#0D9488',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarLetter: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  displayName: {
    fontSize: 20,
    fontWeight: '700',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 4,
  },
  editNameButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(13, 148, 136, 0.12)',
  },
  nameEditForm: {
    width: '100%',
    marginVertical: 6,
    paddingHorizontal: 8,
  },
  nameEditLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
  },
  nameInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 42,
  },
  nameInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 0,
  },
  clearInputButton: {
    padding: 4,
  },
  nameErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    justifyContent: 'center',
  },
  nameEditActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 10,
  },
  saveNameButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#0D9488',
    borderRadius: 8,
  },
  saveNameButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emailText: {
    fontSize: 14,
    marginBottom: 10,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  infoSection: {
    gap: 10,
    marginBottom: 20,
  },
  phoneContainerCard: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  phoneDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  phoneActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconActionButton: {
    padding: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderRadius: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(13, 148, 136, 0.12)',
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D9488',
  },
  addPhoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#10B981',
    borderRadius: 8,
  },
  addPhoneButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  phoneEditForm: {
    padding: 16,
  },
  phoneEditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  phoneEditTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  phoneEditHint: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  inputIcon: {
    marginRight: 8,
  },
  phoneInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
    fontWeight: '600',
  },
  previewFormattedText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
  phoneEditActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
  },
  cancelButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  savePhoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#10B981',
    borderRadius: 8,
  },
  savePhoneButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  italicText: {
    fontStyle: 'italic',
    fontSize: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  infoTexts: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  copyButton: {
    padding: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderRadius: 8,
  },
  actionsContainer: {
    gap: 12,
    marginTop: 4,
  },
  syncButton: {
    backgroundColor: '#0D9488',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  logoutRowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    gap: 8,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
  },
});
