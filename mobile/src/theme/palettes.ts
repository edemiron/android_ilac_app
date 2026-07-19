/**
 * Palettes — Sprint 63.
 *
 * 6 accent palette. Her palette light + dark mode için primary rengi tanımlar.
 * Settings'te AccentColorSection ile seçilir; useUserProfile.accentColor'da saklanır.
 */

export type AccentId = 'ocean' | 'sunset' | 'forest' | 'lavender' | 'cherry' | 'mint';

export interface AccentPalette {
  id: AccentId;
  nameTr: string;
  nameEn: string;
  /** Light tema primary rengi */
  lightPrimary: string;
  /** Dark tema primary rengi */
  darkPrimary: string;
  /** 6-yatay chip için önizleme rengi (light) */
  preview: string;
}

export const ACCENT_PALETTES: Record<AccentId, AccentPalette> = {
  ocean: {
    id: 'ocean',
    nameTr: 'Okyanus',
    nameEn: 'Ocean',
    lightPrimary: '#0EA5E9', // Sky 500
    darkPrimary: '#38BDF8', // Sky 400
    preview: '#0EA5E9',
  },
  sunset: {
    id: 'sunset',
    nameTr: 'Gün Batımı',
    nameEn: 'Sunset',
    lightPrimary: '#F97316', // Orange 500
    darkPrimary: '#FB923C', // Orange 400
    preview: '#F97316',
  },
  forest: {
    id: 'forest',
    nameTr: 'Orman',
    nameEn: 'Forest',
    lightPrimary: '#059669', // Emerald 600
    darkPrimary: '#34D399', // Emerald 400
    preview: '#059669',
  },
  lavender: {
    id: 'lavender',
    nameTr: 'Lavanta',
    nameEn: 'Lavender',
    lightPrimary: '#8B5CF6', // Violet 500
    darkPrimary: '#A78BFA', // Violet 400
    preview: '#8B5CF6',
  },
  cherry: {
    id: 'cherry',
    nameTr: 'Kiraz',
    nameEn: 'Cherry',
    lightPrimary: '#E11D48', // Rose 600
    darkPrimary: '#FB7185', // Rose 400
    preview: '#E11D48',
  },
  mint: {
    id: 'mint',
    nameTr: 'Nane',
    nameEn: 'Mint',
    lightPrimary: '#14B8A6', // Teal 500
    darkPrimary: '#2DD4BF', // Teal 400
    preview: '#14B8A6',
  },
};

export const DEFAULT_ACCENT: AccentId = 'mint'; // Mevcut primary'a en yakın
export const ACCENT_LIST: AccentPalette[] = Object.values(ACCENT_PALETTES);
