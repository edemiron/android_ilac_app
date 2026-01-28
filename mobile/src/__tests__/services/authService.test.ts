/**
 * AuthService Tests
 * Comprehensive tests for authentication service functions
 * Covers: signIn, signUp, signOut, password reset, Google Sign-In
 */

import {
  createMockUser,
  resetFirebaseMocks,
  setupSuccessfulAuth,
  setupAuthError,
  mockCreateUserWithEmailAndPassword,
  mockSignInWithEmailAndPassword,
  mockSignOut,
  mockUpdateProfile,
  mockSendPasswordResetEmail,
  mockDeleteUser,
  mockSignInWithCredential,
  mockOnAuthStateChanged,
  mockGoogleAuthProviderCredential,
  mockAuth,
  setMockCurrentUser,
  MockFirebaseUser,
} from '../mocks/firebase';

// Mock firebase/auth module
jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: (...args: unknown[]) =>
    mockCreateUserWithEmailAndPassword(...args),
  signInWithEmailAndPassword: (...args: unknown[]) =>
    mockSignInWithEmailAndPassword(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
  updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
  sendPasswordResetEmail: (...args: unknown[]) =>
    mockSendPasswordResetEmail(...args),
  deleteUser: (...args: unknown[]) => mockDeleteUser(...args),
  GoogleAuthProvider: {
    credential: (...args: unknown[]) => mockGoogleAuthProviderCredential(...args),
  },
  signInWithCredential: (...args: unknown[]) =>
    mockSignInWithCredential(...args),
}));

// Mock firebase config
jest.mock('../../config/firebase', () => ({
  auth: mockAuth,
}));

// Mock expo-auth-session
jest.mock('expo-auth-session/providers/google', () => ({
  useAuthRequest: jest.fn(() => [null, null, jest.fn()]),
}));

// Mock expo-web-browser
jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

// Import after mocks are set up
import {
  registerWithEmail,
  loginWithEmail,
  logout,
  resetPassword,
  deleteAccount,
  getCurrentUser,
  subscribeToAuthChanges,
  loginWithGoogle,
  AuthUser,
} from '../../services/authService';

