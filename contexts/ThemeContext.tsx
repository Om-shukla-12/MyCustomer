import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import { getSetting, setSetting, type ThemeMode } from '@/lib/settings';

type ThemeContextValue = {
  scheme: ThemeMode;
  setScheme: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [scheme, setSchemeState] = useState<ThemeMode>(systemScheme === 'dark' ? 'dark' : 'light');

  useEffect(() => {
    getSetting('theme').then((value) => {
      if (value === 'light' || value === 'dark') setSchemeState(value);
    });
  }, []);

  const setScheme = (mode: ThemeMode) => {
    setSchemeState(mode);
    setSetting('theme', mode);
  };

  return <ThemeContext.Provider value={{ scheme, setScheme }}>{children}</ThemeContext.Provider>;
}

export function useThemeMode(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeMode must be used within ThemeProvider');
  return ctx;
}

export function useOptionalThemeMode(): ThemeContextValue | null {
  return useContext(ThemeContext);
}
