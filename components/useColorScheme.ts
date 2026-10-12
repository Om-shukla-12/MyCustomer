import { useColorScheme as useSystemColorScheme } from 'react-native';

import { useOptionalThemeMode } from '@/contexts/ThemeContext';

export const useColorScheme = () => {
  const systemScheme = useSystemColorScheme();
  return useOptionalThemeMode()?.scheme ?? (systemScheme === 'dark' ? 'dark' : 'light');
};
