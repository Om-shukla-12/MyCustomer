import { useCallback, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { BusinessContactRow } from '@/components/BusinessContactRow';
import { SearchInput } from '@/components/SearchInput';
import { Fab } from '@/components/Fab';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getBusinessCategories,
  getBusinessContacts,
  type BusinessCategory,
  type BusinessContactListItem,
} from '@/lib/businessQueries';

function CategoryChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const c = Colors[useColorScheme()];
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: selected ? c.accentBg : c.surface, borderColor: selected ? c.accent : c.border },
      ]}
    >
      <Text style={{ color: selected ? c.accent : c.textSecondary, fontSize: 13, fontWeight: '500' }}>{label}</Text>
    </Pressable>
  );
}

export default function BusinessScreen() {
  const c = Colors[useColorScheme()];
  const { t } = useLanguage();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<BusinessCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [contacts, setContacts] = useState<BusinessContactListItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      getBusinessCategories().then(setCategories);
      getBusinessContacts(query, selectedCategoryId ?? undefined).then(setContacts);
    }, [query, selectedCategoryId])
  );

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <SearchInput value={query} onChangeText={setQuery} placeholder={t('searchBusinessPlaceholder')} />
      {categories.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipRow}
        >
          <CategoryChip label={t('allCategories')} selected={selectedCategoryId === null} onPress={() => setSelectedCategoryId(null)} />
          {categories.map((cat) => (
            <CategoryChip
              key={cat.id}
              label={cat.name}
              selected={selectedCategoryId === cat.id}
              onPress={() => setSelectedCategoryId(cat.id)}
            />
          ))}
        </ScrollView>
      ) : null}
      <FlatList
        data={contacts}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <BusinessContactRow
            contact={item}
            onPress={() => router.push({ pathname: '/business/[id]', params: { id: String(item.id) } })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ color: c.textMuted, fontSize: 14, textAlign: 'center' }}>
              {t(!query && selectedCategoryId === null ? 'noBusinessContactsYet' : 'noBusinessContactsFound')}
            </Text>
          </View>
        }
      />
      <Fab href="/business/form" accessibilityLabel={t('addBusinessContactTitle')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { padding: 32, alignItems: 'center' },
  chipScroll: { maxHeight: 44, flexGrow: 0 },
  chipRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
});
