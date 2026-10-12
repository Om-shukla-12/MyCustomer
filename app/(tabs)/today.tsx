import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { SearchInput } from '@/components/SearchInput';
import { TodayVisitRow } from '@/components/TodayVisitRow';
import { useLanguage } from '@/contexts/LanguageContext';
import { todayDateKey } from '@/lib/date';
import {
  getTodayVisits,
  removeTodayVisit,
  reorderTodayVisit,
  updateTodayVisitStatus,
  type TodayVisitItem,
} from '@/lib/todayVisits';

export default function TodayScreen() {
  const c = Colors[useColorScheme()];
  const { t } = useLanguage();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [visits, setVisits] = useState<TodayVisitItem[]>([]);

  const refetch = useCallback(() => {
    getTodayVisits(todayDateKey(), query).then(setVisits);
  }, [query]);

  useFocusEffect(refetch);

  const pendingCount = visits.filter((v) => v.status === 'pending').length;

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <SearchInput value={query} onChangeText={setQuery} placeholder={t('searchTodayPlaceholder')} />
      {visits.length > 0 ? (
        <Text style={[styles.summary, { color: c.textSecondary }]}>
          {t('pendingCountSummary', { count: String(pendingCount) })}
        </Text>
      ) : null}
      <FlatList
        data={visits}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item, index }) => (
          <TodayVisitRow
            item={item}
            onPress={() => router.push({ pathname: '/customer/[id]', params: { id: String(item.customerId) } })}
            onToggleStatus={async () => {
              await updateTodayVisitStatus(item.id, item.status === 'done' ? 'pending' : 'done');
              refetch();
            }}
            onRemove={async () => {
              await removeTodayVisit(item.id);
              refetch();
            }}
            onMoveUp={async () => {
              await reorderTodayVisit(todayDateKey(), item.id, 'up');
              refetch();
            }}
            onMoveDown={async () => {
              await reorderTodayVisit(todayDateKey(), item.id, 'down');
              refetch();
            }}
            canMoveUp={index > 0}
            canMoveDown={index < visits.length - 1}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ color: c.textMuted, fontSize: 14, textAlign: 'center' }}>
              {query ? t('noCustomersFound') : t('noVisitsToday')}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  summary: { fontSize: 13, paddingHorizontal: 16, paddingBottom: 8 },
  empty: { padding: 32, alignItems: 'center' },
});
