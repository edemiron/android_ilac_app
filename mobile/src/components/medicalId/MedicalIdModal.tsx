/**
 * MedicalIdModal.tsx — Acil Durum Tıbbi Kimlik Kartı Modalı (ICE - In Case of Emergency)
 *
 * 112 Acil hekim ve paramedikler için hastanın kan grubu, alerjileri,
 * kronik rahatsızlıkları, hayati ilaçları ve acil irtibat kişilerini görüntüler (v2.0.0).
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Linking,
  Alert,
  Switch,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useMedicalIdStore, BloodType } from '../../stores/medicalIdStore';
import { useMedicineStore } from '../../stores/medicineStore';
import type { ThemeColors } from '../../contexts/ThemeContext';

interface MedicalIdModalProps {
  visible: boolean;
  onClose: () => void;
  colors: ThemeColors;
  isDark: boolean;
  language: 'tr' | 'en';
}

const BLOOD_TYPES: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-'];

export function MedicalIdModal({
  visible,
  onClose,
  colors,
  isDark,
  language,
}: MedicalIdModalProps) {
  const isTr = language === 'tr';
  const medicalId = useMedicalIdStore(s => s.data);
  const updateMedicalId = useMedicalIdStore(s => s.updateMedicalId);
  const addEmergencyContact = useMedicalIdStore(s => s.addEmergencyContact);
  const removeEmergencyContact = useMedicalIdStore(s => s.removeEmergencyContact);

  const medicines = useMedicineStore(s => s.medicines);
  const criticalMedicines = medicines.filter(
    m => m.isActive && (m.isCritical || m.category === 'heart' || m.category === 'diabetes')
  );

  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(medicalId.fullName);
  const [birthDate, setBirthDate] = useState(medicalId.birthDate);
  const [bloodType, setBloodType] = useState<BloodType>(medicalId.bloodType);
  const [allergiesText, setAllergiesText] = useState(medicalId.allergies.join(', '));
  const [chronicText, setChronicText] = useState(medicalId.chronicConditions.join(', '));
  const [notes, setNotes] = useState(medicalId.notes);
  const [showOnLockScreen, setShowOnLockScreen] = useState(medicalId.showOnLockScreen);

  // Yeni acil durum kişisi ekleme formu
  const [newContactName, setNewContactName] = useState('');
  const [newContactRel, setNewContactRel] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');

  const handleSave = () => {
    updateMedicalId({
      fullName: fullName.trim(),
      birthDate: birthDate.trim(),
      bloodType,
      allergies: allergiesText
        .split(',')
        .map(s => s.trim())
        .filter(Boolean),
      chronicConditions: chronicText
        .split(',')
        .map(s => s.trim())
        .filter(Boolean),
      notes: notes.trim(),
      showOnLockScreen,
    });
    setIsEditing(false);
  };

  const handleAddContact = () => {
    if (!newContactName.trim() || !newContactPhone.trim()) {
      Alert.alert(
        isTr ? 'Eksik Bilgi' : 'Missing Info',
        isTr
          ? 'Lütfen kişi adı ve telefon numarasını giriniz.'
          : 'Please enter contact name and phone number.'
      );
      return;
    }

    addEmergencyContact({
      name: newContactName.trim(),
      relationship: newContactRel.trim() || (isTr ? 'Yakını' : 'Relative'),
      phone: newContactPhone.trim(),
    });

    setNewContactName('');
    setNewContactRel('');
    setNewContactPhone('');
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`).catch(() => {
      Alert.alert(isTr ? 'Hata' : 'Error', isTr ? 'Arama başlatılamadı.' : 'Could not make call.');
    });
  };

  const handleCall112 = () => {
    Linking.openURL('tel:112').catch(() => {
      Alert.alert(isTr ? 'Hata' : 'Error', isTr ? '112 aranamadı.' : 'Could not dial 112.');
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Başlık Barı */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.emergencyIconBadge}>
                <Ionicons name="medical" size={20} color="#FFFFFF" />
              </View>
              <View style={{ marginLeft: 10 }}>
                <Text style={[styles.title, { color: colors.text }]}>
                  {isTr ? 'Acil Tıbbi Kimlik Kartı' : 'Emergency Medical ID'}
                </Text>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                  {isTr ? 'ICE — In Case of Emergency' : 'ICE — Medical Profile'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeButton, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}
              accessibilityLabel={isTr ? 'Kapat' : 'Close'}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* 112 Acil Arama Hızlı Butonu */}
            <TouchableOpacity
              style={styles.call112Button}
              onPress={handleCall112}
              activeOpacity={0.8}
              accessibilityLabel={isTr ? '112 Acil Yardım Çağır' : 'Call 112 Emergency'}
            >
              <Ionicons name="call" size={22} color="#FFFFFF" />
              <Text style={styles.call112Text}>
                {isTr ? '112 Acil Çağrı Yap' : 'Call 112 Emergency'}
              </Text>
            </TouchableOpacity>

            {!isEditing ? (
              <>
                {/* Temel Profil Kartı */}
                <View
                  style={[
                    styles.infoBlock,
                    { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#F8FAFC' },
                  ]}
                >
                  <View style={styles.profileRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.nameText, { color: colors.text }]}>
                        {medicalId.fullName || (isTr ? 'İsim Girilmedi' : 'Name Not Set')}
                      </Text>
                      <Text style={[styles.metaText, { color: colors.textMuted }]}>
                        {medicalId.birthDate
                          ? isTr
                            ? `Doğum: ${medicalId.birthDate}`
                            : `Birth: ${medicalId.birthDate}`
                          : isTr
                            ? 'Doğum tarihi belirtilmedi'
                            : 'Birth date not set'}
                      </Text>
                    </View>

                    {/* Kan Grubu Rozeti */}
                    <View style={styles.bloodBadge}>
                      <Text style={styles.bloodBadgeLabel}>{isTr ? 'KAN' : 'BLOOD'}</Text>
                      <Text style={styles.bloodBadgeValue}>
                        {medicalId.bloodType !== 'unknown' ? medicalId.bloodType : '?'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Alerjiler */}
                <View style={styles.sectionBlock}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    <Ionicons name="warning-outline" size={16} color="#EF4444" />{' '}
                    {isTr ? 'Alerjiler' : 'Allergies'}
                  </Text>
                  {medicalId.allergies.length > 0 ? (
                    <View style={styles.tagContainer}>
                      {medicalId.allergies.map((allergy, idx) => (
                        <View key={idx} style={styles.allergyTag}>
                          <Text style={styles.allergyTagText}>{allergy}</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                      {isTr ? 'Kayıtlı alerji bulunmuyor.' : 'No recorded allergies.'}
                    </Text>
                  )}
                </View>

                {/* Kronik Rahatsızlıklar */}
                <View style={styles.sectionBlock}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    <Ionicons name="fitness-outline" size={16} color="#3B82F6" />{' '}
                    {isTr ? 'Kronik Hastalıklar' : 'Chronic Conditions'}
                  </Text>
                  {medicalId.chronicConditions.length > 0 ? (
                    <View style={styles.tagContainer}>
                      {medicalId.chronicConditions.map((cond, idx) => (
                        <View key={idx} style={styles.chronicTag}>
                          <Text style={styles.chronicTagText}>{cond}</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                      {isTr ? 'Kayıtlı kronik hastalık bulunmuyor.' : 'No recorded conditions.'}
                    </Text>
                  )}
                </View>

                {/* Aktif Hayati İlaçlar */}
                <View style={styles.sectionBlock}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    <Ionicons name="medkit-outline" size={16} color="#10B981" />{' '}
                    {isTr ? 'Kullanılan Hayati İlaçlar' : 'Critical Medications'}
                  </Text>
                  {criticalMedicines.length > 0 ? (
                    criticalMedicines.map(med => (
                      <View
                        key={med.id}
                        style={[
                          styles.medRow,
                          { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ECFDF5' },
                        ]}
                      >
                        <Text style={[styles.medName, { color: colors.text }]}>{med.name}</Text>
                        <Text style={[styles.medDose, { color: colors.textMuted }]}>
                          {med.dosage}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                      {isTr ? 'Hayati işaretli ilaç bulunmuyor.' : 'No critical medications.'}
                    </Text>
                  )}
                </View>

                {/* Acil İrtibat Kişileri */}
                <View style={styles.sectionBlock}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    <Ionicons name="people-outline" size={16} color="#F59E0B" />{' '}
                    {isTr ? 'Acil İrtibat Kişileri' : 'Emergency Contacts'}
                  </Text>
                  {medicalId.emergencyContacts.length > 0 ? (
                    medicalId.emergencyContacts.map(contact => (
                      <View
                        key={contact.id}
                        style={[
                          styles.contactRow,
                          { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : '#F1F5F9' },
                        ]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.contactName, { color: colors.text }]}>
                            {contact.name} ({contact.relationship})
                          </Text>
                          <Text style={[styles.contactPhone, { color: colors.textMuted }]}>
                            {contact.phone}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.contactCallBtn}
                          onPress={() => handleCall(contact.phone)}
                          accessibilityLabel={`${contact.name} Ara`}
                        >
                          <Ionicons name="call" size={18} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    ))
                  ) : (
                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                      {isTr ? 'Acil kişi eklenmedi.' : 'No emergency contacts.'}
                    </Text>
                  )}
                </View>

                {/* Tıbbi Notlar */}
                {medicalId.notes ? (
                  <View style={styles.sectionBlock}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      {isTr ? 'Tıbbi Notlar' : 'Medical Notes'}
                    </Text>
                    <Text style={[styles.notesText, { color: colors.textMuted }]}>
                      {medicalId.notes}
                    </Text>
                  </View>
                ) : null}

                {/* Düzenle Butonu */}
                <TouchableOpacity
                  style={[styles.editButton, { borderColor: colors.primary }]}
                  onPress={() => {
                    setFullName(medicalId.fullName);
                    setBirthDate(medicalId.birthDate);
                    setBloodType(medicalId.bloodType);
                    setAllergiesText(medicalId.allergies.join(', '));
                    setChronicText(medicalId.chronicConditions.join(', '));
                    setNotes(medicalId.notes);
                    setShowOnLockScreen(medicalId.showOnLockScreen);
                    setIsEditing(true);
                  }}
                >
                  <Ionicons name="create-outline" size={18} color={colors.primary} />
                  <Text style={[styles.editButtonText, { color: colors.primary }]}>
                    {isTr ? 'Kimlik Bilgilerini Düzenle' : 'Edit Medical ID'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              /* DÜZENLEME FORMU */
              <View style={styles.formContainer}>
                <Text style={[styles.formLabel, { color: colors.text }]}>
                  {isTr ? 'Ad Soyad' : 'Full Name'}
                </Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder={isTr ? 'Örn: Ahmet Yılmaz' : 'e.g. John Doe'}
                  placeholderTextColor={colors.textMuted}
                />

                <Text style={[styles.formLabel, { color: colors.text }]}>
                  {isTr ? 'Doğum Tarihi (YYYY-AA-GG)' : 'Birth Date'}
                </Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                  value={birthDate}
                  onChangeText={setBirthDate}
                  placeholder="1970-01-15"
                  placeholderTextColor={colors.textMuted}
                />

                <Text style={[styles.formLabel, { color: colors.text }]}>
                  {isTr ? 'Kan Grubu' : 'Blood Type'}
                </Text>
                <View style={styles.bloodGrid}>
                  {BLOOD_TYPES.map(bt => (
                    <TouchableOpacity
                      key={bt}
                      style={[
                        styles.bloodOption,
                        bloodType === bt && { backgroundColor: '#EF4444', borderColor: '#DC2626' },
                      ]}
                      onPress={() => setBloodType(bt)}
                    >
                      <Text
                        style={[
                          styles.bloodOptionText,
                          bloodType === bt && { color: '#FFFFFF', fontWeight: 'bold' },
                        ]}
                      >
                        {bt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.formLabel, { color: colors.text }]}>
                  {isTr ? 'Alerjiler (Virgülle ayırınız)' : 'Allergies (comma separated)'}
                </Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                  value={allergiesText}
                  onChangeText={setAllergiesText}
                  placeholder={isTr ? 'Penisilin, Arı sokması, vb.' : 'Penicillin, etc.'}
                  placeholderTextColor={colors.textMuted}
                />

                <Text style={[styles.formLabel, { color: colors.text }]}>
                  {isTr ? 'Kronik Hastalıklar (Virgülle ayırınız)' : 'Chronic Conditions'}
                </Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                  value={chronicText}
                  onChangeText={setChronicText}
                  placeholder={isTr ? 'Tansiyon, Diyabet, Astım vb.' : 'Hypertension, etc.'}
                  placeholderTextColor={colors.textMuted}
                />

                <Text style={[styles.formLabel, { color: colors.text }]}>
                  {isTr ? 'Özel Tıbbi Notlar / Protez / İmplant' : 'Special Notes'}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { color: colors.text, borderColor: colors.border, height: 70 },
                  ]}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  placeholder={isTr ? 'Kalp pili var, sol diz protezi vb.' : 'Pacemaker, etc.'}
                  placeholderTextColor={colors.textMuted}
                />

                {/* Acil Kişi Ekle */}
                <View style={styles.addContactBlock}>
                  <Text style={[styles.formLabel, { color: colors.text, marginTop: 10 }]}>
                    {isTr ? 'Yeni Acil İrtibat Kişisi Ekle' : 'Add Emergency Contact'}
                  </Text>
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                    value={newContactName}
                    onChangeText={setNewContactName}
                    placeholder={isTr ? 'Kişi Adı Soyadı' : 'Contact Name'}
                    placeholderTextColor={colors.textMuted}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                    value={newContactRel}
                    onChangeText={setNewContactRel}
                    placeholder={isTr ? 'Yakınlık (Eşi, Oğlu, Kızı vb.)' : 'Relationship'}
                    placeholderTextColor={colors.textMuted}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                    value={newContactPhone}
                    onChangeText={setNewContactPhone}
                    keyboardType="phone-pad"
                    placeholder="05XXXXXXXXX"
                    placeholderTextColor={colors.textMuted}
                  />
                  <TouchableOpacity style={styles.addContactBtn} onPress={handleAddContact}>
                    <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.addContactBtnText}>
                      {isTr ? 'Kişiyi Ekle' : 'Add Contact'}
                    </Text>
                  </TouchableOpacity>

                  {/* Mevcut Kişiler Listesi */}
                  {medicalId.emergencyContacts.map(c => (
                    <View key={c.id} style={styles.editContactItem}>
                      <Text style={[styles.editContactText, { color: colors.text }]}>
                        {c.name} ({c.relationship}) - {c.phone}
                      </Text>
                      <TouchableOpacity
                        onPress={() => removeEmergencyContact(c.id)}
                        accessibilityLabel={`${c.name} sil`}
                        accessibilityRole="button"
                      >
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>

                {/* Kilit Ekranı Açık Rıza Switch */}
                <View style={styles.switchRow}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={[styles.switchLabel, { color: colors.text }]}>
                      {isTr ? 'Kilit Ekranında Göster' : 'Show on Lock Screen'}
                    </Text>
                    <Text style={[styles.switchSub, { color: colors.textMuted }]}>
                      {isTr
                        ? '112 ekiplerinin cihaz kilitliyken tıbbi kimliğinizi görmesine izin verir.'
                        : 'Allows first responders to see your ID while device is locked.'}
                    </Text>
                  </View>
                  <Switch
                    value={showOnLockScreen}
                    onValueChange={setShowOnLockScreen}
                    trackColor={{ false: '#CBD5E1', true: '#10B981' }}
                  />
                </View>

                {/* Kaydet & İptal Butonları */}
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.cancelBtn, { borderColor: colors.border }]}
                    onPress={() => setIsEditing(false)}
                  >
                    <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>
                      {isTr ? 'İptal' : 'Cancel'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.saveBtnText}>{isTr ? 'Kaydet' : 'Save'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxHeight: '88%',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emergencyIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  call112Button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 16,
    shadowColor: '#DC2626',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  call112Text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  infoBlock: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameText: {
    fontSize: 18,
    fontWeight: '800',
  },
  metaText: {
    fontSize: 13,
    marginTop: 4,
  },
  bloodBadge: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 64,
  },
  bloodBadgeLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    fontWeight: '700',
  },
  bloodBadgeValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  sectionBlock: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  allergyTag: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#EF4444',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  allergyTagText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
  },
  chronicTag: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: '#3B82F6',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chronicTagText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '600',
  },
  medRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 6,
  },
  medName: {
    fontSize: 14,
    fontWeight: '700',
  },
  medDose: {
    fontSize: 13,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
  },
  contactName: {
    fontSize: 14,
    fontWeight: '700',
  },
  contactPhone: {
    fontSize: 13,
    marginTop: 2,
  },
  contactCallBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  notesText: {
    fontSize: 13,
    lineHeight: 18,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 10,
    marginBottom: 20,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
  formContainer: {
    paddingBottom: 20,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: 8,
  },
  bloodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  bloodOption: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  bloodOptionText: {
    fontSize: 14,
  },
  addContactBlock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#CBD5E1',
    marginTop: 10,
    paddingTop: 10,
  },
  addContactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 8,
    marginBottom: 10,
  },
  addContactBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 4,
    fontSize: 13,
  },
  editContactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  editContactText: {
    fontSize: 13,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 14,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  switchSub: {
    fontSize: 12,
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 2,
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
});
