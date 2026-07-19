/**
 * AccentContext — Sprint 63.
 *
 * Aktif accent palette'i useUserProfile'dan okur, Theme'e inject eder.
 * Plan'da AccentProvider ThemeProvider'ın ÜSTÜNDE olmalı (UserProfileProvider altında).
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useUserProfile } from '../hooks/useUserProfile';
import { ACCENT_PALETTES, AccentId, AccentPalette } from '../theme/palettes';

interface AccentContextValue {
  accentId: AccentId;
  palette: AccentPalette;
}

const AccentContext = createContext<AccentContextValue | undefined>(undefined);

interface ProviderProps {
  children: ReactNode;
}

export function AccentProvider({ children }: ProviderProps) {
  const { profile } = useUserProfile();
  const palette = ACCENT_PALETTES[profile.accentColor] ?? ACCENT_PALETTES.mint;
  return (
    <AccentContext.Provider value={{ accentId: profile.accentColor, palette }}>
      {children}
    </AccentContext.Provider>
  );
}

export function useAccent() {
  const ctx = useContext(AccentContext);
  if (!ctx) {
    throw new Error('useAccent must be used within AccentProvider');
  }
  return ctx;
}
