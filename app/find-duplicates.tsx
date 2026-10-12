import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useLanguage } from '@/contexts/LanguageContext';
import { findDuplicateBusinessContacts, findDuplicateCustomers, type DuplicateGroup } from '@/lib/duplicates';
import { formatDateDisplay } from '@/lib/date';
import { formatPhoneDisplay } from '@/lib/phone';
import { restoreCustomer, softDeleteCustomer } from '@/lib/queries';
import { restoreBusinessContact, softDeleteBusinessContact } from '@/lib/businessQueries';

function GroupCard({
  group,
  onPressItem,
  onDelete,
}: {
  group: DuplicateGroup;
  onPressItem: (id: number) => void;
  onDelete: (id: number, name: string) => void;
}) {
  const c = Colors[useColorScheme()];
  const { t, lang } = useLanguage();

  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Text style={[styles.groupHeader, { color: c.textMuted }]}>
        {formatPhoneDisplay(group.phoneNumber)} · {t('duplicateGroupCount', { count: String(group.items.length) })}
      </Text>
      {group.items.map((item, i) => (
        <View
          key={item.id}
          style={[styles.itemRow, { borderTopColor: c.border }]}
        >
          <Pressable onPress={() => onPressItem(item.id)} style={styles.itemText}>
            <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.subtitle, { color: c.textMuted }]} numberOfLines={1}>
              {item.subtitle} · {formatDateDisplay(new Date(item.createdAt), lang === 'gu' ? 'gu-IN' : 'en-IN')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onDelete(item.id, item.name)}
            accessibilityRole="button"
            accessibilityLabel={t('delete')}
            style={styles.deleteBtn}
          >
            <Ionicons name="trash-outline" size={18} color={c.danger} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

export default function FindDuplicatesScreen() {
  const c = Colors[useColorScheme()];
  const { t } = useLanguage();
  const router = useRouter();
  const [customerGroups, setCustomerGroups] = useState<DuplicateGroup[]>([]);
  const [businessGroups, setBusinessGroups] = useState<DuplicateGroup[]>([]);

  const refetch = useCallback(() => {
    findDuplicateCustomers().then(setCustomerGroups);
    findDuplicateBusinessContacts().then(setBusinessGroups);
  }, []);

  useFocusEffect(refetch);

  const handleDeleteCustomer = (id: number, name: string) => {
    Alert.alert(t('deleteConfirmTitle'), t('deleteConfirmMessage', { name }), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          await softDeleteCustomer(id);
          refetch();
          setTimeout(() => {
            Alert.alert(t('customerDeleted'), undefined, [
              { text: t('undo'), onPress: () => { restoreCustomer(id).then(refetch); } },
              { text: t('ok'), style: 'cancel' },
            ]);
          }, 300);
        },
      },
    ]);
  };

  const handleDeleteBusiness = (id: number, name: string) => {
    Alert.alert(t('deleteBusinessContactConfirmTitle'), t('deleteBusinessContactConfirmMessage', { name }), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          await softDeleteBusinessContact(id);
          refetch();
          setTimeout(() => {
            Alert.alert(t('businessContactDeleted'), undefined, [
              { text: t('undo'), onPress: () => { restoreBusinessContact(id).then(refetch); } },
              { text: t('ok'), style: 'cancel' },
            ]);
          }, 300);
        },
      },
    ]);
  };

  const totalGroups = customerGroups.length + businessGroups.length;

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: t('findDuplicates') }} />

      {totalGroups === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="checkmark-circle-outline" size={36} color={c.accent} />
          <Text style={[styles.emptyText, { color: c.textSecondary }]}>{t('noDuplicatesFound')}</Text>
        </View>
      ) : (
        <>
          {customerGroups.length > 0 ? (
            <>
              <Text style={[styles.sectionLabel, { color: c.textMuted }]}>{t('duplicateCustomers')}</Text>
              {customerGroups.map((group) => (
                <GroupCard
                  key={group.phoneNumber}
                  group={group}
                  onPressItem={(id) => router.push({ pathname: '/customer/[id]', params: { id: String(id) } })}
                  onDelete={handleDeleteCustomer}
                />
              ))}
            </>
          ) : null}

          {businessGroups.length > 0 ? (
            <>
              <Text style={[styles.sectionLabel, { color: c.textMuted }]}>{t('duplicateBusinessContacts')}</Text>
              {businessGroups.map((group) => (
                <GroupCard
                  key={group.phoneNumber}
                  group={group}
                  onPressItem={(id) => router.push({ pathname: '/business/[id]', params: { id: String(id) } })}
                  onDelete={handleDeleteBusiness}
                />
              ))}
            </>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  sectionLabel: { fontSize: 12, marginBottom: 8, marginTop: 8, textTransform: 'uppercase' },
  empty: { alignItems: 'center', gap: 10, paddingTop: 64 },
  emptyText: { fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
  card: { borderWidth: 1, borderRadius: 10, overflow: 'hidden', marginBottom: 16 },
  groupHeader: { fontSize: 12, fontWeight: '600', padding: 12, textTransform: 'uppercase' },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  itemText: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600' },
  subtitle: { fontSize: 12, marginTop: 2 },
  deleteBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
});
