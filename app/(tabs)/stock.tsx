import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Fab } from '@/components/Fab';
import { SearchInput } from '@/components/SearchInput';
import { StockRow } from '@/components/StockRow';
import { getStockItems, type StockListItem } from '@/lib/salesQueries';

export default function StockScreen() {
  const c = Colors[useColorScheme()];
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<StockListItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      getStockItems(query).then(setItems);
    }, [query])
  );

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <SearchInput value={query} onChangeText={setQuery} placeholder="Search item, serial, model..." />
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <StockRow item={item} onPress={() => router.push({ pathname: '/stock/[id]', params: { id: String(item.id) } } as unknown as Href)} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ color: c.textMuted, fontSize: 14, textAlign: 'center' }}>No stock items yet.</Text>
          </View>
        }
      />
      <Fab href={'/stock/form' as Href} accessibilityLabel="Add stock item" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { padding: 32, alignItems: 'center' },
});
