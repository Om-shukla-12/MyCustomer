import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Pressable } from 'react-native';

import { AppHeaderTitle } from '@/components/AppHeaderTitle';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AreasStackLayout() {
  const c = Colors[useColorScheme()];
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <Stack screenOptions={{ headerTitle: (props) => <AppHeaderTitle {...props} /> }}>
      <Stack.Screen
        name="index"
        options={{
          title: t('tabAreas'),
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/settings')}
              accessibilityRole="button"
              accessibilityLabel={t('settingsA11y')}
            >
              <Ionicons name="settings-outline" size={22} color={c.text} />
            </Pressable>
          ),
        }}
      />
      <Stack.Screen name="[name]" />
    </Stack>
  );
}
