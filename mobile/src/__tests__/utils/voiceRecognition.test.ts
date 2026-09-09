import { parseVoiceCommand } from '../../utils/voiceRecognition';

describe('voiceRecognition', () => {
  describe('parseVoiceCommand', () => {
    it('recognizes Turkish TAKE commands', () => {
      expect(parseVoiceCommand('aldım').intent).toBe('TAKE');
      expect(parseVoiceCommand('ilacı içtim').intent).toBe('TAKE');
      expect(parseVoiceCommand('tamamdır').intent).toBe('TAKE');
      expect(parseVoiceCommand('yuttum').intent).toBe('TAKE');
    });

    it('recognizes English TAKE commands', () => {
      expect(parseVoiceCommand('took').intent).toBe('TAKE');
      expect(parseVoiceCommand('i have taken the pill').intent).toBe('TAKE');
      expect(parseVoiceCommand('done').intent).toBe('TAKE');
    });

    it('recognizes SNOOZE commands', () => {
      expect(parseVoiceCommand('ertele').intent).toBe('SNOOZE');
      expect(parseVoiceCommand('5 dakika sonra').intent).toBe('SNOOZE');
      expect(parseVoiceCommand('snooze please').intent).toBe('SNOOZE');
      expect(parseVoiceCommand('daha sonra hatırlat').intent).toBe('SNOOZE');
    });

    it('recognizes SKIP commands', () => {
      expect(parseVoiceCommand('atla').intent).toBe('SKIP');
      expect(parseVoiceCommand('bu sefer içmeyeceğim').intent).toBe('SKIP');
      expect(parseVoiceCommand('skip').intent).toBe('SKIP');
      expect(parseVoiceCommand('pas').intent).toBe('SKIP');
    });

    it('returns UNKNOWN for unrelated text or empty inputs', () => {
      expect(parseVoiceCommand('merhaba nasılsın').intent).toBe('UNKNOWN');
      expect(parseVoiceCommand('').intent).toBe('UNKNOWN');
      expect(parseVoiceCommand(null as unknown as string).intent).toBe('UNKNOWN');
    });
  });
});
