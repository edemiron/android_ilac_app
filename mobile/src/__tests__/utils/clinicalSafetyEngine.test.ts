import {
  detectFoodInteractions,
  checkDuplicateTherapy,
  evaluateMissedDoseAction,
  getTitckKubKtUrl,
  FOOD_INTERACTION_DETAILS,
} from '../../utils/clinicalSafetyEngine';
import { Medicine } from '../../types';

describe('clinicalSafetyEngine', () => {
  describe('detectFoodInteractions', () => {
    it('detects grapefruit and alcohol for statin/cholesterol drugs', () => {
      const interactions = detectFoodInteractions('Ator 20 mg Film Tablet');
      expect(interactions).toContain('grapefruit');
      expect(interactions).toContain('alcohol');
    });

    it('detects dairy and empty stomach for thyroid medications', () => {
      const interactions = detectFoodInteractions('Euthyrox 50 mcg Tablet');
      expect(interactions).toContain('empty_stomach_strict');
      expect(interactions).toContain('dairy');
    });

    it('detects dairy and sunlight for quinolone/tetracycline antibiotics', () => {
      const interactions = detectFoodInteractions('Cipro 500 mg Film Tablet');
      expect(interactions).toContain('dairy');
      expect(interactions).toContain('sunlight');
    });

    it('detects alcohol risk for paracetamol combinations', () => {
      const interactions = detectFoodInteractions('Parol 500 mg Tablet');
      expect(interactions).toContain('alcohol');
    });

    it('detects vitamin_k and alcohol for warfarin/coumadin', () => {
      const interactions = detectFoodInteractions('Coumadin 5 mg Tablet');
      expect(interactions).toContain('vitamin_k');
      expect(interactions).toContain('alcohol');
    });

    it('detects potassium risk for ACE inhibitors and ARBs', () => {
      const interactions = detectFoodInteractions('Delix 2.5 mg Kapsül');
      expect(interactions).toContain('potassium');
      expect(interactions).toContain('alcohol');
    });

    it('detects tyramine risk for MAO inhibitors', () => {
      const interactions = detectFoodInteractions('Aurorix 150 mg Film Tablet');
      expect(interactions).toContain('tyramine');
    });

    it('provides localized details for all food interaction types', () => {
      const dairy = FOOD_INTERACTION_DETAILS.dairy;
      expect(dairy.icon).toBe('🥛');
      expect(dairy.titleTr).toContain('Süt');
      expect(dairy.warningTr).toContain('kalsiyum');
      expect(dairy.severity).toBe('critical');

      const vitK = FOOD_INTERACTION_DETAILS.vitamin_k;
      expect(vitK.icon).toBe('🥬');
      expect(vitK.titleTr).toContain('K Vitamini');

      const pot = FOOD_INTERACTION_DETAILS.potassium;
      expect(pot.icon).toBe('🍌');
      expect(pot.titleTr).toContain('Potasyum');

      const tyr = FOOD_INTERACTION_DETAILS.tyramine;
      expect(tyr.icon).toBe('🧀');
      expect(tyr.titleTr).toContain('Tiramin');
    });
  });

  describe('checkDuplicateTherapy', () => {
    const existingMeds: Medicine[] = [
      {
        id: '1',
        name: 'Parol 500 mg Tablet',
        dosage: '1 tablet',
        frequency: 2,
        color: '#10B981',
        startDate: '2026-08-28',
        isActive: true,
        createdAt: '2026-08-28',
        updatedAt: '2026-08-28',
      },
      {
        id: '2',
        name: 'Coraspin 100 mg',
        dosage: '1 tablet',
        frequency: 1,
        color: '#3B82F6',
        startDate: '2026-08-28',
        isActive: true,
        createdAt: '2026-08-28',
        updatedAt: '2026-08-28',
      },
    ];

    it('warns when adding another paracetamol-containing drug', () => {
      const warning = checkDuplicateTherapy(existingMeds, 'Tylolhot Poşet');
      expect(warning).not.toBeNull();
      expect(warning?.duplicateIngredient).toBe('Parasetamol');
      expect(warning?.conflictingMedicines).toContain('Parol 500 mg Tablet');
      expect(warning?.warningMessageTr).toContain('DİKKAT');
    });

    it('warns when adding another aspirin/ASA drug', () => {
      const warning = checkDuplicateTherapy(existingMeds, 'Ecopirin 100 mg');
      expect(warning).not.toBeNull();
      expect(warning?.duplicateIngredient).toContain('Aspirin');
      expect(warning?.conflictingMedicines).toContain('Coraspin 100 mg');
    });

    it('returns null when there is no duplicate active ingredient', () => {
      const warning = checkDuplicateTherapy(existingMeds, 'Augmentin 1000 mg');
      expect(warning).toBeNull();
    });
  });

  describe('evaluateMissedDoseAction', () => {
    it('recommends TAKE_NOW if delay is small (e.g. 1 hour on a 12h interval)', () => {
      const evaluation = evaluateMissedDoseAction({
        scheduledMinutesOfDay: 540, // 09:00
        currentMinutesOfDay: 600, // 10:00 (1 hour later)
        frequencyPerDay: 2, // 12h interval
        medicineName: 'Parol',
      });

      expect(evaluation.action).toBe('TAKE_NOW');
      expect(evaluation.titleTr).toContain('Şimdi Alabilirsiniz');
    });

    it('recommends SKIP_DOSE if delay is large and close to next dose', () => {
      const evaluation = evaluateMissedDoseAction({
        scheduledMinutesOfDay: 540, // 09:00
        currentMinutesOfDay: 1200, // 20:00 (11 hours later on 12h interval)
        frequencyPerDay: 2,
        medicineName: 'Ator',
      });

      expect(evaluation.action).toBe('SKIP_DOSE');
      expect(evaluation.titleTr).toContain('Atlayınız');
      expect(evaluation.safetyTipTr).toContain('ÇİFT DOZ');
    });
  });

  describe('getTitckKubKtUrl', () => {
    it('returns official TİTCK KÜB/KT portal URL', () => {
      const url = getTitckKubKtUrl('Parol 500 mg', '8699525010015');
      expect(url).toBe('https://www.titck.gov.tr/kubkt');
    });

    it('returns official TİTCK KÜB/KT portal URL without barcode', () => {
      const url = getTitckKubKtUrl('Avelox 400 mg');
      expect(url).toBe('https://www.titck.gov.tr/kubkt');
    });
  });
});
