import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { Palette, darkPalette, lightPalette } from '@/constants/theme';
import { useSettings } from '@/hooks/useSettings';

interface ThemeContextValue {
  palette: Palette;
  scheme: 'light' | 'dark';
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const { settings } = useSettings();

  const value = useMemo<ThemeContextValue>(() => {
    const preference = settings.theme;
    const scheme: 'light' | 'dark' =
      preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;
    return {
      scheme,
      isDark: scheme === 'dark',
      palette: scheme === 'dark' ? darkPalette : lightPalette,
    };
  }, [settings.theme, systemScheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside a ThemeProvider');
  return context;
}

/** Shorthand for the common case. */
export function usePalette(): Palette {
  return useTheme().palette;
}
