import { calculateMedicineTimes, getInstructionText, formatTimeDisplay } from '../utils/timeCalculator';

describe('calculateMedicineTimes', () => {
  const baseOptions = {
    wakeUpTime: '08:00',
    sleepTime: '23:00',
  };

  describe('single dose (frequency = 1)', () => {
    it('should return wake up time for empty_stomach instruction', () => {
      const result = calculateMedicineTimes('med-1', {
        ...baseOptions,
        frequency: 1,
        instruction: 'empty_stomach',
      });

      expect(result).toHaveLength(1);
      expect(result[0].time).toBe('08:00');
      expect(result[0].medicineId).toBe('med-1');
      expect(result[0].isEnabled).toBe(true);
    });

    it('should return 30 minutes after wake up for before_meal instruction', () => {
      const result = calculateMedicineTimes('med-1', {
        ...baseOptions,
        frequency: 1,
        instruction: 'before_meal',
      });

      expect(result).toHaveLength(1);
      expect(result[0].time).toBe('08:30');
    });

    it('should return 90 minutes after wake up for after_meal instruction', () => {
      const result = calculateMedicineTimes('med-1', {
        ...baseOptions,
        frequency: 1,
        instruction: 'after_meal',
      });

      expect(result).toHaveLength(1);
      expect(result[0].time).toBe('09:30');
    });

    it('should return 30 minutes before sleep for before_sleep instruction', () => {
      const result = calculateMedicineTimes('med-1', {
        ...baseOptions,
        frequency: 1,
        instruction: 'before_sleep',
      });

      expect(result).toHaveLength(1);
      expect(result[0].time).toBe('22:30');
    });

    it('should return midday for any_time instruction', () => {
      const result = calculateMedicineTimes('med-1', {
        ...baseOptions,
        frequency: 1,
        instruction: 'any_time',
      });

      expect(result).toHaveLength(1);
      // Midpoint between 08:00 and 23:00 is 15:30
      expect(result[0].time).toBe('15:30');
    });
  });

  describe('multiple doses', () => {
    it('should return 2 times for frequency = 2', () => {
      const result = calculateMedicineTimes('med-1', {
        ...baseOptions,
        frequency: 2,
      });

      expect(result).toHaveLength(2);
      // First dose: 08:30 (30 min after wake up)
      // Second dose: ~15:30 (half of 15 hours = 7.5 hours later)
      expect(result[0].time).toBe('08:30');
    });

    it('should return 3 times for frequency = 3', () => {
      const result = calculateMedicineTimes('med-1', {
        ...baseOptions,
        frequency: 3,
      });

      expect(result).toHaveLength(3);
    });

    it('should return 4 times for frequency = 4', () => {
      const result = calculateMedicineTimes('med-1', {
        ...baseOptions,
        frequency: 4,
      });

      expect(result).toHaveLength(4);
    });

    it('should generate unique IDs for each time', () => {
      const result = calculateMedicineTimes('med-1', {
        ...baseOptions,
        frequency: 3,
      });

      const ids = result.map(r => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);
    });
  });

  describe('edge cases', () => {
    it('should handle sleep time after midnight', () => {
      const result = calculateMedicineTimes('med-1', {
        wakeUpTime: '08:00',
        sleepTime: '01:00', // Next day
        frequency: 2,
      });

      expect(result).toHaveLength(2);
    });

    it('should sort times chronologically', () => {
      const result = calculateMedicineTimes('med-1', {
        ...baseOptions,
        frequency: 4,
      });

      for (let i = 1; i < result.length; i++) {
        expect(result[i].time >= result[i - 1].time).toBe(true);
      }
    });
  });
});

describe('getInstructionText', () => {
  describe('Turkish translations', () => {
    it('should return Turkish text for before_meal', () => {
      expect(getInstructionText('before_meal', 'tr')).toBe('Yemekten önce');
    });

    it('should return Turkish text for after_meal', () => {
      expect(getInstructionText('after_meal', 'tr')).toBe('Yemekten sonra');
    });

    it('should return Turkish text for empty_stomach', () => {
      expect(getInstructionText('empty_stomach', 'tr')).toBe('Aç karnına');
    });

    it('should return "Belirtilmemiş" for undefined instruction', () => {
      expect(getInstructionText(undefined, 'tr')).toBe('Belirtilmemiş');
    });
  });

  describe('English translations', () => {
    it('should return English text for before_meal', () => {
      expect(getInstructionText('before_meal', 'en')).toBe('Before meal');
    });

    it('should return English text for after_meal', () => {
      expect(getInstructionText('after_meal', 'en')).toBe('After meal');
    });

    it('should return "Not specified" for undefined instruction', () => {
      expect(getInstructionText(undefined, 'en')).toBe('Not specified');
    });
  });
});

describe('formatTimeDisplay', () => {
  it('should return time as-is (HH:mm format)', () => {
    expect(formatTimeDisplay('08:30')).toBe('08:30');
    expect(formatTimeDisplay('14:00')).toBe('14:00');
    expect(formatTimeDisplay('23:45')).toBe('23:45');
  });
});
