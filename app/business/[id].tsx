import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { CallButton } from '@/components/CallButton';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getBusinessContactById,
  restoreBusinessContact,
  softDeleteBusinessContact,
  type BusinessContactDetail,
} from '@/lib/businessQueries';
import { shareBusinessContact } from '@/lib/businessShare';
import { formatPhoneDisplay } from '@/lib/phone';

export default function BusinessContactDetailScreen() {
  const c = Colors[useColorScheme()];
  const { t } = useLanguage();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const contactId = Number(id);
  const [contact, setContact] = useState<BusinessContactDetail | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!Number.isNaN(contactId)) getBusinessContactById(contactId).then(setContact);
    }, [contactId])
  );

  const handleShare = () => {
    if (contact) shareBusinessContact(contact, t);
  };

  const handleDelete = () => {
    if (!contact) return;
    Alert.alert(
      t('deleteBusinessContactConfirmTitle'),
      t('deleteBusinessContactConfirmMessage', { name: contact.name }),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            await softDeleteBusinessContact(contactId);
            router.back();
            setTimeout(() => {
              Alert.alert(t('businessContactDeleted'), undefined, [
                { text: t('undo'), onPress: () => restoreBusinessContact(contactId) },
                { text: t('ok'), style: 'cancel' },
              ]);
            }, 300);
          },
        },
      ]
    );
  };

  if (!contact) {
    return <View style={[styles.container, { backgroundColor: c.background }]} />;
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]}>
      <Stack.Screen
        options={{
          title: contact.name,
          headerRight: () => (
            <View style={styles.headerActions}>
              <Pressable accessibilityRole="button" accessibilityLabel={t('shareBusinessContactA11y')} onPress={handleShare}>
                <Ionicons name="share-outline" size={22} color={c.text} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('editBusinessContactTitle')}
                onPress={() => router.push({ pathname: '/business/form', params: { id: String(contactId) } })}
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
          <Ionicons name="business-outline" size={26} color={c.accent} />
        </View>
        <Text style={[styles.name, { color: c.text }]}>{contact.name}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="pricetag-outline" size={14} color={c.textSecondary} />
          <Text style={[styles.meta, { color: c.textSecondary }]}>{contact.categoryName}</Text>
        </View>
      </View>

      <View style={[styles.section, { borderTopColor: c.border }]}>
        <View style={styles.primaryRow}>
          <View>
            <Text style={[styles.label, { color: c.textMuted }]}>{t('primary')}</Text>
            <Text style={[styles.value, { color: c.text }]}>{formatPhoneDisplay(contact.primaryNumber)}</Text>
          </View>
          <CallButton phoneNumber={contact.primaryNumber} size="lg" accessibilityLabel={`${t('call')} ${contact.name}`} />
        </View>
      </View>

      {contact.numbers.length > 0 ? (
        <View style={[styles.section, { borderTopColor: c.border }]}>
          <Text style={[styles.label, { color: c.textMuted }]}>{t('otherNumbers')}</Text>
          {contact.numbers.map((n) => (
            <View key={n.id} style={styles.extraRow}>
              <View style={styles.extraLeft}>
                <View style={[styles.tag, { backgroundColor: c.surface, borderColor: c.border }]}>
                  <Text style={{ color: c.textSecondary, fontSize: 12, fontWeight: '500' }}>{n.label}</Text>
                </View>
                <Text style={[styles.value, { color: c.text }]}>{formatPhoneDisplay(n.phoneNumber)}</Text>
              </View>
              <CallButton phoneNumber={n.phoneNumber} accessibilityLabel={`${t('call')} ${n.label}`} />
            </View>
          ))}
        </View>
      ) : null}

      {contact.notes ? (
        <View style={[styles.section, { borderTopColor: c.border }]}>
          <Text style={[styles.label, { color: c.textMuted }]}>{t('notes')}</Text>
          <Text style={[styles.notes, { color: c.textSecondary }]}>{contact.notes}</Text>
        </View>
      ) : null}
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
  extraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  extraLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tag: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1 },
  notes: { fontSize: 14, lineHeight: 20 },
});
