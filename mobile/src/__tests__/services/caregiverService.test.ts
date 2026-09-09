/**
 * caregiverService tests — Sprint 7
 * Firebase mock'lu. isValidInviteCode pure function test edilir.
 */

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn().mockResolvedValue({ exists: () => false, data: () => ({}) }),
  setDoc: jest.fn().mockResolvedValue(undefined),
  updateDoc: jest.fn().mockResolvedValue(undefined),
  deleteDoc: jest.fn().mockResolvedValue(undefined),
  query: jest.fn(),
  where: jest.fn(),
  onSnapshot: jest.fn().mockReturnValue(() => {}),
  getDocs: jest.fn().mockResolvedValue({
    docs: [],
    empty: true,
    forEach(cb: any) {
      this.docs.forEach(cb);
    },
  }),
}));

jest.mock('../../utils/logger', () => ({
  createScopedLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

jest.mock('../../utils/notifications', () => ({
  scheduleMedicineNotification: jest.fn(),
}));

// K1: davet kabulü artık sunucudaki `redeemCaregiverInvite` callable'ına
// gidiyor. Mock'lanmazsa `getFunctionsInstance()` → `getApp()` gerçek bir
// Firebase uygulaması arayıp patlıyor ve testler "unknown" hatası dönüyordu.
jest.mock('../../services/cloudFunctions', () => ({
  FUNCTIONS_REGION: 'europe-west1',
  getFunctionsInstance: jest.fn(),
  callFunction: jest.fn(),
}));

// Mock global.fetch
(global as any).fetch = jest.fn().mockResolvedValue({
  json: async () => ({ data: { status: 'ok' } }),
});

import { isValidInviteCode, acceptCaregiverInvite } from '../../services/caregiverService';
import { callFunction } from '../../services/cloudFunctions';
import { getDoc, setDoc, updateDoc } from 'firebase/firestore';

describe('caregiverService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isValidInviteCode', () => {
    it('accepts 6-character alphanumeric codes (excluding I, O, Q)', () => {
      expect(isValidInviteCode('ABC123')).toBe(true);
      expect(isValidInviteCode('XYZ789')).toBe(true);
      expect(isValidInviteCode('123456')).toBe(true);
    });

    it('rejects codes with invalid characters (lowercase, special)', () => {
      expect(isValidInviteCode('abc123')).toBe(false); // lowercase
      expect(isValidInviteCode('Abc123')).toBe(false); // mixed case
      expect(isValidInviteCode('AB-123')).toBe(false); // special char
      expect(isValidInviteCode('AB 123')).toBe(false); // space
    });

    it('accepts server-generated 12-character codes (K1)', () => {
      // Sunucu artık 12 hane üretiyor. Eski `{6,8}` kalıbı bunların HEPSİNİ
      // reddederdi — yani sunucu tarafı düzeltme tek başına tüm kabul akışını
      // kırardı. İki tarafın birlikte değişmesi gereken bir örnek.
      expect(isValidInviteCode('A1B2C3D4E5F6')).toBe(true);
      expect(isValidInviteCode('ABCDEFGHIJKL')).toBe(true); // 12 chars
    });

    it('rejects codes with wrong length', () => {
      expect(isValidInviteCode('ABC')).toBe(false);
      expect(isValidInviteCode('ABCDE')).toBe(false);
      // 6-12 aralığı geçerli: 9 karakter artık REDDEDİLMİYOR (eski davranış).
      expect(isValidInviteCode('ABCDEFGHI')).toBe(true);
      expect(isValidInviteCode('A1B2C3D4E5F67')).toBe(false); // 13 chars
      expect(isValidInviteCode('')).toBe(false);
    });
  });

  describe('acceptCaregiverInvite', () => {
    it("kabulü sunucuya devrediyor; istemci artık Firestore'a YAZMIYOR ve daveti OKUMUYOR", async () => {
      (callFunction as jest.Mock).mockResolvedValueOnce({
        success: true,
        patientId: 'patient_user_456',
        patientName: 'Ahmet',
        relationshipId: 'patient_user_456__caregiver_user_789',
      });

      const res = await acceptCaregiverInvite('7A1ECC', 'caregiver_user_789', 'Mehmet');
      expect(res.success).toBe(true);

      expect(callFunction).toHaveBeenCalledWith('redeemCaregiverInvite', {
        inviteCode: '7A1ECC',
        caregiverName: 'Mehmet',
        caregiverFcmToken: '',
      });

      // ⚠️ K1/K2 — bu üç assertion değişikliğin ÖZÜ.
      // Eski akış istemcide `getDoc(inviteRef)` + `setDoc(relationship)` +
      // `updateDoc(invite→accepted)` yapıyordu:
      //   - getDoc  → brute-force enumeration'ın geçtiği yer
      //   - setDoc/updateDoc AYRI iki yazımdı ve ikincinin başarısızlığı
      //     TOLERE ediliyordu → kullanılmış davet `pending` kalıp farklı bir
      //     bakıcı tarafından tekrar kullanılabiliyordu
      // Artık üçü de sunucuda, TEK transaction'da. İstemcide hiçbirinin
      // kalmadığı burada kilitleniyor.
      expect(getDoc).not.toHaveBeenCalled();
      expect(setDoc).not.toHaveBeenCalled();
      expect(updateDoc).not.toHaveBeenCalled();
    });

    it('⚠️ self-invite reddi SUNUCUDAN geliyor ve kullanıcıya iletiliyor', async () => {
      // Kontrol eskiden yalnızca istemcideydi ve firestore.rules'ta karşılığı
      // YOKTU: hasta kendi koduyla `uid__uid` ilişkisi kurup kendisinin aktif
      // bakıcısı olabiliyordu. Artık sunucu reddediyor.
      (callFunction as jest.Mock).mockRejectedValueOnce({
        code: 'failed-precondition',
        message:
          'Kendi oluşturduğunuz davet kodunu kullanamazsınız. Bu kodu yakınınız ile paylaşmalısınız.',
      });

      const res = await acceptCaregiverInvite('7A1ECC', 'same_user_123', 'Ahmet');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Kendi oluşturduğunuz davet kodunu kullanamazsınız');
    });

    it('kota aşımını kullanıcıya anlaşılır biçimde bildiriyor', async () => {
      // Rate-limit enumeration'ı ekonomik olarak anlamsız kılan asıl kontrol;
      // kullanıcıya ne zaman tekrar deneyebileceği söylenmeli.
      (callFunction as jest.Mock).mockRejectedValueOnce({
        code: 'resource-exhausted',
        message: 'Çok fazla davet kodu denemesi yaptınız. Lütfen bir saat sonra tekrar deneyin.',
      });

      const res = await acceptCaregiverInvite('7A1ECC', 'caregiver_user_789', 'Mehmet');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Çok fazla davet kodu denemesi');
    });

    it('handles permission-denied error gracefully with clear Turkish explanation', async () => {
      (callFunction as jest.Mock).mockRejectedValueOnce({
        code: 'permission-denied',
        message: 'Missing or insufficient permissions.',
      });

      const res = await acceptCaregiverInvite('7A1ECC', 'caregiver_user_789', 'Mehmet');
      expect(res.success).toBe(false);
      // Sunucunun/Firestore'un teknik İngilizce mesajı DEĞİL, istemcinin sabit
      // Türkçe metni gösterilmeli.
      expect(res.error).toContain('Yetkisiz erişim. Lütfen Google veya E-posta ile giriş');
      expect(res.error).not.toContain('Missing or insufficient permissions');
    });

    it("⚠️ generic red mesajı enumeration ORACLE'ı yaratmıyor", async () => {
      // Sunucu "bulunamadı / süresi dolmuş / zaten kullanılmış" ayrımını
      // BİLEREK yapmıyor — o ayrım saldırgana hangi kodların var olduğunu
      // söyler. İstemci de kendi tarafında ayrıntı ÜRETMEMELİ.
      (callFunction as jest.Mock).mockRejectedValueOnce({
        code: 'failed-precondition',
        message: 'Davet kodu geçersiz veya artık kullanılamıyor.',
      });

      const res = await acceptCaregiverInvite('7A1ECC', 'caregiver_user_789', 'Mehmet');
      expect(res.success).toBe(false);
      expect(res.error).toBe('Davet kodu geçersiz veya artık kullanılamıyor.');
      expect(res.error).not.toContain('süresi dolmuş');
      expect(res.error).not.toContain('bulunamadı');
      expect(res.error).not.toContain('zaten kullanılmış');
    });

    it('sunucuya ulaşılamadığında ağ hatası olarak bildiriliyor', async () => {
      (callFunction as jest.Mock).mockRejectedValueOnce({
        code: 'unavailable',
        message: 'network error',
      });

      const res = await acceptCaregiverInvite('7A1ECC', 'caregiver_user_789', 'Mehmet');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Sunucuya ulaşılamadı');
    });
  });

  describe('subscribeToPatientsForCaregiver', () => {
    it('creates onSnapshot listener with caregiverId query', () => {
      const { onSnapshot } = require('firebase/firestore');
      const { subscribeToPatientsForCaregiver } = require('../../services/caregiverService');
      const callback = jest.fn();

      const unsub = subscribeToPatientsForCaregiver('caregiver_123', callback);
      expect(onSnapshot).toHaveBeenCalled();
      expect(typeof unsub).toBe('function');
    });
  });

  describe('sendEmergencySosToCaregivers', () => {
    it('returns error if patient has no active caregivers', async () => {
      const { getDocs } = require('firebase/firestore');
      const { sendEmergencySosToCaregivers } = require('../../services/caregiverService');
      (getDocs as jest.Mock).mockResolvedValueOnce({ docs: [] });

      const res = await sendEmergencySosToCaregivers('patient_1', 'Enes');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Kayıtlı ve aktif bir bakıcı bulunamadı');
    });

    it('successfully sends SOS alert to active caregivers', async () => {
      const { getDocs } = require('firebase/firestore');
      const { sendEmergencySosToCaregivers } = require('../../services/caregiverService');
      (getDocs as jest.Mock).mockResolvedValueOnce({
        docs: [
          {
            id: 'rel_1',
            data: () => ({
              patientId: 'patient_1',
              patientName: 'Enes',
              caregiverId: 'caregiver_99',
              status: 'active',
              caregiverFcmToken: 'ExponentPushToken[mock]',
            }),
          },
        ],
        forEach(cb: any) {
          this.docs.forEach(cb);
        },
      });

      const res = await sendEmergencySosToCaregivers('patient_1', 'Enes', 'Yardım lütfen!');
      expect(res.success).toBe(true);
      expect(res.sentCount).toBe(1);
    });
  });

  describe('phone number management', () => {
    const {
      updateUserPhoneNumber,
      getUserPhoneNumber,
      getPatientPhoneNumber,
    } = require('../../services/caregiverService');

    it('rejects invalid phone number formats', async () => {
      const res = await updateUserPhoneNumber('user_123', 'invalid-phone');
      expect(res.success).toBe(false);
      expect(res.error).toContain('Lütfen geçerli bir telefon numarası giriniz');
    });

    it('updates user phone number with formatted output and saves to firestore', async () => {
      const res = await updateUserPhoneNumber('user_123', '05551234567');
      expect(res.success).toBe(true);
      expect(res.formatted).toBe('+90 555 123 45 67');
      expect(setDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          phoneNumber: '05551234567',
          formattedPhoneNumber: '+90 555 123 45 67',
        }),
        { merge: true }
      );
    });

    it('fetches patient phone number from user document', async () => {
      (getDoc as jest.Mock).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ phoneNumber: '05559876543' }),
      });

      const phone = await getPatientPhoneNumber('patient_99');
      expect(phone).toBe('05559876543');
    });
  });
});