describe('AuthService', () => {
  beforeEach(() => {
    resetFirebaseMocks();
    setupSuccessfulAuth();
  });

  describe('registerWithEmail', () => {
    const testEmail = 'newuser@example.com';
    const testPassword = 'securePassword123';
    const testDisplayName = 'New User';

    it('should create a new user with email and password', async () => {
      const mockUser = createMockUser({
        email: testEmail,
        displayName: null,
      });
      mockCreateUserWithEmailAndPassword.mockResolvedValue({ user: mockUser });

      const result = await registerWithEmail(testEmail, testPassword);

      expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(
        mockAuth,
        testEmail,
        testPassword
      );
      expect(result.email).toBe(testEmail);
      expect(result.uid).toBe(mockUser.uid);
    });

    it('should update display name when provided', async () => {
      const mockUser = createMockUser({
        email: testEmail,
        displayName: null,
      });
      mockCreateUserWithEmailAndPassword.mockResolvedValue({ user: mockUser });

      const result = await registerWithEmail(
        testEmail,
        testPassword,
        testDisplayName
      );

      expect(mockUpdateProfile).toHaveBeenCalledWith(mockUser, {
        displayName: testDisplayName,
      });
      expect(mockUser.reload).toHaveBeenCalled();
      expect(result.displayName).toBe(testDisplayName);
    });

    it('should not call updateProfile when displayName is not provided', async () => {
      const mockUser = createMockUser({ email: testEmail });
      mockCreateUserWithEmailAndPassword.mockResolvedValue({ user: mockUser });

      await registerWithEmail(testEmail, testPassword);

      expect(mockUpdateProfile).not.toHaveBeenCalled();
    });

    it('should throw error for already used email', async () => {
      setupAuthError('auth/email-already-in-use');

      await expect(
        registerWithEmail(testEmail, testPassword)
      ).rejects.toThrow('Bu e-posta adresi zaten kullanılıyor.');
    });

    it('should throw error for invalid email', async () => {
      setupAuthError('auth/invalid-email');

      await expect(
        registerWithEmail('invalid-email', testPassword)
      ).rejects.toThrow('Geçersiz e-posta adresi.');
    });

    it('should throw error for weak password', async () => {
      setupAuthError('auth/weak-password');

      await expect(
        registerWithEmail(testEmail, '123')
      ).rejects.toThrow('Şifre en az 6 karakter olmalıdır.');
    });
  });

  describe('loginWithEmail', () => {
    const testEmail = 'user@example.com';
    const testPassword = 'password123';

    it('should sign in user with valid credentials', async () => {
      const mockUser = createMockUser({ email: testEmail });
      mockSignInWithEmailAndPassword.mockResolvedValue({ user: mockUser });

      const result = await loginWithEmail(testEmail, testPassword);

      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
        mockAuth,
        testEmail,
        testPassword
      );
      expect(result.email).toBe(testEmail);
      expect(result.uid).toBe(mockUser.uid);
    });

    it('should return user with all fields', async () => {
      const mockUser = createMockUser({
        email: testEmail,
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg',
      });
      mockSignInWithEmailAndPassword.mockResolvedValue({ user: mockUser });

      const result = await loginWithEmail(testEmail, testPassword);

      expect(result).toEqual<AuthUser>({
        uid: mockUser.uid,
        email: mockUser.email,
        displayName: mockUser.displayName,
        photoURL: mockUser.photoURL,
      });
    });

    it('should throw error for non-existent user', async () => {
      setupAuthError('auth/user-not-found');

      await expect(
        loginWithEmail(testEmail, testPassword)
      ).rejects.toThrow('Bu e-posta ile kayıtlı kullanıcı bulunamadı.');
    });

    it('should throw error for wrong password', async () => {
      setupAuthError('auth/wrong-password');

      await expect(
        loginWithEmail(testEmail, 'wrongpassword')
      ).rejects.toThrow('Yanlış şifre.');
    });

    it('should throw error for invalid credentials', async () => {
      setupAuthError('auth/invalid-credential');

      await expect(
        loginWithEmail(testEmail, testPassword)
      ).rejects.toThrow('E-posta veya şifre hatalı.');
    });

    it('should throw error for too many requests', async () => {
      setupAuthError('auth/too-many-requests');

      await expect(
        loginWithEmail(testEmail, testPassword)
      ).rejects.toThrow('Çok fazla başarısız deneme.');
    });

    it('should throw error for network failure', async () => {
      setupAuthError('auth/network-request-failed');

      await expect(
        loginWithEmail(testEmail, testPassword)
      ).rejects.toThrow('Bağlantı hatası.');
    });
  });

  describe('logout', () => {
    it('should sign out the current user', async () => {
      mockSignOut.mockResolvedValue(undefined);

      await logout();

      expect(mockSignOut).toHaveBeenCalledWith(mockAuth);
    });

    it('should handle sign out errors', async () => {
      setupAuthError('auth/network-request-failed');

      await expect(logout()).rejects.toThrow('Bağlantı hatası.');
    });
  });

  describe('resetPassword', () => {
    const testEmail = 'user@example.com';

    it('should send password reset email', async () => {
      mockSendPasswordResetEmail.mockResolvedValue(undefined);

      await resetPassword(testEmail);

      expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
        mockAuth,
        testEmail
      );
    });

    it('should throw error for non-existent user', async () => {
      setupAuthError('auth/user-not-found');

      await expect(resetPassword(testEmail)).rejects.toThrow(
        'Bu e-posta ile kayıtlı kullanıcı bulunamadı.'
      );
    });

    it('should throw error for invalid email', async () => {
      setupAuthError('auth/invalid-email');

      await expect(resetPassword('invalid')).rejects.toThrow(
        'Geçersiz e-posta adresi.'
      );
    });
  });

  describe('deleteAccount', () => {
    it('should delete the current user account', async () => {
      const mockUser = createMockUser();
      setMockCurrentUser(mockUser);
      mockDeleteUser.mockResolvedValue(undefined);

      await deleteAccount();

      expect(mockDeleteUser).toHaveBeenCalledWith(mockUser);
    });

    it('should do nothing if no user is logged in', async () => {
      setMockCurrentUser(null);

      await deleteAccount();

      expect(mockDeleteUser).not.toHaveBeenCalled();
    });

    it('should handle delete errors', async () => {
      const mockUser = createMockUser();
      setMockCurrentUser(mockUser);
      setupAuthError('auth/network-request-failed');

      await expect(deleteAccount()).rejects.toThrow('Bağlantı hatası.');
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user when logged in', () => {
      const mockUser = createMockUser({
        uid: 'user-456',
        email: 'current@example.com',
        displayName: 'Current User',
        photoURL: 'https://example.com/avatar.png',
      });
      setMockCurrentUser(mockUser);

      const result = getCurrentUser();

      expect(result).toEqual<AuthUser>({
        uid: 'user-456',
        email: 'current@example.com',
        displayName: 'Current User',
        photoURL: 'https://example.com/avatar.png',
      });
    });

    it('should return null when no user is logged in', () => {
      setMockCurrentUser(null);

      const result = getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe('subscribeToAuthChanges', () => {
    it('should call callback when auth state changes', () => {
      const callback = jest.fn();
      const mockUser = createMockUser();

      subscribeToAuthChanges(callback);

      // Simulate auth state change
      const authCallback = mockOnAuthStateChanged.mock.calls[0][1];
      authCallback(mockUser);

      expect(callback).toHaveBeenCalledWith({
        uid: mockUser.uid,
        email: mockUser.email,
        displayName: mockUser.displayName,
        photoURL: mockUser.photoURL,
      });
    });

    it('should call callback with null when user signs out', () => {
      const callback = jest.fn();

      subscribeToAuthChanges(callback);

      // Simulate sign out
      const authCallback = mockOnAuthStateChanged.mock.calls[0][1];
      authCallback(null);

      expect(callback).toHaveBeenCalledWith(null);
    });

    it('should return unsubscribe function', () => {
      const callback = jest.fn();
      const mockUnsubscribe = jest.fn();
      mockOnAuthStateChanged.mockReturnValue(mockUnsubscribe);

      const unsubscribe = subscribeToAuthChanges(callback);

      expect(unsubscribe).toBe(mockUnsubscribe);
    });
  });

  describe('loginWithGoogle', () => {
    const testIdToken = 'google-id-token-123';

    it('should sign in with Google credential', async () => {
      const mockUser = createMockUser({
        email: 'google@example.com',
        displayName: 'Google User',
        photoURL: 'https://google.com/avatar.jpg',
      });
      const mockCredential = { providerId: 'google.com' };

      mockGoogleAuthProviderCredential.mockReturnValue(mockCredential);
      mockSignInWithCredential.mockResolvedValue({ user: mockUser });

      const result = await loginWithGoogle(testIdToken);

      expect(mockGoogleAuthProviderCredential).toHaveBeenCalledWith(testIdToken);
      expect(mockSignInWithCredential).toHaveBeenCalledWith(
        mockAuth,
        mockCredential
      );
      expect(result.email).toBe('google@example.com');
      expect(result.displayName).toBe('Google User');
    });

    it('should handle Google sign-in errors', async () => {
      mockGoogleAuthProviderCredential.mockReturnValue({});
      setupAuthError('auth/invalid-credential');

      await expect(loginWithGoogle(testIdToken)).rejects.toThrow(
        'E-posta veya şifre hatalı.'
      );
    });

    it('should handle network errors during Google sign-in', async () => {
      mockGoogleAuthProviderCredential.mockReturnValue({});
      setupAuthError('auth/network-request-failed');

      await expect(loginWithGoogle(testIdToken)).rejects.toThrow(
        'Bağlantı hatası.'
      );
    });
  });

  describe('Error Translation', () => {
    it('should translate unknown error codes', async () => {
      const unknownError = { code: 'auth/unknown-error' };
      mockSignInWithEmailAndPassword.mockRejectedValue(unknownError);

      await expect(
        loginWithEmail('test@example.com', 'password')
      ).rejects.toThrow('Bir hata oluştu: auth/unknown-error');
    });

    it('should handle configuration not found error', async () => {
      setupAuthError('auth/configuration-not-found');

      await expect(
        loginWithEmail('test@example.com', 'password')
      ).rejects.toThrow('Firebase yapılandırması bulunamadı.');
    });
  });
});
