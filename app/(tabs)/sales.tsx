import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Fab } from '@/components/Fab';
import { ProductRow } from '@/components/ProductRow';
import { SearchInput } from '@/components/SearchInput';
import { getFollowUpProducts, getProducts, type FollowUpBucket, type ProductListItem } from '@/lib/salesQueries';

type ViewMode = 'all' | FollowUpBucket;

const FILTERS: { key: ViewMode; label: string }[] = [
  { key: 'all', label: 'All sales' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'today', label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' },
];

export default function SalesScreen() {
  const c = Colors[useColorScheme()];
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<ViewMode>('all');
  const [items, setItems] = useState<ProductListItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (mode === 'all') {
        getProducts(query).then(setItems);
      } else {
        getFollowUpProducts(mode).then(setItems);
      }
    }, [mode, query])
  );

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <SearchInput value={query} onChangeText={setQuery} placeholder="Search product, customer, serial..." />
      <View style={styles.filterRow}>
        {FILTERS.map((filter) => {
          const selected = mode === filter.key;
          return (
            <Pressable
              key={filter.key}
              onPress={() => setMode(filter.key)}
              style={[
                styles.filterPill,
                { backgroundColor: selected ? c.accentBg : c.surface, borderColor: selected ? c.accent : c.border },
              ]}
            >
              <Text style={{ color: selected ? c.accent : c.textSecondary, fontSize: 13, fontWeight: '600' }}>
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ProductRow item={item} onPress={() => router.push({ pathname: '/product/[id]', params: { id: String(item.id) } } as unknown as Href)} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ color: c.textMuted, fontSize: 14, textAlign: 'center' }}>
              {mode === 'all' ? 'No product sales yet.' : 'No follow-ups in this group.'}
            </Text>
          </View>
        }
      />
      <Fab
        accessibilityLabel="Add product sale"
        actions={[
          { key: 'sale', label: 'Add product sale', icon: 'cube-outline', onPress: () => router.push('/product/form' as Href) },
          { key: 'stock', label: 'Add stock item', icon: 'archive-outline', onPress: () => router.push('/stock/form' as Href) },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  filterPill: { borderWidth: 1, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12 },
  empty: { padding: 32, alignItems: 'center' },
});
