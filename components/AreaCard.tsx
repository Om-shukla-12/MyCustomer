import { Pressable, StyleSheet, Text } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useLanguage } from '@/contexts/LanguageContext';
import { getAreaDisplayName } from '@/lib/areaDisplay';
import type { AreaWithCount } from '@/lib/queries';

type Props = {
  area: AreaWithCount;
  onPress: () => void;
};

export function AreaCard({ area, onPress }: Props) {
  const c = Colors[useColorScheme()];
  const { t, lang } = useLanguage();
  return (
    <Pressable onPress={onPress} style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Text style={[styles.name, { color: c.text }]} numberOfLines={2}>
        {getAreaDisplayName(area, lang)}
      </Text>
      <Text style={[styles.count, { color: c.textMuted }]}>
        {area.count} {area.count === 1 ? t('customerCountOne') : t('customerCountMany')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    minHeight: 84,
    justifyContent: 'center',
  },
  name: { fontSize: 15, fontWeight: '600' },
  count: { fontSize: 12, marginTop: 4 },
});
