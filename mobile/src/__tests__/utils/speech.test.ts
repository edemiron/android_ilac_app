/**
 * Speech Utility Tests
 * Tests for TTS (Text-to-Speech) functionality using react-native-tts
 */

// Mock react-native-tts.
// NOT: Babel `jest.mock` factory'sini dosyanin basina hoist eder. Bu yuzden
// factory icindeki degiskenler (jest.fn) henuz tanimli olmayabilir. Cozum:
// factory icinde literal olarak tanimlamak veya `jest.fn()`'i inline olusturmak.
// Babel esModuleInterop: import Tts from 'react-native-tts' once
// require() yapar, sonra `.default` ile erisir. Mock'ta hem default
// hem named export saglamaliyiz.
jest.mock('react-native-tts', () => {
  const mock = {
    speak: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    setDefaultLanguage: jest.fn().mockResolvedValue(undefined),
    setDefaultRate: jest.fn().mockResolvedValue(undefined),
    setDefaultPitch: jest.fn().mockResolvedValue(undefined),
    voices: jest.fn().mockResolvedValue([]),
    addEventListener: jest.fn(),
    removeAllListeners: jest.fn(),
  };
  return {
    __esModule: true,
    default: mock,
    ...mock,
  };
});

// Test disinda mock fonksiyon referanslari gerekirse:
// `import { speak } from 'react-native-tts'` ile alabiliriz.
const mockSpeak = jest.requireMock('react-native-tts').speak as jest.Mock;
const mockStop = jest.requireMock('react-native-tts').stop as jest.Mock;
const mockSetDefaultLanguage = jest.requireMock('react-native-tts').setDefaultLanguage as jest.Mock;
const mockSetDefaultRate = jest.requireMock('react-native-tts').setDefaultRate as jest.Mock;
const mockSetDefaultPitch = jest.requireMock('react-native-tts').setDefaultPitch as jest.Mock;
const mockVoices = jest.requireMock('react-native-tts').voices as jest.Mock;
const mockAddEventListener = jest.requireMock('react-native-tts').addEventListener as jest.Mock;
const mockRemoveAllListeners = jest.requireMock('react-native-tts').removeAllListeners as jest.Mock;

// Import after mocks
import {
  speakMedicineReminder,
  speak,
  stopSpeaking,
  isSpeaking,
  getAvailableVoices,
} from '../../utils/speech';

