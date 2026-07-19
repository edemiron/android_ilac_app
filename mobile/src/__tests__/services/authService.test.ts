/**
 * Auth Service Tests
 * Tests for Firebase Authentication and Google Sign-In
 */

import {
  registerWithEmail,
  loginWithEmail,
  logout,
  resetPassword,
  deleteAccount,
  getCurrentUser,
  subscribeToAuthChanges,
} from '../../services/authService';

// Mock Firebase Auth
const mockCreateUser = jest.fn();
const mockSignIn = jest.fn();
const mockSignOut = jest.fn();
const mockSendPasswordReset = jest.fn();
const mockDeleteUser = jest.fn();
const mockUpdateProfile = jest.fn();
const mockReload = jest.fn();
const mockOnAuthStateChanged = jest.fn();

jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: (...args: unknown[]) => mockCreateUser(...args),
  signInWithEmailAndPassword: (...args: unknown[]) => mockSignIn(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
  updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
  sendPasswordResetEmail: (...args: unknown[]) => mockSendPasswordReset(...args),
  deleteUser: (...args: unknown[]) => mockDeleteUser(...args),
  GoogleAuthProvider: {
    credential: jest.fn(() => ({ providerId: 'google.com' })),
  },
  signInWithCredential: jest.fn(),
}));

// Mock Firebase Config
const mockAuth = { currentUser: null };
jest.mock('../../config/firebase', () => ({
  auth: { currentUser: null },
}));

// Mock Google Sign-In
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
    IN_PROGRESS: 'IN_PROGRESS',
    PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
  },
  isSuccessResponse: (response: unknown) =>
    (response as Record<string, unknown>)?.type === 'success',
  isErrorWithCode: (error: unknown) => (error as Record<string, unknown>)?.code !== undefined,
}));

// Mock react-native-config
jest.mock('react-native-config', () => ({
  GOOGLE_WEB_CLIENT_ID: 'test-web-client-id',
  GOOGLE_ANDROID_CLIENT_ID: 'test-android-client-id',
}));

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerWithEmail', () => {
    it('should register user successfully', async () => {
      const mockUser = {
        uid: 'test-uid-123',
        email: 'test@example.com',
        displayName: null,
        photoURL: null,
        reload: mockReload,
      };

      mockCreateUser.mockResolvedValueOnce({ user: mockUser });

      const result = await registerWithEmail('test@example.com', 'password123', 'Test User');

      expect(result.uid).toBe('test-uid-123');
      expect(mockUpdateProfile).toHaveBeenCalledWith(mockUser, { displayName: 'Test User' });
    });

    it('should throw error for existing email', async () => {
      mockCreateUser.mockRejectedValueOnce({ code: 'auth/email-already-in-use' });

      await expect(registerWithEmail('test@example.com', 'password123')).rejects.toThrow(
        'Bu e-posta adresi zaten kullanılıyor'
      );
    });

    it('should throw error for weak password', async () => {
      mockCreateUser.mockRejectedValueOnce({ code: 'auth/weak-password' });

      await expect(registerWithEmail('test@example.com', '123')).rejects.toThrow(
        'Şifre en az 6 karakter'
      );
    });
  });

  describe('loginWithEmail', () => {
    it('should login user successfully', async () => {
      const mockUser = {
        uid: 'test-uid-123',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg',
      };

      mockSignIn.mockResolvedValueOnce({ user: mockUser });

      const result = await loginWithEmail('test@example.com', 'password123');

      expect(result.uid).toBe('test-uid-123');
      expect(result.displayName).toBe('Test User');
    });

    it('should throw error for wrong password', async () => {
      mockSignIn.mockRejectedValueOnce({ code: 'auth/wrong-password' });

      await expect(loginWithEmail('test@example.com', 'wrongpassword')).rejects.toThrow(
        'Yanlış şifre'
      );
    });

    it('should throw error for user not found', async () => {
      mockSignIn.mockRejectedValueOnce({ code: 'auth/user-not-found' });

      await expect(loginWithEmail('notfound@example.com', 'password123')).rejects.toThrow(
        'kullanıcı bulunamadı'
      );
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      mockSignOut.mockResolvedValueOnce(undefined);

      await expect(logout()).resolves.not.toThrow();
    });

    it('should throw error on logout failure', async () => {
      mockSignOut.mockRejectedValueOnce({ code: 'auth/network-request-failed' });

      await expect(logout()).rejects.toThrow('Bağlantı hatası');
    });
  });

  describe('resetPassword', () => {
    it('should send reset email successfully', async () => {
      mockSendPasswordReset.mockResolvedValueOnce(undefined);

      await expect(resetPassword('test@example.com')).resolves.not.toThrow();
    });

    it('should throw error for invalid email', async () => {
      mockSendPasswordReset.mockRejectedValueOnce({ code: 'auth/invalid-email' });

      await expect(resetPassword('invalid-email')).rejects.toThrow('Geçersiz e-posta');
    });
  });

  describe('deleteAccount', () => {
    it('should delete current user', async () => {
      const mockUser = { uid: 'test-uid' };
      mockAuth.currentUser = mockUser as unknown as typeof mockAuth.currentUser;
      mockDeleteUser.mockResolvedValueOnce(undefined);

      await expect(deleteAccount()).resolves.not.toThrow();
    });

    it('should not throw if no current user', async () => {
      mockAuth.currentUser = null;

      await expect(deleteAccount()).resolves.not.toThrow();
    });
  });

  describe('getCurrentUser', () => {
    it('should return null when no user logged in', () => {
      // Test that function handles null case gracefully
      const result = getCurrentUser();

      // Since auth is mocked with currentUser: null, this should return null
      expect(result).toBeNull();
    });
  });

  describe('subscribeToAuthChanges', () => {
    it('should subscribe to auth changes', () => {
      const mockCallback = jest.fn();
      const mockUnsubscribe = jest.fn();
      mockOnAuthStateChanged.mockReturnValueOnce(mockUnsubscribe);

      const unsubscribe = subscribeToAuthChanges(mockCallback);

      expect(typeof unsubscribe).toBe('function');
    });
  });

  describe('Error Translations', () => {
    it('should translate auth/invalid-credential error', async () => {
      mockSignIn.mockRejectedValueOnce({ code: 'auth/invalid-credential' });

      await expect(loginWithEmail('test@test.com', 'pass')).rejects.toThrow(
        'E-posta veya şifre hatalı'
      );
    });

    it('should translate auth/too-many-requests error', async () => {
      mockSignIn.mockRejectedValueOnce({ code: 'auth/too-many-requests' });

      await expect(loginWithEmail('test@test.com', 'pass')).rejects.toThrow(
        'Çok fazla başarısız deneme'
      );
    });

    it('should translate unknown errors', async () => {
      mockSignIn.mockRejectedValueOnce({ code: 'auth/unknown-error' });

      await expect(loginWithEmail('test@test.com', 'pass')).rejects.toThrow('Bir hata oluştu');
    });
  });
});
