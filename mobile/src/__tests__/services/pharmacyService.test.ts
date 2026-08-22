import {
  getDutyPharmacies,
  callPharmacy,
  openPharmacyMap,
  calculateDistance,
  formatDistance,
  POPULAR_CITIES,
} from '../../services/pharmacyService';
import { Linking } from 'react-native';

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  Linking: {
    canOpenURL: jest.fn().mockResolvedValue(true),
    openURL: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: { latitude: 40.9872, longitude: 29.0284 },
  }),
}));

describe('pharmacyService', () => {
  it('returns all sample pharmacies when Tümü is selected', async () => {
    const list = await getDutyPharmacies('Tümü');
    expect(list.length).toBeGreaterThan(0);
  });

  it('filters pharmacies by city (İstanbul)', async () => {
    const list = await getDutyPharmacies('İstanbul');
    expect(list.every(p => p.city === 'İstanbul')).toBe(true);
    expect(list.length).toBeGreaterThanOrEqual(1);
  });

  it('filters pharmacies by search query', async () => {
    const list = await getDutyPharmacies('Tümü', 'Kadıköy');
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list[0].name).toContain('Kadıköy');
  });

  it('calculates distance correctly using calculateDistance', () => {
    // Kadıköy to Beşiktaş (~6-7 km)
    const dist = calculateDistance(40.9872, 29.0284, 41.0428, 29.0077);
    expect(dist).toBeGreaterThan(5);
    expect(dist).toBeLessThan(10);
  });

  it('formats distance in meters when < 1km and in km when >= 1km', () => {
    expect(formatDistance(0.4)).toBe('400 m');
    expect(formatDistance(2.5)).toBe('2.5 km');
  });

  it('sorts pharmacies by distance when userLocation is provided', async () => {
    // User in Kadıköy
    const userLocation = { latitude: 40.9872, longitude: 29.0284 };
    const list = await getDutyPharmacies('Tümü', undefined, userLocation);

    expect(list[0].name).toBe('Kadıköy Şifa Eczanesi');
    expect(list[0].distanceKm).toBeDefined();
    expect(list[0].distanceKm).toBeLessThan(1);
  });

  it('calls Linking.openURL with tel scheme on callPharmacy', async () => {
    const result = await callPharmacy('0216 336 12 34');
    expect(result).toBe(true);
    expect(Linking.openURL).toHaveBeenCalledWith('tel:02163361234');
  });

  it('calls Linking.openURL with maps scheme on openPharmacyMap', async () => {
    const mockPharmacy = {
      id: 'p1',
      name: 'Şifa Eczanesi',
      address: 'Moda Cad.',
      phone: '0216',
      city: 'İstanbul',
      district: 'Kadıköy',
      latitude: 40.9872,
      longitude: 29.0284,
      dutyHours: '24 Saat',
      isOnDuty: true,
    };

    const result = await openPharmacyMap(mockPharmacy);
    expect(result).toBe(true);
    expect(Linking.openURL).toHaveBeenCalledWith(expect.stringContaining('google.com/maps'));
  });

  it('contains popular Turkish cities in POPULAR_CITIES list', () => {
    expect(POPULAR_CITIES).toContain('İstanbul');
    expect(POPULAR_CITIES).toContain('Ankara');
    expect(POPULAR_CITIES).toContain('İzmir');
    expect(POPULAR_CITIES).toContain('En Yakınlar');
  });
});
