import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useLanguage } from '@/contexts/LanguageContext';
import { getAreaDisplayName } from '@/lib/areaDisplay';
import type { AreaWithCount } from '@/lib/queries';

type Props = {
  area: AreaWithCount;
  onPress: () => void;
};

export function AreaRow({ area, onPress }: Props) {
  const c = Colors[useColorScheme()];
  const { t, lang } = useLanguage();
  return (
    <Pressable onPress={onPress} style={[styles.row, { borderBottomColor: c.border }]}>
      <View>
        <Text style={[styles.name, { color: c.text }]}>{getAreaDisplayName(area, lang)}</Text>
        <Text style={[styles.count, { color: c.textMuted }]}>
          {area.count} {area.count === 1 ? t('customerCountOne') : t('customerCountMany')}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  name: { fontSize: 15, fontWeight: '600' },
  count: { fontSize: 12, marginTop: 2 },
});
