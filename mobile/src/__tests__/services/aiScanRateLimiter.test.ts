import {
  checkScanQuota,
  consumeScanQuota,
  resetScanQuota,
  DEFAULT_FREE_DAILY_SCAN_LIMIT,
} from '../../services/aiScanRateLimiter';

describe('aiScanRateLimiter', () => {
  beforeEach(async () => {
    await resetScanQuota();
  });

  describe('checkScanQuota', () => {
    it('returns full free quota on first scan of the day', async () => {
      const result = await checkScanQuota(false);
      expect(result.canScan).toBe(true);
      expect(result.remainingScans).toBe(DEFAULT_FREE_DAILY_SCAN_LIMIT);
      expect(result.isPremium).toBe(false);
    });

    it('returns unlimited quota for premium users', async () => {
      const result = await checkScanQuota(true);
      expect(result.canScan).toBe(true);
      expect(result.isPremium).toBe(true);
      expect(result.remainingScans).toBeGreaterThan(100);
    });
  });

  describe('consumeScanQuota', () => {
    it('decrements remaining quota upon scan consumption', async () => {
      await consumeScanQuota(false);
      const afterFirst = await checkScanQuota(false);
      expect(afterFirst.remainingScans).toBe(DEFAULT_FREE_DAILY_SCAN_LIMIT - 1);

      await consumeScanQuota(false);
      const afterSecond = await checkScanQuota(false);
      expect(afterSecond.remainingScans).toBe(DEFAULT_FREE_DAILY_SCAN_LIMIT - 2);
    });

    it('blocks scanning when daily quota is exhausted', async () => {
      for (let i = 0; i < DEFAULT_FREE_DAILY_SCAN_LIMIT; i++) {
        await consumeScanQuota(false);
      }

      const quota = await checkScanQuota(false);
      expect(quota.canScan).toBe(false);
      expect(quota.remainingScans).toBe(0);
    });

    it('never exhausts quota for premium subscribers', async () => {
      for (let i = 0; i < 20; i++) {
        await consumeScanQuota(true);
      }

      const quota = await checkScanQuota(true);
      expect(quota.canScan).toBe(true);
    });
  });
});
