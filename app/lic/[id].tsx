import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { CallButton } from '@/components/CallButton';
import { useLanguage } from '@/contexts/LanguageContext';
import { getAreaDisplayName } from '@/lib/areaDisplay';
import { formatPhoneDisplay } from '@/lib/phone';
import { shareLicCustomer } from '@/lib/licShare';
import { licModeTranslationKey, paymentMethodTranslationKey } from '@/lib/translations';
import {
  deleteLicLedgerEntry,
  getLicBalance,
  getLicCustomerById,
  getLicLedgerEntries,
  restoreLicCustomer,
  softDeleteLicCustomer,
  type LicCustomerDetail,
  type LicLedgerEntry,
} from '@/lib/licQueries';

export default function LicCustomerDetailScreen() {
  const c = Colors[useColorScheme()];
  const { t, lang } = useLanguage();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const customerId = Number(id);
  const [item, setItem] = useState<LicCustomerDetail | null>(null);
  const [balance, setBalance] = useState(0);
  const [ledgerEntries, setLedgerEntries] = useState<LicLedgerEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (Number.isNaN(customerId)) return;
      getLicCustomerById(customerId).then(setItem);
      getLicBalance(customerId).then(setBalance);
      getLicLedgerEntries(customerId).then(setLedgerEntries);
    }, [customerId])
  );

  const handleDeleteEntry = (entryId: number) => {
    Alert.alert(t('deleteLedgerEntryConfirmTitle'), t('deleteLedgerEntryConfirmMessage'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteLicLedgerEntry(entryId);
          getLicBalance(customerId).then(setBalance);
          getLicLedgerEntries(customerId).then(setLedgerEntries);
        },
      },
    ]);
  };

  const handleDelete = () => {
    if (!item) return;
    Alert.alert(t('deleteLicConfirmTitle'), t('deleteLicConfirmMessage', { name: item.assuredName }), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          await softDeleteLicCustomer(customerId);
          router.back();
          setTimeout(() => {
            Alert.alert(t('licCustomerDeleted'), undefined, [
              { text: t('undo'), onPress: () => restoreLicCustomer(customerId) },
              { text: t('ok'), style: 'cancel' },
            ]);
          }, 300);
        },
      },
    ]);
  };

  if (!item) {
    return <View style={[styles.container, { backgroundColor: c.background }]} />;
  }

  const areaLabel = item.areaName ? getAreaDisplayName({ name: item.areaName, nameGu: item.areaNameGu }, lang) : null;
  const modeKey = item.mode ? licModeTranslationKey(item.mode) : null;
  const modeLabel = item.mode ? (modeKey ? t(modeKey) : item.mode) : null;
  const totalPremium =
    item.installmentPremium != null && item.installmentsDue != null
      ? item.installmentPremium * item.installmentsDue
      : null;

  const handleShare = () => {
    shareLicCustomer(item, areaLabel, modeLabel, totalPremium, t);
  };

  const balanceColor =
    balance > 10000 ? c.danger : balance > 5000 ? c.warning : balance < 0 ? c.whatsapp : c.text;

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]}>
      <Stack.Screen
        options={{
          title: item.assuredName,
          headerRight: () => (
            <View style={styles.headerActions}>
              <Pressable accessibilityRole="button" accessibilityLabel={t('shareLicA11y')} onPress={handleShare}>
                <Ionicons name="share-outline" size={22} color={c.text} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('editLicTitle')}
                onPress={() => router.push({ pathname: '/lic/form', params: { id: String(customerId) } })}
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
        <View style={[styles.icon, { backgroundColor: c.accentBg }]}>
          <Ionicons name="shield-checkmark-outline" size={26} color={c.accent} />
        </View>
        <Text style={[styles.name, { color: c.text }]}>{item.assuredName}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="document-text-outline" size={14} color={c.textSecondary} />
          <Text style={[styles.meta, { color: c.textSecondary }]}>{item.policyNo}</Text>
        </View>
        {areaLabel ? (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color={c.textSecondary} />
            <Text style={[styles.meta, { color: c.textSecondary }]}>{areaLabel}</Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.section, { borderTopColor: c.border }]}>
        <View style={styles.primaryRow}>
          <View>
            <Text style={[styles.label, { color: c.textMuted }]}>{t('balanceLabel')}</Text>
            <Text style={[styles.balanceValue, { color: balanceColor }]}>
              {balance === 0 ? t('settledLabel') : `₹${Math.abs(balance)}`}
            </Text>
            {balance !== 0 ? (
              <Text style={[styles.meta, { color: c.textSecondary }]}>
                {balance > 0 ? t('remainingToCollect') : t('creditToAdjust')}
              </Text>
            ) : null}
          </View>
          <Pressable
            onPress={() => router.push({ pathname: '/lic/payment', params: { id: String(customerId) } })}
            style={[styles.recordBtn, { backgroundColor: c.accentBg, borderColor: c.accent }]}
          >
            <Text style={{ color: c.accent, fontSize: 14, fontWeight: '600' }}>{t('recordPayment')}</Text>
          </Pressable>
        </View>
      </View>

      {item.phoneNumber ? (
        <View style={[styles.section, { borderTopColor: c.border }]}>
          <View style={styles.primaryRow}>
            <View>
              <Text style={[styles.label, { color: c.textMuted }]}>{t('primary')}</Text>
              <Text style={[styles.value, { color: c.text }]}>{formatPhoneDisplay(item.phoneNumber)}</Text>
            </View>
            <CallButton phoneNumber={item.phoneNumber} size="lg" accessibilityLabel={`${t('call')} ${item.assuredName}`} />
          </View>
        </View>
      ) : null}

      <View style={[styles.section, { borderTopColor: c.border }]}>
        <View style={styles.grid}>
          {item.dateOfCommencement ? (
            <View style={styles.gridItem}>
              <Text style={[styles.label, { color: c.textMuted }]}>{t('dateOfCommencement')}</Text>
              <Text style={[styles.value, { color: c.text }]}>{item.dateOfCommencement}</Text>
            </View>
          ) : null}
          {item.planTerm ? (
            <View style={styles.gridItem}>
              <Text style={[styles.label, { color: c.textMuted }]}>{t('planTerm')}</Text>
              <Text style={[styles.value, { color: c.text }]}>{item.planTerm}</Text>
            </View>
          ) : null}
          {modeLabel ? (
            <View style={styles.gridItem}>
              <Text style={[styles.label, { color: c.textMuted }]}>{t('mode')}</Text>
              <Text style={[styles.value, { color: c.text }]}>{modeLabel}</Text>
            </View>
          ) : null}
          {item.fupDate ? (
            <View style={styles.gridItem}>
              <Text style={[styles.label, { color: c.textMuted }]}>{t('fupLabel')}</Text>
              <Text style={[styles.value, { color: c.text }]}>{item.fupDate}</Text>
            </View>
          ) : null}
          {item.flag ? (
            <View style={styles.gridItem}>
              <Text style={[styles.label, { color: c.textMuted }]}>{t('flag')}</Text>
              <Text style={[styles.value, { color: c.text }]}>{item.flag}</Text>
            </View>
          ) : null}
          {item.installmentPremium != null ? (
            <View style={styles.gridItem}>
              <Text style={[styles.label, { color: c.textMuted }]}>{t('installmentPremium')}</Text>
              <Text style={[styles.value, { color: c.text }]}>₹{item.installmentPremium}</Text>
            </View>
          ) : null}
          {item.installmentsDue != null ? (
            <View style={styles.gridItem}>
              <Text style={[styles.label, { color: c.textMuted }]}>{t('installmentsDue')}</Text>
              <Text style={[styles.value, { color: c.text }]}>{item.installmentsDue}</Text>
            </View>
          ) : null}
          {totalPremium != null ? (
            <View style={styles.gridItem}>
              <Text style={[styles.label, { color: c.textMuted }]}>{t('totalPremium')}</Text>
              <Text style={[styles.value, { color: c.text }]}>₹{totalPremium}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {item.notes ? (
        <View style={[styles.section, { borderTopColor: c.border }]}>
          <Text style={[styles.label, { color: c.textMuted }]}>{t('notes')}</Text>
          <Text style={[styles.notes, { color: c.textSecondary }]}>{item.notes}</Text>
        </View>
      ) : null}

      <View style={[styles.section, { borderTopColor: c.border }]}>
        <Text style={[styles.label, { color: c.textMuted }]}>{t('transactionHistory')}</Text>
        {ledgerEntries.length === 0 ? (
          <Text style={[styles.notes, { color: c.textSecondary }]}>{t('noTransactionsYet')}</Text>
        ) : (
          ledgerEntries.map((entry) => {
            const methodKey = entry.paymentMethod ? paymentMethodTranslationKey(entry.paymentMethod) : null;
            const methodLabel = entry.paymentMethod ? (methodKey ? t(methodKey) : entry.paymentMethod) : null;
            const entryBalanceColor =
              entry.balanceAfter > 10000
                ? c.danger
                : entry.balanceAfter > 5000
                  ? c.warning
                  : entry.balanceAfter < 0
                    ? c.whatsapp
                    : c.textSecondary;
            return (
              <View key={entry.id} style={styles.ledgerRow}>
                <View style={styles.ledgerLeft}>
                  <Text style={[styles.value, { color: c.text }]}>
                    {entry.date} · ₹{entry.amountPaid}
                    {methodLabel ? ` · ${methodLabel}` : ''}
                  </Text>
                  {entry.notes ? (
                    <Text style={[styles.meta, { color: c.textSecondary }]}>{entry.notes}</Text>
                  ) : null}
                  <Text style={[styles.meta, { color: entryBalanceColor }]}>
                    {entry.balanceAfter === 0
                      ? t('settledLabel')
                      : t('balanceAfterShort', { amount: String(Math.abs(entry.balanceAfter)) })}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('delete')}
                  onPress={() => handleDeleteEntry(entry.id)}
                  style={styles.ledgerDelete}
                >
                  <Ionicons name="trash-outline" size={18} color={c.danger} />
                </Pressable>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerActions: { flexDirection: 'row', gap: 16, marginRight: 4 },
  header: { alignItems: 'center', paddingVertical: 20, gap: 4 },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  name: { fontSize: 18, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { fontSize: 13 },
  section: { paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth },
  primaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 12, marginBottom: 6 },
  value: { fontSize: 15, fontWeight: '500' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  gridItem: { minWidth: '40%' },
  notes: { fontSize: 14, lineHeight: 20 },
  balanceValue: { fontSize: 20, fontWeight: '700' },
  recordBtn: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 8,
  },
  ledgerLeft: { flex: 1, gap: 2 },
  ledgerDelete: { padding: 4 },
});
