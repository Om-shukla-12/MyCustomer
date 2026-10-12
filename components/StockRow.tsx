import { Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import type { StockListItem } from '@/lib/salesQueries';

type Props = {
  item: StockListItem;
  onPress: () => void;
};

export function StockRow({ item, onPress }: Props) {
  const c = Colors[useColorScheme()];
  const sold = item.status === 'Sold';

  return (
    <Pressable onPress={onPress} style={[styles.row, { borderBottomColor: c.border }]}>
      <View style={styles.textCol}>
        <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
          {item.itemName}
        </Text>
        <Text style={[styles.subtitle, { color: c.textMuted }]} numberOfLines={1}>
          {item.modelNumber} · {item.serialNumber}
        </Text>
        <Text style={[styles.meta, { color: c.textSecondary }]} numberOfLines={1}>
          Dealer ₹{item.dealerPrice} · Billed {item.billingDate}
        </Text>
      </View>
      <View style={[styles.badge, { backgroundColor: sold ? c.dangerBg : c.whatsappBg, borderColor: sold ? c.danger : c.whatsapp }]}>
        <Text style={{ color: sold ? c.danger : c.whatsapp, fontSize: 12, fontWeight: '700' }}>{item.status}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  textCol: { flex: 1, gap: 4 },
  name: { fontSize: 17, fontWeight: '600' },
  subtitle: { fontSize: 13 },
  meta: { fontSize: 13 },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
});
