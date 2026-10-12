import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { getStockItemById, softDeleteStockItem, type StockListItem } from '@/lib/salesQueries';

export default function StockDetailScreen() {
  const c = Colors[useColorScheme()];
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const stockId = Number(id);
  const [item, setItem] = useState<StockListItem | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!Number.isNaN(stockId)) getStockItemById(stockId).then(setItem);
    }, [stockId])
  );

  const handleDelete = () => {
    if (!item) return;
    Alert.alert('Delete stock item?', `${item.itemName} will be removed from inventory.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await softDeleteStockItem(stockId); router.back(); } },
    ]);
  };

  if (!item) return <View style={[styles.container, { backgroundColor: c.background }]} />;

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]}>
      <Stack.Screen
        options={{
          title: item.itemName,
          headerRight: () => (
            <View style={styles.headerActions}>
              <Pressable onPress={() => router.push({ pathname: '/stock/form', params: { id: String(stockId) } } as unknown as Href)}>
                <Ionicons name="create-outline" size={22} color={c.text} />
              </Pressable>
              <Pressable onPress={handleDelete}>
                <Ionicons name="trash-outline" size={22} color={c.danger} />
              </Pressable>
            </View>
          ),
        }}
      />
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: c.accentBg }]}>
          <Ionicons name="archive-outline" size={28} color={c.accent} />
        </View>
        <Text style={[styles.name, { color: c.text }]}>{item.itemName}</Text>
        <Text style={[styles.meta, { color: c.textSecondary }]}>{item.modelNumber} · {item.serialNumber}</Text>
      </View>
      <View style={[styles.section, { borderTopColor: c.border }]}>
        <Info label="Status" value={item.status} />
        <Info label="Dealer price" value={`₹${item.dealerPrice}`} />
        <Info label="Billing date" value={item.billingDate} />
      </View>
      {item.soldProductId ? (
        <View style={[styles.section, { borderTopColor: c.border }]}>
          <Pressable onPress={() => router.push({ pathname: '/product/[id]', params: { id: String(item.soldProductId) } } as unknown as Href)}>
            <Text style={{ color: c.accent, fontSize: 15, fontWeight: '600' }}>View linked sale</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  const c = Colors[useColorScheme()];
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.label, { color: c.textMuted }]}>{label}</Text>
      <Text style={[styles.value, { color: c.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerActions: { flexDirection: 'row', gap: 16, marginRight: 4 },
  header: { alignItems: 'center', paddingVertical: 20, gap: 5 },
  icon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 18, fontWeight: '700' },
  meta: { fontSize: 13 },
  section: { paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, gap: 12 },
  infoRow: { gap: 4 },
  label: { fontSize: 12 },
  value: { fontSize: 16, fontWeight: '500' },
});
