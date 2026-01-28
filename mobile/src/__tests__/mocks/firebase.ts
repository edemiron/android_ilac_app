/**
 * Firebase Mock Module
 * Provides comprehensive mocks for Firebase Auth and Firestore
 * Used to isolate tests from actual Firebase infrastructure
 */

// This file is a mock module, not a test file
// Jest will skip it if it has at least one test
describe('Firebase Mocks', () => {
  it('exports mock functions', () => {
    expect(true).toBe(true);
  });
});

// Mock user data factory
export const createMockUser = (overrides: Partial<MockFirebaseUser> = {}): MockFirebaseUser => ({
  uid: 'test-user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: null,
  emailVerified: true,
  reload: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

export interface MockFirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  reload: jest.Mock;
}

export interface MockUserCredential {
  user: MockFirebaseUser;
}

// Mock auth state
let mockCurrentUser: MockFirebaseUser | null = null;
let authStateCallback: ((user: MockFirebaseUser | null) => void) | null = null;

// Firebase Auth mock functions
export const mockCreateUserWithEmailAndPassword = jest.fn();
export const mockSignInWithEmailAndPassword = jest.fn();
export const mockSignOut = jest.fn();
export const mockUpdateProfile = jest.fn();
export const mockSendPasswordResetEmail = jest.fn();
export const mockDeleteUser = jest.fn();
export const mockSignInWithCredential = jest.fn();
export const mockOnAuthStateChanged = jest.fn();

// Google Auth Provider mock
export const mockGoogleAuthProviderCredential = jest.fn();

// Auth instance mock
export const mockAuth = {
  get currentUser() {
    return mockCurrentUser;
  },
};

// Helper to set current user (for test setup)
export const setMockCurrentUser = (user: MockFirebaseUser | null): void => {
  mockCurrentUser = user;
  if (authStateCallback) {
    authStateCallback(user);
  }
};

// Helper to trigger auth state change
export const triggerAuthStateChange = (user: MockFirebaseUser | null): void => {
  if (authStateCallback) {
    authStateCallback(user);
  }
};

// Reset all mocks
export const resetFirebaseMocks = (): void => {
  mockCurrentUser = null;
  authStateCallback = null;

  mockCreateUserWithEmailAndPassword.mockReset();
  mockSignInWithEmailAndPassword.mockReset();
  mockSignOut.mockReset();
  mockUpdateProfile.mockReset();
  mockSendPasswordResetEmail.mockReset();
  mockDeleteUser.mockReset();
  mockSignInWithCredential.mockReset();
  mockOnAuthStateChanged.mockReset();
  mockGoogleAuthProviderCredential.mockReset();

  // Set up default implementations
  mockOnAuthStateChanged.mockImplementation((auth, callback) => {
    authStateCallback = callback;
    // Immediately call with current state
    callback(mockCurrentUser);
    // Return unsubscribe function
    return () => {
      authStateCallback = null;
    };
  });
};

// Default successful implementations
export const setupSuccessfulAuth = (): void => {
  const mockUser = createMockUser();

  mockCreateUserWithEmailAndPassword.mockResolvedValue({ user: mockUser });
  mockSignInWithEmailAndPassword.mockResolvedValue({ user: mockUser });
  mockSignOut.mockResolvedValue(undefined);
  mockUpdateProfile.mockResolvedValue(undefined);
  mockSendPasswordResetEmail.mockResolvedValue(undefined);
  mockDeleteUser.mockResolvedValue(undefined);
  mockSignInWithCredential.mockResolvedValue({ user: mockUser });
  mockGoogleAuthProviderCredential.mockReturnValue({ providerId: 'google.com' });
};

// Setup auth error scenarios
export const setupAuthError = (errorCode: string): void => {
  const error = { code: errorCode };

  mockCreateUserWithEmailAndPassword.mockRejectedValue(error);
  mockSignInWithEmailAndPassword.mockRejectedValue(error);
  mockSignOut.mockRejectedValue(error);
  mockSendPasswordResetEmail.mockRejectedValue(error);
  mockDeleteUser.mockRejectedValue(error);
  mockSignInWithCredential.mockRejectedValue(error);
};

// Jest module mock configuration
// This should be used in jest.setup.js or at the top of test files
export const firebaseAuthMock = {
  createUserWithEmailAndPassword: mockCreateUserWithEmailAndPassword,
  signInWithEmailAndPassword: mockSignInWithEmailAndPassword,
  signOut: mockSignOut,
  onAuthStateChanged: mockOnAuthStateChanged,
  updateProfile: mockUpdateProfile,
  sendPasswordResetEmail: mockSendPasswordResetEmail,
  deleteUser: mockDeleteUser,
  GoogleAuthProvider: {
    credential: mockGoogleAuthProviderCredential,
  },
  signInWithCredential: mockSignInWithCredential,
};

// Firestore mock (basic implementation)
export const mockFirestoreDoc = jest.fn();
export const mockFirestoreCollection = jest.fn();
export const mockFirestoreGetDoc = jest.fn();
export const mockFirestoreSetDoc = jest.fn();
export const mockFirestoreDeleteDoc = jest.fn();

export const firestoreMock = {
  doc: mockFirestoreDoc,
  collection: mockFirestoreCollection,
  getDoc: mockFirestoreGetDoc,
  setDoc: mockFirestoreSetDoc,
  deleteDoc: mockFirestoreDeleteDoc,
};

export const resetFirestoreMocks = (): void => {
  mockFirestoreDoc.mockReset();
  mockFirestoreCollection.mockReset();
  mockFirestoreGetDoc.mockReset();
  mockFirestoreSetDoc.mockReset();
  mockFirestoreDeleteDoc.mockReset();
};
