import { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { LicCustomerRow } from '@/components/LicCustomerRow';
import { SearchInput } from '@/components/SearchInput';
import { Fab } from '@/components/Fab';
import { useLanguage } from '@/contexts/LanguageContext';
import { licCustomersToCsv } from '@/lib/licCsv';
import { getAllLicCustomersForExport, getLicCustomers, type LicCustomerListItem } from '@/lib/licQueries';

export default function LicScreen() {
  const c = Colors[useColorScheme()];
  const { t } = useLanguage();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<LicCustomerListItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      getLicCustomers(query).then(setItems);
    }, [query])
  );

  const handleExport = async () => {
    const all = await getAllLicCustomersForExport();
    if (all.length === 0) {
      Alert.alert(t('exportToCsv'), t('noLicToExport'));
      return;
    }
    try {
      const csv = licCustomersToCsv(all);
      const dateStr = new Date().toISOString().slice(0, 10);
      const file = new File(Paths.cache, `lic_backup_${dateStr}.csv`);
      if (file.exists) file.delete();
      file.create();
      file.write(csv);
      await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: t('exportToCsv') });
    } catch {
      Alert.alert(t('exportToCsv'), t('exportFailed'));
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <SearchInput value={query} onChangeText={setQuery} placeholder={t('searchLicPlaceholder')} />
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <LicCustomerRow
            item={item}
            onPress={() => router.push({ pathname: '/lic/[id]', params: { id: String(item.id) } })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ color: c.textMuted, fontSize: 14, textAlign: 'center' }}>
              {query ? t('noLicFound') : t('noLicYet')}
            </Text>
          </View>
        }
      />
      <Fab
        accessibilityLabel={t('addLicTitle')}
        actions={[
          { key: 'add', label: t('addLicTitle'), icon: 'person-add-outline', onPress: () => router.push('/lic/form') },
          { key: 'export', label: t('exportToCsv'), icon: 'download-outline', onPress: handleExport },
          { key: 'import', label: t('importFromCsv'), icon: 'cloud-upload-outline', onPress: () => router.push('/import-lic') },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { padding: 32, alignItems: 'center' },
});
