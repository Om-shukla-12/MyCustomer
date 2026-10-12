import { Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useBusinessName } from '@/contexts/BusinessNameContext';

export function AppHeaderTitle({ children }: { children?: string }) {
  const c = Colors[useColorScheme()];
  const { businessName } = useBusinessName();

  return (
    <View>
      {businessName ? (
        <Text style={{ fontSize: 11, fontWeight: '500', color: c.textMuted }} numberOfLines={1}>
          {businessName}
        </Text>
      ) : null}
      <Text style={{ fontSize: 17, fontWeight: '600', color: c.text }} numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
}
