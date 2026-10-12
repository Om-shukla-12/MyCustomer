import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { CustomerRow } from '@/components/CustomerRow';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSelection } from '@/hooks/useSelection';
import { getAreaDisplayName } from '@/lib/areaDisplay';
import { todayDateKey } from '@/lib/date';
import {
  bulkRestoreCustomers,
  bulkSoftDeleteCustomers,
  getAreaByName,
  getCustomersByArea,
  getCustomersByIds,
  type CustomerListItem,
} from '@/lib/queries';
import { shareCustomers } from '@/lib/share';
import { getTodayVisitCustomerIds, toggleTodayVisit } from '@/lib/todayVisits';

function decodeAreaName(raw: string | undefined): string {
  if (!raw) return '';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export default function AreaDetailScreen() {
  const c = Colors[useColorScheme()];
  const { t, lang } = useLanguage();
  const router = useRouter();
  const { name } = useLocalSearchParams<{ name: string }>();
  const areaName = decodeAreaName(name);
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [areaNameGu, setAreaNameGu] = useState<string | null>(null);
  const [todayIds, setTodayIds] = useState<Set<number>>(new Set());
  const selection = useSelection();

  const refetch = useCallback(() => {
    if (!areaName) return;
    getCustomersByArea(areaName).then(setCustomers);
    getAreaByName(areaName).then((area) => setAreaNameGu(area?.nameGu ?? null));
    getTodayVisitCustomerIds(todayDateKey()).then(setTodayIds);
  }, [areaName]);

  useFocusEffect(refetch);

  const handleToggleToday = async (customerId: number) => {
    await toggleTodayVisit(customerId, todayDateKey());
    getTodayVisitCustomerIds(todayDateKey()).then(setTodayIds);
  };

  const displayTitle = getAreaDisplayName({ name: areaName, nameGu: areaNameGu }, lang);

  const handleShare = async () => {
    const selected = await getCustomersByIds([...selection.selectedIds]);
    await shareCustomers(selected, t);
  };

  const handleDelete = () => {
    const ids = [...selection.selectedIds];
    Alert.alert(t('deleteSelectedConfirmTitle', { count: String(ids.length) }), t('deleteSelectedConfirmMessage'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          await bulkSoftDeleteCustomers(ids);
          selection.exit();
          refetch();
          setTimeout(() => {
            Alert.alert(t('customersDeleted', { count: String(ids.length) }), undefined, [
              {
                text: t('undo'),
                onPress: async () => {
                  await bulkRestoreCustomers(ids);
                  refetch();
                },
              },
              { text: t('ok'), style: 'cancel' },
            ]);
          }, 300);
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <Stack.Screen
        options={{
          title: selection.selectionMode ? t('selectedCount', { count: String(selection.count) }) : displayTitle,
          headerLeft: selection.selectionMode
            ? () => (
                <Pressable onPress={selection.exit} accessibilityRole="button" accessibilityLabel={t('cancel')}>
                  <Ionicons name="close" size={22} color={c.text} />
                </Pressable>
              )
            : undefined,
          headerRight: () =>
            selection.selectionMode ? (
              selection.count > 0 ? (
                <View style={styles.headerActions}>
                  <Pressable onPress={handleShare} accessibilityRole="button" accessibilityLabel={t('shareSelected')}>
                    <Ionicons name="share-outline" size={22} color={c.text} />
                  </Pressable>
                  <Pressable onPress={handleDelete} accessibilityRole="button" accessibilityLabel={t('deleteSelected')}>
                    <Ionicons name="trash-outline" size={22} color={c.danger} />
                  </Pressable>
                </View>
              ) : null
            ) : (
              <Pressable onPress={selection.enter} accessibilityRole="button">
                <Text style={{ color: c.accent, fontSize: 15 }}>{t('selectAction')}</Text>
              </Pressable>
            ),
        }}
      />
      <FlatList
        data={customers}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <CustomerRow
            customer={item}
            selectionMode={selection.selectionMode}
            selected={selection.selectedIds.has(item.id)}
            addedToToday={todayIds.has(item.id)}
            onToggleToday={() => handleToggleToday(item.id)}
            onPress={() =>
              selection.selectionMode
                ? selection.toggle(item.id)
                : router.push({ pathname: '/customer/[id]', params: { id: String(item.id) } })
            }
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ color: c.textMuted, fontSize: 14, textAlign: 'center' }}>{t('noCustomersInArea')}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { padding: 32, alignItems: 'center' },
  headerActions: { flexDirection: 'row', gap: 16, marginRight: 4 },
});
