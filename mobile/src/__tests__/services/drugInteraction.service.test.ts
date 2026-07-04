/**
 * drugInteraction.ts ServiceResult wrapper testleri.
 *
 * Sprint 6.4: Sprint 4.3 ServiceResult<T> pattern'inin drugInteraction
 * network call'lerine entegrasyonu. Eski API korunuyor (geriye donuk uyumlu);
 * yeni Service fonksiyonlari discriminated union doner.
 */

jest.mock('../../services/types', () => {
  const actual = jest.requireActual('../../services/types');
  return { ...actual };
});

describe('drugInteraction ServiceResult wrappers', () => {
  it('exports checkInteractionLocalService', () => {
    const module = require('../../services/drugInteraction');
    expect(typeof module.checkInteractionLocalService).toBe('function');
  });

  it('exports getRxCuiForDrugService', () => {
    const module = require('../../services/drugInteraction');
    expect(typeof module.getRxCuiForDrugService).toBe('function');
  });

  it('exports checkInteractionsFromAPIService', () => {
    const module = require('../../services/drugInteraction');
    expect(typeof module.checkInteractionsFromAPIService).toBe('function');
  });

  it('exports checkInteractionService', () => {
    const module = require('../../services/drugInteraction');
    expect(typeof module.checkInteractionService).toBe('function');
  });

  it('exports checkMultipleInteractionsService', () => {
    const module = require('../../services/drugInteraction');
    expect(typeof module.checkMultipleInteractionsService).toBe('function');
  });

  it('checkInteractionLocalService returns ok result with data', async () => {
    const module = require('../../services/drugInteraction');
    const result = await module.checkInteractionLocalService('aspirin', 'warfarin');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBeTruthy();
      expect(result.data?.drug1).toBe('aspirin');
      expect(result.data?.drug2).toBe('warfarin');
      expect(result.data?.severity).toBe('high');
    }
  });

  it('checkInteractionLocalService returns ok with null when no interaction', async () => {
    const module = require('../../services/drugInteraction');
    const result = await module.checkInteractionLocalService('aspirin', 'unknown');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBeNull();
    }
  });

  it('old API functions still exist (backward compatibility)', () => {
    const module = require('../../services/drugInteraction');
    expect(typeof module.checkInteractionLocal).toBe('function');
    expect(typeof module.checkInteraction).toBe('function');
    expect(typeof module.checkMultipleInteractions).toBe('function');
    expect(typeof module.checkInteractionsFromAPI).toBe('function');
    expect(typeof module.getRxCuiForDrug).toBe('function');
  });
});