describe('Speech Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Simulate immediate tts-finish event
    mockAddEventListener.mockImplementation((event: string, callback: () => void) => {
      if (event === 'tts-finish') {
        setTimeout(callback, 0);
      }
    });
  });

  describe('speakMedicineReminder', () => {
    it('should speak medicine reminder in Turkish', async () => {
      const promise = speakMedicineReminder('Aspirin', '500mg', undefined, 'tr');
      await promise;

      expect(mockSetDefaultLanguage).toHaveBeenCalledWith('tr-TR');
      expect(mockSpeak).toHaveBeenCalled();
      const message = mockSpeak.mock.calls[0][0];
      expect(message).toContain('İlaç zamanı');
      expect(message).toContain('Aspirin');
      expect(message).toContain('500mg');
    });

    it('should speak medicine reminder in English', async () => {
      const promise = speakMedicineReminder('Aspirin', '500mg', undefined, 'en');
      await promise;

      expect(mockSetDefaultLanguage).toHaveBeenCalledWith('en-US');
      const message = mockSpeak.mock.calls[0][0];
      expect(message).toContain('Medicine time');
      expect(message).toContain('Aspirin');
    });

    it('should include Turkish instruction text when provided', async () => {
      const promise = speakMedicineReminder('Parol', '500mg', 'before_meal', 'tr');
      await promise;

      const message = mockSpeak.mock.calls[0][0];
      expect(message).toContain('Yemekten önce');
    });

    it('should include English instruction text when provided', async () => {
      const promise = speakMedicineReminder('Parol', '500mg', 'after_meal', 'en');
      await promise;

      const message = mockSpeak.mock.calls[0][0];
      expect(message).toContain('Take after meal');
    });

    it('should stop current speech before starting new one', async () => {
      const promise = speakMedicineReminder('Test', '100mg', undefined, 'tr');
      await promise;

      expect(mockStop).toHaveBeenCalled();
    });

    it('should handle all instruction types in Turkish', async () => {
      const instructions = [
        { key: 'before_meal', expected: 'Yemekten önce' },
        { key: 'after_meal', expected: 'Yemekten sonra' },
        { key: 'with_meal', expected: 'Yemekle birlikte' },
        { key: 'empty_stomach', expected: 'Aç karnına' },
        { key: 'before_sleep', expected: 'Yatmadan önce' },
        { key: 'any_time', expected: 'İstediğiniz zaman' },
      ];

      for (const { key, expected } of instructions) {
        mockSpeak.mockClear();
        const promise = speakMedicineReminder('Test', '100mg', key, 'tr');
        await promise;
        const message = mockSpeak.mock.calls[0][0];
        expect(message).toContain(expected);
      }
    });

    it('should handle all instruction types in English', async () => {
      const instructions = [
        { key: 'before_meal', expected: 'Take before meal' },
        { key: 'after_meal', expected: 'Take after meal' },
        { key: 'with_meal', expected: 'Take with meal' },
        { key: 'empty_stomach', expected: 'Take on empty stomach' },
        { key: 'before_sleep', expected: 'Take before sleep' },
        { key: 'any_time', expected: 'Take any time' },
      ];

      for (const { key, expected } of instructions) {
        mockSpeak.mockClear();
        const promise = speakMedicineReminder('Test', '100mg', key, 'en');
        await promise;
        const message = mockSpeak.mock.calls[0][0];
        expect(message).toContain(expected);
      }
    });

    it('should handle unknown instruction gracefully', async () => {
      const promise = speakMedicineReminder('Test', '100mg', 'unknown_instruction', 'tr');
      await promise;

      // Should not throw, instruction text will be empty
      expect(mockSpeak).toHaveBeenCalled();
    });
  });

  describe('speak', () => {
    it('should speak custom message in Turkish', async () => {
      const promise = speak('Merhaba Dünya', 'tr');
      await promise;

      expect(mockSetDefaultLanguage).toHaveBeenCalledWith('tr-TR');
      const message = mockSpeak.mock.calls[0][0];
      expect(message).toBe('Merhaba Dünya');
    });

    it('should speak custom message in English', async () => {
      const promise = speak('Hello World', 'en');
      await promise;

      expect(mockSetDefaultLanguage).toHaveBeenCalledWith('en-US');
      const message = mockSpeak.mock.calls[0][0];
      expect(message).toBe('Hello World');
    });

    it('should stop current speech before starting', async () => {
      const promise = speak('Test message', 'tr');
      await promise;

      expect(mockStop).toHaveBeenCalled();
    });

    it('should default to Turkish language', async () => {
      const promise = speak('Test');
      await promise;

      expect(mockSetDefaultLanguage).toHaveBeenCalledWith('tr-TR');
    });
  });

  describe('stopSpeaking', () => {
    it('should call stop', async () => {
      await stopSpeaking();

      expect(mockStop).toHaveBeenCalled();
    });

    it('should handle stop errors gracefully', async () => {
      mockStop.mockRejectedValueOnce(new Error('Stop failed'));

      // Should not throw
      await expect(stopSpeaking()).resolves.toBeUndefined();
    });
  });

  describe('isSpeaking', () => {
    it('should return false (TTS does not have isSpeaking)', async () => {
      // react-native-tts doesn't have isSpeaking, always returns false
      const result = await isSpeaking();

      expect(result).toBe(false);
    });
  });

  describe('getAvailableVoices', () => {
    it('should return available voices', async () => {
      const mockVoiceList = [
        { id: 'tr-TR', name: 'Turkish', language: 'tr-TR' },
        { id: 'en-US', name: 'English', language: 'en-US' },
      ];
      mockVoices.mockResolvedValueOnce(mockVoiceList);

      const voices = await getAvailableVoices();

      expect(voices).toEqual(mockVoiceList);
      expect(voices.length).toBe(2);
    });

    it('should return empty array when no voices available', async () => {
      mockVoices.mockResolvedValueOnce([]);

      const voices = await getAvailableVoices();

      expect(voices).toEqual([]);
    });

    it('should return empty array on error', async () => {
      mockVoices.mockRejectedValueOnce(new Error('Voices failed'));

      const voices = await getAvailableVoices();

      expect(voices).toEqual([]);
    });
  });
});
