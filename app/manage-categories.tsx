import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  deleteBusinessCategory,
  getBusinessCategoriesWithCounts,
  type BusinessCategoryWithCount,
} from '@/lib/businessQueries';

export default function ManageCategoriesScreen() {
  const c = Colors[useColorScheme()];
  const { t } = useLanguage();
  const [categories, setCategories] = useState<BusinessCategoryWithCount[]>([]);

  const refetch = useCallback(() => {
    getBusinessCategoriesWithCounts().then(setCategories);
  }, []);

  useFocusEffect(refetch);

  const handleDelete = (category: BusinessCategoryWithCount) => {
    if (category.count > 0) {
      Alert.alert(t('categoryInUseTitle'), t('categoryInUseMessage', { count: String(category.count) }));
      return;
    }
    Alert.alert(t('deleteCategoryConfirmTitle', { name: category.name }), t('deleteCategoryConfirmMessage'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteBusinessCategory(category.id);
            refetch();
          } catch {
            Alert.alert(t('category'), t('saveFailed'));
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <Stack.Screen options={{ title: t('manageCategories') }} />
      <FlatList
        data={categories}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={[styles.row, { borderBottomColor: c.border }]}>
            <View style={styles.rowText}>
              <Text style={[styles.name, { color: c.text }]}>{item.name}</Text>
              <Text style={[styles.count, { color: c.textMuted }]}>
                {item.count} {item.count === 1 ? t('customerCountOne') : t('customerCountMany')}
              </Text>
            </View>
            <Pressable
              onPress={() => handleDelete(item)}
              accessibilityRole="button"
              accessibilityLabel={t('delete')}
              style={styles.deleteBtn}
            >
              <Ionicons name="trash-outline" size={19} color={item.count > 0 ? c.textMuted : c.danger} />
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ color: c.textMuted, fontSize: 14, textAlign: 'center' }}>{t('noCategoriesYet')}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { padding: 32, alignItems: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flexShrink: 1 },
  name: { fontSize: 15, fontWeight: '600' },
  count: { fontSize: 12, marginTop: 2 },
  deleteBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
});
