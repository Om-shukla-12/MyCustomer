import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { AreaCard } from '@/components/AreaCard';
import { AreaRow } from '@/components/AreaRow';
import { SearchInput } from '@/components/SearchInput';
import { Fab } from '@/components/Fab';
import { useLanguage } from '@/contexts/LanguageContext';
import { getAreasWithCounts, type AreaWithCount } from '@/lib/queries';
import { getSetting, setSetting } from '@/lib/settings';

const VIEW_MODE_KEY = 'areasViewMode';
type ViewMode = 'grid' | 'list';

export default function AreasScreen() {
  const c = Colors[useColorScheme()];
  const { t } = useLanguage();
  const router = useRouter();
  const [areas, setAreas] = useState<AreaWithCount[]>([]);
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  useFocusEffect(
    useCallback(() => {
      getAreasWithCounts().then(setAreas);
    }, [])
  );

  useEffect(() => {
    getSetting(VIEW_MODE_KEY).then((v) => {
      if (v === 'list' || v === 'grid') setViewMode(v);
    });
  }, []);

  const handleSetViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    setSetting(VIEW_MODE_KEY, mode);
  };

  const withCustomers = areas.filter((a) => a.count > 0);
  const q = query.trim().toLowerCase();
  const filtered = q
    ? withCustomers.filter((a) => a.name.toLowerCase().includes(q) || a.nameGu?.toLowerCase().includes(q))
    : withCustomers;

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <SearchInput value={query} onChangeText={setQuery} placeholder={t('searchAreasPlaceholder')} />

      <View style={styles.viewToggleRow}>
        <Pressable
          onPress={() => handleSetViewMode('grid')}
          accessibilityRole="radio"
          accessibilityState={{ checked: viewMode === 'grid' }}
          accessibilityLabel={t('gridView')}
          style={[
            styles.viewToggleBtn,
            { borderColor: c.border },
            viewMode === 'grid' && { backgroundColor: c.accentBg, borderColor: c.accent },
          ]}
        >
          <Ionicons name="grid-outline" size={16} color={viewMode === 'grid' ? c.accent : c.textSecondary} />
          <Text style={{ color: viewMode === 'grid' ? c.accent : c.textSecondary, fontSize: 13, fontWeight: '500' }}>
            {t('gridView')}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => handleSetViewMode('list')}
          accessibilityRole="radio"
          accessibilityState={{ checked: viewMode === 'list' }}
          accessibilityLabel={t('listView')}
          style={[
            styles.viewToggleBtn,
            { borderColor: c.border },
            viewMode === 'list' && { backgroundColor: c.accentBg, borderColor: c.accent },
          ]}
        >
          <Ionicons name="list-outline" size={16} color={viewMode === 'list' ? c.accent : c.textSecondary} />
          <Text style={{ color: viewMode === 'list' ? c.accent : c.textSecondary, fontSize: 13, fontWeight: '500' }}>
            {t('listView')}
          </Text>
        </Pressable>
      </View>

      <FlatList
        key={viewMode}
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        numColumns={viewMode === 'grid' ? 2 : 1}
        columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
        contentContainerStyle={viewMode === 'grid' ? styles.gridContent : undefined}
        renderItem={({ item }) =>
          viewMode === 'grid' ? (
            <AreaCard
              area={item}
              onPress={() => router.push({ pathname: '/areas/[name]', params: { name: item.name } })}
            />
          ) : (
            <AreaRow
              area={item}
              onPress={() => router.push({ pathname: '/areas/[name]', params: { name: item.name } })}
            />
          )
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ color: c.textMuted, fontSize: 14, textAlign: 'center' }}>{t('noAreasYet')}</Text>
          </View>
        }
      />
      <Fab />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { padding: 32, alignItems: 'center' },
  viewToggleRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  viewToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  gridContent: { paddingHorizontal: 12 },
  gridRow: { gap: 10, paddingHorizontal: 4, marginBottom: 10 },
});
