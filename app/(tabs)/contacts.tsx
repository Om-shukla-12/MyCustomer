import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { CustomerRow } from '@/components/CustomerRow';
import { SearchInput } from '@/components/SearchInput';
import { Fab } from '@/components/Fab';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSelection } from '@/hooks/useSelection';
import { formatDateDisplay, localDayRange, todayDateKey } from '@/lib/date';
import {
  bulkRestoreCustomers,
  bulkSoftDeleteCustomers,
  getCustomersByIds,
  searchCustomers,
  type CustomerListItem,
} from '@/lib/queries';
import { shareCustomers } from '@/lib/share';
import { getTodayVisitCustomerIds, toggleTodayVisit } from '@/lib/todayVisits';

export default function ContactsScreen() {
  const c = Colors[useColorScheme()];
  const { t, lang } = useLanguage();
  const router = useRouter();
  const navigation = useNavigation();
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [query, setQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<Date | null>(null);
  const [todayIds, setTodayIds] = useState<Set<number>>(new Set());
  const selection = useSelection();

  const refetch = useCallback(() => {
    searchCustomers(query, dateFilter ? localDayRange(dateFilter) : undefined).then(setCustomers);
    getTodayVisitCustomerIds(todayDateKey()).then(setTodayIds);
  }, [query, dateFilter]);

  useFocusEffect(refetch);

  const handleToggleToday = async (customerId: number) => {
    await toggleTodayVisit(customerId, todayDateKey());
    getTodayVisitCustomerIds(todayDateKey()).then(setTodayIds);
  };

  const openDatePicker = () => {
    DateTimePickerAndroid.open({
      value: dateFilter ?? new Date(),
      mode: 'date',
      onValueChange: (_event, selectedDate) => {
        if (selectedDate) setDateFilter(selectedDate);
      },
    });
  };

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

  useEffect(() => {
    navigation.setOptions({
      headerTitle: selection.selectionMode ? t('selectedCount', { count: String(selection.count) }) : t('tabContacts'),
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
    });
  }, [selection.selectionMode, selection.count, c, t]);

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <SearchInput value={query} onChangeText={setQuery} placeholder={t('searchContactsPlaceholder')} />
      <View style={styles.filterRow}>
        <Pressable
          onPress={openDatePicker}
          style={[
            styles.filterChip,
            { borderColor: dateFilter ? c.accent : c.border, backgroundColor: dateFilter ? c.accentBg : c.surface },
          ]}
        >
          <Ionicons name="calendar-outline" size={14} color={dateFilter ? c.accent : c.textSecondary} />
          <Text style={{ color: dateFilter ? c.accent : c.textSecondary, fontSize: 13 }}>
            {dateFilter ? formatDateDisplay(dateFilter, lang === 'gu' ? 'gu-IN' : 'en-IN') : t('filterByDateAdded')}
          </Text>
        </Pressable>
        {dateFilter ? (
          <Pressable
            onPress={() => setDateFilter(null)}
            accessibilityRole="button"
            accessibilityLabel={t('clearDateFilter')}
            style={styles.clearFilter}
          >
            <Ionicons name="close-circle" size={18} color={c.textMuted} />
          </Pressable>
        ) : null}
      </View>
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
            <Text style={{ color: c.textMuted, fontSize: 14, textAlign: 'center' }}>{t('noCustomersFound')}</Text>
          </View>
        }
      />
      {!selection.selectionMode ? <Fab /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { padding: 32, alignItems: 'center' },
  headerActions: { flexDirection: 'row', gap: 16, marginRight: 4 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 8 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  clearFilter: { padding: 2 },
});
