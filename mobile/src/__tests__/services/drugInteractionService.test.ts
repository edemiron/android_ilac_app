/**
 * drugInteractionService tests — Sprint 7
 * checkInteractions pure function (Firestore'a bağımlı değil).
 */

import { checkInteractions } from '../../services/drugInteractionService';
import type { Medicine } from '../../types';

const createMedicine = (name: string, category?: string): Medicine => ({
  id: `med-${name}`,
  name,
  dosage: '500mg',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  color: '#FF6B6B',
  category: category as Medicine['category'],
});

describe('drugInteractionService.checkInteractions', () => {
  it('returns empty array for unrelated medicine', () => {
    const meds: Medicine[] = [];
    expect(checkInteractions('Vitamin D', meds)).toEqual([]);
  });

  it('returns empty array when existing list is empty', () => {
    expect(checkInteractions('Aspirin', [])).toEqual([]);
  });

  it('detects high-severity aspirin + ibuprofen interaction', () => {
    const meds = [createMedicine('Ibuprofen')];
    const interactions = checkInteractions('Aspirin', meds);
    expect(interactions.length).toBeGreaterThan(0);
    expect(interactions[0].severity).toBe('high');
  });

  it('detects interaction with Turkish drug name (Coraspin)', () => {
    const meds = [createMedicine('Majezik')];
    const interactions = checkInteractions('Coraspin', meds);
    expect(interactions.length).toBeGreaterThan(0);
    expect(interactions[0].severity).toBe('high');
  });

  it('detects moderate-severity hypertension + painkiller interaction', () => {
    const meds = [createMedicine('Ibuprofen')];
    const interactions = checkInteractions('Delix', meds);
    expect(interactions.length).toBeGreaterThan(0);
    expect(interactions[0].severity).toBe('moderate');
  });

  it('detects antibiotic + birth control interaction', () => {
    const meds = [createMedicine('Yazz')];
    const interactions = checkInteractions('Augmentin', meds);
    expect(interactions.length).toBeGreaterThan(0);
  });

  it('handles case-insensitive matching', () => {
    const meds = [createMedicine('ibuprofen')];
    const interactions = checkInteractions('ASPIRIN', meds);
    expect(interactions.length).toBeGreaterThan(0);
  });

  it('handles multiple existing medicines', () => {
    const meds = [createMedicine('Ibuprofen'), createMedicine('Augmentin')];
    const interactions = checkInteractions('Aspirin', meds);
    // Aspirin + Ibuprofen (high) veya Augmentin etkileşmiyor olabilir
    // En azından bir interaction olmalı (Aspirin + Ibuprofen)
    expect(interactions.length).toBeGreaterThan(0);
  });

  it('returns interaction with action recommendation', () => {
    const meds = [createMedicine('Majezik')];
    const interactions = checkInteractions('Aspirin', meds);
    expect(interactions[0].action).toBeDefined();
    expect(interactions[0].description).toBeDefined();
  });
});
