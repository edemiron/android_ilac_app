/**
 * Logger Utility Tests
 * Tests for production-ready logging system
 */

// Import logger directly since __DEV__ is defined in jest.setup.js
import { logger, createScopedLogger } from '../../utils/logger';

describe('Logger', () => {
  let mockConsoleLog: jest.SpyInstance;
  let mockConsoleInfo: jest.SpyInstance;
  let mockConsoleWarn: jest.SpyInstance;
  let mockConsoleError: jest.SpyInstance;

  beforeEach(() => {
    // Mock console methods
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
    mockConsoleInfo = jest.spyOn(console, 'info').mockImplementation();
    mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('logger (development mode - __DEV__ = true)', () => {
    it('should log debug messages', () => {
      logger.debug('Test debug message');

      expect(mockConsoleLog).toHaveBeenCalled();
      const loggedMessage = mockConsoleLog.mock.calls[0][0];
      expect(loggedMessage).toContain('DEBUG');
      expect(loggedMessage).toContain('Test debug message');
    });

    it('should log info messages', () => {
      logger.info('Test info message');

      expect(mockConsoleInfo).toHaveBeenCalled();
      const loggedMessage = mockConsoleInfo.mock.calls[0][0];
      expect(loggedMessage).toContain('INFO');
      expect(loggedMessage).toContain('Test info message');
    });

    it('should log warn messages', () => {
      logger.warn('Test warning message');

      expect(mockConsoleWarn).toHaveBeenCalled();
      const loggedMessage = mockConsoleWarn.mock.calls[0][0];
      expect(loggedMessage).toContain('WARN');
      expect(loggedMessage).toContain('Test warning message');
    });

    it('should log error messages', () => {
      logger.error('Test error message');

      expect(mockConsoleError).toHaveBeenCalled();
      const loggedMessage = mockConsoleError.mock.calls[0][0];
      expect(loggedMessage).toContain('ERROR');
      expect(loggedMessage).toContain('Test error message');
    });

    it('should include context in log messages', () => {
      const context = { userId: '123', action: 'login' };

      logger.info('User action', context);

      expect(mockConsoleInfo).toHaveBeenCalled();
      const loggedMessage = mockConsoleInfo.mock.calls[0][0];
      expect(loggedMessage).toContain('userId');
      expect(loggedMessage).toContain('123');
      expect(loggedMessage).toContain('login');
    });

    it('should include timestamp in log messages', () => {
      logger.debug('Timestamp test');

      const loggedMessage = mockConsoleLog.mock.calls[0][0];
      // ISO timestamp format check
      expect(loggedMessage).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should extract error details when logging errors', () => {
      const testError = new Error('Test error');
      testError.name = 'TestError';

      logger.error('An error occurred', testError);

      // Find the call that contains 'An error occurred'
      const calls = mockConsoleError.mock.calls;
      const relevantCall = calls.find((call: string[]) => call[0].includes('An error occurred'));
      expect(relevantCall).toBeDefined();
      expect(relevantCall[0]).toContain('TestError');
    });

    it('should handle non-Error objects in error logging', () => {
      logger.error('String error test', 'string error value');

      // Find the relevant call
      const calls = mockConsoleError.mock.calls;
      const relevantCall = calls.find((call: string[]) => call[0].includes('String error test'));
      expect(relevantCall).toBeDefined();
      expect(relevantCall[0]).toContain('string error value');
    });

    it('should log error stack trace separately when error has stack', () => {
      const testError = new Error('Test error');

      logger.error('Stack trace test', testError);

      // Should call console.error at least twice - once for message, once for stack
      expect(mockConsoleError.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('should format message without context', () => {
      logger.info('Simple message');

      const loggedMessage = mockConsoleInfo.mock.calls[0][0];
      // Should have timestamp, level, and message
      expect(loggedMessage).toContain('INFO');
      expect(loggedMessage).toContain('Simple message');
    });

    it('should format message with complex context', () => {
      const context = {
        user: { id: 1, name: 'Test' },
        items: [1, 2, 3],
      };

      logger.info('Complex context', context);

      const loggedMessage = mockConsoleInfo.mock.calls[0][0];
      expect(loggedMessage).toContain('"user"');
      expect(loggedMessage).toContain('"items"');
    });

    it('should handle error without stack trace', () => {
      const error = new Error('No stack');
      delete error.stack;

      // Should not throw
      expect(() => logger.error('No stack error', error)).not.toThrow();
    });
  });

  describe('createScopedLogger', () => {
    it('should create a scoped logger with prefix', () => {
      const scopedLogger = createScopedLogger('TestScope');

      scopedLogger.debug('Scoped message');

      const loggedMessage = mockConsoleLog.mock.calls[0][0];
      expect(loggedMessage).toContain('[TestScope]');
      expect(loggedMessage).toContain('Scoped message');
    });

    it('should work with all log levels', () => {
      const scopedLogger = createScopedLogger('MyModule');

      scopedLogger.debug('Debug');
      scopedLogger.info('Info');
      scopedLogger.warn('Warn');
      scopedLogger.error('Error');

      expect(mockConsoleLog).toHaveBeenCalled();
      expect(mockConsoleInfo).toHaveBeenCalled();
      expect(mockConsoleWarn).toHaveBeenCalled();
      expect(mockConsoleError).toHaveBeenCalled();
    });

    it('should pass context to underlying logger', () => {
      const scopedLogger = createScopedLogger('AuthService');

      scopedLogger.info('User logged in', { userId: 'user-123' });

      const loggedMessage = mockConsoleInfo.mock.calls[0][0];
      expect(loggedMessage).toContain('user-123');
      expect(loggedMessage).toContain('[AuthService]');
    });

    it('should pass error to underlying logger', () => {
      const scopedLogger = createScopedLogger('API');
      const testError = new Error('API Error');

      scopedLogger.error('Request failed', testError, { endpoint: '/users' });

      // Find the relevant call
      const calls = mockConsoleError.mock.calls;
      const relevantCall = calls.find((call: string[]) => call[0].includes('Request failed'));
      expect(relevantCall).toBeDefined();
      expect(relevantCall[0]).toContain('[API]');
    });
  });
});
