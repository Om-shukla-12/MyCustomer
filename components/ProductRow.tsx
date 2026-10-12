import { Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import type { ProductListItem } from '@/lib/salesQueries';

type Props = {
  item: ProductListItem;
  onPress: () => void;
};

export function ProductRow({ item, onPress }: Props) {
  const c = Colors[useColorScheme()];
  const remaining = Math.max(item.salePrice - item.paid, 0);
  const dueColor = remaining > 0 ? c.warning : c.whatsapp;

  return (
    <Pressable onPress={onPress} style={[styles.row, { borderBottomColor: c.border }]}>
      <View style={styles.textCol}>
        <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
          {item.productName}
        </Text>
        <Text style={[styles.subtitle, { color: c.textMuted }]} numberOfLines={1}>
          {item.customerName} · {item.modelNumber} · {item.serialNumber}
        </Text>
        <Text style={[styles.meta, { color: dueColor }]} numberOfLines={1}>
          Paid ₹{item.paid} / ₹{item.salePrice}
          {remaining > 0 ? ` · Remaining ₹${remaining}` : ' · Settled'}
        </Text>
      </View>
      {item.nextFollowUpDate && remaining > 0 ? (
        <View style={[styles.badge, { backgroundColor: c.accentBg, borderColor: c.accent }]}>
          <Text style={{ color: c.accent, fontSize: 12, fontWeight: '600' }}>{item.nextFollowUpDate}</Text>
        </View>
      ) : null}
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
  meta: { fontSize: 13, fontWeight: '600' },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
});
