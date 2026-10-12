import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { CallButton } from '@/components/CallButton';
import { ProductRow } from '@/components/ProductRow';
import { useLanguage } from '@/contexts/LanguageContext';
import { getAreaDisplayName } from '@/lib/areaDisplay';
import { todayDateKey } from '@/lib/date';
import { formatPhoneDisplay } from '@/lib/phone';
import { getCustomerById, restoreCustomer, softDeleteCustomer, type CustomerDetail } from '@/lib/queries';
import { getProductsByCustomerId, type ProductListItem } from '@/lib/salesQueries';
import { tagTranslationKey } from '@/lib/translations';
import { getTodayVisitCustomerIds, toggleTodayVisit } from '@/lib/todayVisits';

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function CustomerDetailScreen() {
  const c = Colors[useColorScheme()];
  const { t, lang } = useLanguage();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const customerId = Number(id);
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [addedToToday, setAddedToToday] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!Number.isNaN(customerId)) {
        getCustomerById(customerId).then(setCustomer);
        getProductsByCustomerId(customerId).then(setProducts);
        getTodayVisitCustomerIds(todayDateKey()).then((ids) => setAddedToToday(ids.has(customerId)));
      }
    }, [customerId])
  );

  const handleToggleToday = async () => {
    await toggleTodayVisit(customerId, todayDateKey());
    setAddedToToday((v) => !v);
  };

  const handleDelete = () => {
    if (!customer) return;
    Alert.alert(t('deleteConfirmTitle'), t('deleteConfirmMessage', { name: customer.name }), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          await softDeleteCustomer(customerId);
          router.back();
          setTimeout(() => {
            Alert.alert(t('customerDeleted'), undefined, [
              { text: t('undo'), onPress: () => restoreCustomer(customerId) },
              { text: t('ok'), style: 'cancel' },
            ]);
          }, 300);
        },
      },
    ]);
  };

  if (!customer) {
    return <View style={[styles.container, { backgroundColor: c.background }]} />;
  }

  const tagLabel = (tagName: string) => {
    const key = tagTranslationKey(tagName);
    return key ? t(key) : tagName;
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]}>
      <Stack.Screen
        options={{
          title: customer.name,
          headerRight: () => (
            <View style={styles.headerActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(addedToToday ? 'removeFromToday' : 'addToToday')}
                onPress={handleToggleToday}
              >
                <Ionicons
                  name={addedToToday ? 'calendar' : 'calendar-outline'}
                  size={22}
                  color={addedToToday ? c.accent : c.text}
                />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add product"
                onPress={() => router.push({ pathname: '/product/form', params: { customerId: String(customerId) } } as unknown as Href)}
              >
                <Ionicons name="cube-outline" size={22} color={c.text} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('editCustomerTitle')}
                onPress={() =>
                  router.push({ pathname: '/customer/form', params: { id: String(customerId) } })
                }
              >
                <Ionicons name="create-outline" size={22} color={c.text} />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={t('delete')} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={22} color={c.danger} />
              </Pressable>
            </View>
          ),
        }}
      />

      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: c.accentBg }]}>
          <Text style={[styles.avatarText, { color: c.accent }]}>{getInitials(customer.name)}</Text>
        </View>
        <Text style={[styles.name, { color: c.text }]}>{customer.name}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={14} color={c.textSecondary} />
          <Text style={[styles.meta, { color: c.textSecondary }]}>
            {getAreaDisplayName({ name: customer.areaName, nameGu: customer.areaNameGu }, lang)}
          </Text>
        </View>
        {customer.customerSince ? (
          <Text style={[styles.since, { color: c.textMuted }]}>
            {t('customerSincePrefix')} {customer.customerSince}
          </Text>
        ) : null}
      </View>

      <View style={[styles.section, { borderTopColor: c.border }]}>
        <View style={styles.primaryRow}>
          <View>
            <Text style={[styles.label, { color: c.textMuted }]}>{t('primary')}</Text>
            <Text style={[styles.value, { color: c.text }]}>{formatPhoneDisplay(customer.primaryMobile)}</Text>
          </View>
          <CallButton
            phoneNumber={customer.primaryMobile}
            size="lg"
            accessibilityLabel={`${t('call')} ${customer.name}`}
          />
        </View>
      </View>

      {customer.additionalContacts.length > 0 ? (
        <View style={[styles.section, { borderTopColor: c.border }]}>
          <Text style={[styles.label, { color: c.textMuted }]}>{t('otherNumbers')}</Text>
          {customer.additionalContacts.map((contact) => (
            <View key={contact.id} style={styles.extraRow}>
              <View style={styles.extraLeft}>
                <View style={[styles.tag, { backgroundColor: c.surface, borderColor: c.border }]}>
                  <Text style={{ color: c.textSecondary, fontSize: 12, fontWeight: '500' }}>
                    {contact.tagName === 'Other' && contact.customLabel
                      ? contact.customLabel
                      : tagLabel(contact.tagName)}
                  </Text>
                </View>
                <Text style={[styles.value, { color: c.text }]}>{formatPhoneDisplay(contact.phoneNumber)}</Text>
              </View>
              <CallButton
                phoneNumber={contact.phoneNumber}
                accessibilityLabel={`${t('call')} ${tagLabel(contact.tagName)}`}
              />
            </View>
          ))}
        </View>
      ) : null}

      {customer.address ? (
        <View style={[styles.section, { borderTopColor: c.border }]}>
          <Text style={[styles.label, { color: c.textMuted }]}>{t('address')}</Text>
          <Text style={[styles.notes, { color: c.textSecondary }]}>{customer.address}</Text>
        </View>
      ) : null}

      {customer.notes ? (
        <View style={[styles.section, { borderTopColor: c.border }]}>
          <Text style={[styles.label, { color: c.textMuted }]}>{t('notes')}</Text>
          <Text style={[styles.notes, { color: c.textSecondary }]}>{customer.notes}</Text>
        </View>
      ) : null}

      <View style={[styles.section, { borderTopColor: c.border }]}>
        <View style={styles.productHeader}>
          <Text style={[styles.label, { color: c.textMuted }]}>Sold products</Text>
          <Pressable
            onPress={() => router.push({ pathname: '/product/form', params: { customerId: String(customerId) } } as unknown as Href)}
            style={[styles.addProductBtn, { borderColor: c.accent, backgroundColor: c.accentBg }]}
          >
            <Ionicons name="add" size={16} color={c.accent} />
            <Text style={{ color: c.accent, fontSize: 13, fontWeight: '700' }}>Add product</Text>
          </Pressable>
        </View>
        {products.length === 0 ? (
          <Text style={[styles.notes, { color: c.textSecondary }]}>No products sold to this customer yet.</Text>
        ) : (
          <View style={[styles.productList, { borderColor: c.border }]}>
            {products.map((product) => (
              <ProductRow
                key={product.id}
                item={product}
                onPress={() => router.push({ pathname: '/product/[id]', params: { id: String(product.id) } } as unknown as Href)}
              />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerActions: { flexDirection: 'row', gap: 16, marginRight: 4 },
  header: { alignItems: 'center', paddingVertical: 20, gap: 4 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarText: { fontSize: 18, fontWeight: '600' },
  name: { fontSize: 18, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { fontSize: 13 },
  since: { fontSize: 12 },
  section: { paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth },
  primaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 12, marginBottom: 6 },
  value: { fontSize: 15, fontWeight: '500' },
  extraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  extraLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tag: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1 },
  notes: { fontSize: 14, lineHeight: 20 },
  productHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  addProductBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7 },
  productList: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, overflow: 'hidden' },
});
