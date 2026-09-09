/**
 * foodDrugInteractions Unit Tests
 */

import {
  checkFoodAndLifestyleInteractions,
  FOOD_DRUG_RULES,
} from '../../services/foodDrugInteractions';

describe('foodDrugInteractions', () => {
  it('should have predefined food & lifestyle rules', () => {
    expect(FOOD_DRUG_RULES).toBeDefined();
    expect(FOOD_DRUG_RULES.length).toBeGreaterThan(5);
  });

  it('should detect grapefruit interaction for statin drugs (Atorvastatin / Lipitor)', () => {
    const results = checkFoodAndLifestyleInteractions(['Lipitor 20mg'], 'tr');
    expect(results.length).toBeGreaterThan(0);
    const grapefruit = results.find(r => r.category === 'grapefruit');
    expect(grapefruit).toBeDefined();
    expect(grapefruit?.severity).toBe('high');
    expect(grapefruit?.categoryTitle).toContain('Greyfurt');
  });

  it('should detect dairy interaction for fluoroquinolone antibiotics (Cipro)', () => {
    const results = checkFoodAndLifestyleInteractions(['Cipro 500mg'], 'tr');
    const dairy = results.find(r => r.category === 'dairy_calcium');
    expect(dairy).toBeDefined();
    expect(dairy?.severity).toBe('high');
    expect(dairy?.timingRule).toBeDefined();
  });

  it('should detect alcohol interaction for paracetamol (Parol)', () => {
    const results = checkFoodAndLifestyleInteractions(['Parol 500 mg Tablet'], 'tr');
    const alcohol = results.find(r => r.category === 'alcohol');
    expect(alcohol).toBeDefined();
    expect(alcohol?.severity).toBe('high');
  });

  it('should detect potassium risk for ACE inhibitors (Delix)', () => {
    const results = checkFoodAndLifestyleInteractions(['Delix 5mg'], 'tr');
    const potassium = results.find(r => r.category === 'potassium_rich');
    expect(potassium).toBeDefined();
  });

  it('should detect vitamin K interaction for Warfarin / Coumadin', () => {
    const results = checkFoodAndLifestyleInteractions(['Coumadin 5mg'], 'tr');
    const vitK = results.find(r => r.category === 'vitamin_k');
    expect(vitK).toBeDefined();
    expect(vitK?.severity).toBe('high');
  });

  it('should return empty list for medicines with no food restrictions', () => {
    const results = checkFoodAndLifestyleInteractions(['Göz Damlası Saf'], 'tr');
    expect(results.length).toBe(0);
  });

  it('should support English localization', () => {
    const results = checkFoodAndLifestyleInteractions(['Lipitor 20mg'], 'en');
    const item = results[0];
    expect(item.categoryTitle).toContain('Grapefruit');
    expect(item.recommendation).toContain('grapefruit');
  });
});
